import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { homedir } from "os";
import { decrypt } from "@/lib/auth/crypto";
import {
  createWorkflowStep,
  nextStepIndex,
} from "@/lib/db/queries/workflows";
import type {
  WebSearchResult,
  SearchResult,
  SearchProvider,
} from "@/lib/agents/types";
import type { WorkflowType } from "@/lib/workflows/types";

const BRAVE_API_URL = "https://api.search.brave.com/res/v1/web/search";
const TAVILY_API_URL = "https://api.tavily.com/search";

// --- Key retrieval ---

function getConfigPath(): string {
  const dataDir =
    process.env.OPENVOLO_DATA_DIR?.replace("~", homedir()) ??
    join(homedir(), ".openvolo");
  return join(dataDir, "config.json");
}

function readConfigFile(): Record<string, unknown> {
  const configPath = getConfigPath();
  if (!existsSync(configPath)) return {};
  try {
    return JSON.parse(readFileSync(configPath, "utf-8"));
  } catch {
    return {};
  }
}

/**
 * Get the Brave Search API key from env var or encrypted config.
 */
export function getBraveApiKey(): string | null {
  if (process.env.BRAVE_SEARCH_API_KEY) {
    return process.env.BRAVE_SEARCH_API_KEY;
  }
  const config = readConfigFile();
  if (!config.braveSearchApiKey) return null;
  try {
    return decrypt(config.braveSearchApiKey as string);
  } catch {
    return null;
  }
}

/**
 * Get the Tavily Search API key from env var or encrypted config.
 */
export function getTavilyApiKey(): string | null {
  if (process.env.TAVILY_API_KEY) {
    return process.env.TAVILY_API_KEY;
  }
  const config = readConfigFile();
  if (!config.tavilyApiKey) return null;
  try {
    return decrypt(config.tavilyApiKey as string);
  } catch {
    return null;
  }
}

// --- Provider-specific search functions ---

async function searchBrave(
  query: string,
  apiKey: string,
  opts: { count: number }
): Promise<{ results: SearchResult[]; raw?: unknown }> {
  const params = new URLSearchParams({
    q: query,
    count: String(opts.count),
    text_decorations: "false",
  });

  const response = await fetch(`${BRAVE_API_URL}?${params}`, {
    headers: {
      Accept: "application/json",
      "Accept-Encoding": "gzip",
      "X-Subscription-Token": apiKey,
    },
  });

  if (!response.ok) {
    throw new Error(
      `Brave Search API error: ${response.status} ${response.statusText}`
    );
  }

  const data = await response.json();
  const webResults = data.web?.results ?? [];

  const results: SearchResult[] = webResults.map(
    (r: { title?: string; url?: string; description?: string }) => ({
      title: r.title ?? "",
      url: r.url ?? "",
      snippet: r.description ?? "",
    })
  );

  return { results };
}

async function searchTavily(
  query: string,
  apiKey: string,
  opts: { count: number; searchDepth?: "basic" | "advanced"; includeAnswer?: boolean }
): Promise<{ results: SearchResult[]; answer?: string }> {
  const response = await fetch(TAVILY_API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_key: apiKey,
      query,
      search_depth: opts.searchDepth ?? "basic",
      max_results: opts.count,
      include_answer: opts.includeAnswer ?? false,
    }),
  });

  if (!response.ok) {
    throw new Error(
      `Tavily Search API error: ${response.status} ${response.statusText}`
    );
  }

  const data = await response.json();
  const tavilyResults = data.results ?? [];

  const results: SearchResult[] = tavilyResults.map(
    (r: { title?: string; url?: string; content?: string }) => ({
      title: r.title ?? "",
      url: r.url ?? "",
      snippet: r.content ?? "",
    })
  );

  return { results, answer: data.answer ?? undefined };
}

// --- Smart routing ---

/** Query patterns that prefer Tavily (deep research). */
const TAVILY_PATTERNS = /\b(email|who is|profile|contact info|about|background|biography)\b/i;
/** Query patterns that prefer Brave (broad discovery). */
const BRAVE_PATTERNS = /\b(top|best|list of|influencers|trending|popular|directory)\b/i;

interface RoutingResult {
  provider: SearchProvider;
  reason: string;
  searchDepth?: "basic" | "advanced";
  includeAnswer?: boolean;
}

/**
 * Decide which search provider to use based on workflow type and query heuristics.
 *
 * Priority: key availability (hard) > workflow type (primary) > query patterns (secondary).
 */
export function routeSearchQuery(
  query: string,
  opts?: { workflowType?: WorkflowType; preferredProvider?: SearchProvider }
): RoutingResult {
  const hasBrave = !!getBraveApiKey();
  const hasTavily = !!getTavilyApiKey();

  // Hard constraint: only one key available
  if (hasBrave && !hasTavily) {
    return { provider: "brave", reason: "only_brave_key_configured" };
  }
  if (hasTavily && !hasBrave) {
    const depth = opts?.workflowType === "enrich" ? "advanced" : "basic";
    return {
      provider: "tavily",
      reason: "only_tavily_key_configured",
      searchDepth: depth,
      includeAnswer: opts?.workflowType === "enrich",
    };
  }
  if (!hasBrave && !hasTavily) {
    return { provider: "brave", reason: "no_keys_configured" };
  }

  // Explicit preference override
  if (opts?.preferredProvider) {
    const depth =
      opts.preferredProvider === "tavily" && opts.workflowType === "enrich"
        ? "advanced"
        : "basic";
    return {
      provider: opts.preferredProvider,
      reason: "explicit_preference",
      searchDepth: opts.preferredProvider === "tavily" ? depth : undefined,
      includeAnswer: opts.preferredProvider === "tavily",
    };
  }

  // Primary signal: workflow type
  const wfType = opts?.workflowType;
  if (wfType === "enrich") {
    return {
      provider: "tavily",
      reason: "workflow_type_enrich",
      searchDepth: "advanced",
      includeAnswer: true,
    };
  }
  if (wfType === "prune") {
    return {
      provider: "tavily",
      reason: "workflow_type_prune",
      searchDepth: "basic",
      includeAnswer: false,
    };
  }
  if (wfType === "search" || wfType === "agent") {
    // Check secondary signal: query heuristics might override
    if (TAVILY_PATTERNS.test(query)) {
      return {
        provider: "tavily",
        reason: "query_pattern_deep_research",
        searchDepth: "basic",
        includeAnswer: true,
      };
    }
    return { provider: "brave", reason: `workflow_type_${wfType}` };
  }

  // Secondary signal: query pattern heuristics (no workflow type context)
  if (TAVILY_PATTERNS.test(query)) {
    return {
      provider: "tavily",
      reason: "query_pattern_deep_research",
      searchDepth: "basic",
      includeAnswer: true,
    };
  }
  if (BRAVE_PATTERNS.test(query)) {
    return { provider: "brave", reason: "query_pattern_broad_discovery" };
  }

  // Default: Brave (larger free tier)
  return { provider: "brave", reason: "default" };
}

// --- Public API ---

export interface SearchWebOpts {
  count?: number;
  workflowType?: WorkflowType;
  preferredProvider?: SearchProvider;
  searchDepth?: "basic" | "advanced";
  includeAnswer?: boolean;
}

/**
 * Search the web with smart routing between Brave and Tavily.
 * Automatically selects the best provider based on workflow type and query,
 * with transparent failover if the primary provider errors.
 */
export async function searchWeb(
  query: string,
  workflowRunId: string,
  opts?: SearchWebOpts
): Promise<WebSearchResult> {
  const startTime = Date.now();
  const count = opts?.count ?? 10;

  const routing = routeSearchQuery(query, {
    workflowType: opts?.workflowType,
    preferredProvider: opts?.preferredProvider,
  });

  // Check if any keys are configured
  const braveKey = getBraveApiKey();
  const tavilyKey = getTavilyApiKey();

  if (!braveKey && !tavilyKey) {
    const error =
      "No search API key configured. Add a Brave or Tavily key in Settings > Search API.";

    createWorkflowStep({
      workflowRunId,
      stepIndex: nextStepIndex(workflowRunId),
      stepType: "web_search",
      status: "failed",
      tool: "search_web",
      input: JSON.stringify({ query }),
      output: JSON.stringify({ error }),
      error,
      durationMs: Date.now() - startTime,
    });

    return { query, results: [], totalResults: 0 };
  }

  // Resolve the effective search depth (explicit opt overrides routing)
  const searchDepth = opts?.searchDepth ?? routing.searchDepth;
  const includeAnswer = opts?.includeAnswer ?? routing.includeAnswer;

  // Attempt primary provider
  const primaryResult = await attemptSearch(
    routing.provider,
    query,
    { count, searchDepth, includeAnswer },
    { braveKey, tavilyKey }
  );

  if (primaryResult.success) {
    createWorkflowStep({
      workflowRunId,
      stepIndex: nextStepIndex(workflowRunId),
      stepType: "web_search",
      status: "completed",
      tool: "search_web",
      input: JSON.stringify({ query, count, provider: routing.provider }),
      output: JSON.stringify({
        totalResults: primaryResult.data!.results.length,
        provider: routing.provider,
        routingReason: routing.reason,
        failedOver: false,
      }),
      durationMs: Date.now() - startTime,
    });

    return {
      query,
      results: primaryResult.data!.results,
      totalResults: primaryResult.data!.results.length,
      provider: routing.provider,
      answer: primaryResult.data!.answer,
    };
  }

  // Primary failed — attempt failover
  const fallbackProvider: SearchProvider =
    routing.provider === "brave" ? "tavily" : "brave";
  const fallbackKey =
    fallbackProvider === "brave" ? braveKey : tavilyKey;

  if (!fallbackKey) {
    // No fallback available — log failure and return empty
    createWorkflowStep({
      workflowRunId,
      stepIndex: nextStepIndex(workflowRunId),
      stepType: "web_search",
      status: "failed",
      tool: "search_web",
      input: JSON.stringify({ query, provider: routing.provider }),
      output: JSON.stringify({
        error: primaryResult.error,
        provider: routing.provider,
        failoverAvailable: false,
      }),
      error: primaryResult.error,
      durationMs: Date.now() - startTime,
    });

    return { query, results: [], totalResults: 0, provider: routing.provider };
  }

  // Log the failed primary attempt
  createWorkflowStep({
    workflowRunId,
    stepIndex: nextStepIndex(workflowRunId),
    stepType: "web_search",
    status: "failed",
    tool: "search_web",
    input: JSON.stringify({ query, provider: routing.provider }),
    output: JSON.stringify({
      error: primaryResult.error,
      failingOver: true,
      fallbackProvider,
    }),
    error: primaryResult.error,
    durationMs: Date.now() - startTime,
  });

  // Attempt fallback
  const fallbackResult = await attemptSearch(
    fallbackProvider,
    query,
    { count, searchDepth, includeAnswer },
    { braveKey, tavilyKey }
  );

  if (fallbackResult.success) {
    createWorkflowStep({
      workflowRunId,
      stepIndex: nextStepIndex(workflowRunId),
      stepType: "web_search",
      status: "completed",
      tool: "search_web",
      input: JSON.stringify({ query, count, provider: fallbackProvider }),
      output: JSON.stringify({
        totalResults: fallbackResult.data!.results.length,
        provider: fallbackProvider,
        failedOver: true,
        failoverReason: primaryResult.error,
        originalProvider: routing.provider,
      }),
      durationMs: Date.now() - startTime,
    });

    return {
      query,
      results: fallbackResult.data!.results,
      totalResults: fallbackResult.data!.results.length,
      provider: fallbackProvider,
      answer: fallbackResult.data!.answer,
    };
  }

  // Both providers failed
  const bothError = `Both search providers failed. ${routing.provider}: ${primaryResult.error}; ${fallbackProvider}: ${fallbackResult.error}`;

  createWorkflowStep({
    workflowRunId,
    stepIndex: nextStepIndex(workflowRunId),
    stepType: "web_search",
    status: "failed",
    tool: "search_web",
    input: JSON.stringify({ query }),
    output: JSON.stringify({
      error: bothError,
      providers: { [routing.provider]: primaryResult.error, [fallbackProvider]: fallbackResult.error },
    }),
    error: bothError,
    durationMs: Date.now() - startTime,
  });

  return { query, results: [], totalResults: 0 };
}

// --- Internal helpers ---

interface AttemptResult {
  success: boolean;
  data?: { results: SearchResult[]; answer?: string };
  error?: string;
}

async function attemptSearch(
  provider: SearchProvider,
  query: string,
  opts: { count: number; searchDepth?: "basic" | "advanced"; includeAnswer?: boolean },
  keys: { braveKey: string | null; tavilyKey: string | null }
): Promise<AttemptResult> {
  try {
    if (provider === "brave") {
      if (!keys.braveKey) return { success: false, error: "Brave API key not available" };
      const result = await searchBrave(query, keys.braveKey, { count: opts.count });
      return { success: true, data: result };
    } else {
      if (!keys.tavilyKey) return { success: false, error: "Tavily API key not available" };
      const result = await searchTavily(query, keys.tavilyKey, {
        count: opts.count,
        searchDepth: opts.searchDepth,
        includeAnswer: opts.includeAnswer,
      });
      return { success: true, data: result };
    }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}
