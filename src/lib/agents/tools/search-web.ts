import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { homedir } from "os";
import { decrypt } from "@/lib/auth/crypto";
import {
  createWorkflowStep,
  nextStepIndex,
} from "@/lib/db/queries/workflows";
import type { WebSearchResult, SearchResult } from "@/lib/agents/types";

const BRAVE_API_URL = "https://api.search.brave.com/res/v1/web/search";

/**
 * Get the Brave Search API key from encrypted config.
 */
function getBraveApiKey(): string | null {
  // Check env var first
  if (process.env.BRAVE_SEARCH_API_KEY) {
    return process.env.BRAVE_SEARCH_API_KEY;
  }

  const dataDir =
    process.env.OPENVOLO_DATA_DIR?.replace("~", homedir()) ??
    join(homedir(), ".openvolo");
  const configPath = join(dataDir, "config.json");

  if (!existsSync(configPath)) return null;

  try {
    const config = JSON.parse(readFileSync(configPath, "utf-8"));
    if (!config.braveSearchApiKey) return null;
    return decrypt(config.braveSearchApiKey);
  } catch {
    return null;
  }
}

/**
 * Search the web using Brave Search API.
 * Returns ranked results with title, URL, and snippet.
 */
export async function searchWeb(
  query: string,
  workflowRunId: string,
  opts?: { count?: number }
): Promise<WebSearchResult> {
  const startTime = Date.now();
  const count = opts?.count ?? 10;

  const apiKey = getBraveApiKey();
  if (!apiKey) {
    const error = "Brave Search API key not configured. Add it in Settings > Search API.";

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

  try {
    const params = new URLSearchParams({
      q: query,
      count: String(count),
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
      throw new Error(`Brave Search API error: ${response.status} ${response.statusText}`);
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

    const result: WebSearchResult = {
      query,
      results,
      totalResults: results.length,
    };

    createWorkflowStep({
      workflowRunId,
      stepIndex: nextStepIndex(workflowRunId),
      stepType: "web_search",
      status: "completed",
      tool: "search_web",
      input: JSON.stringify({ query, count }),
      output: JSON.stringify({ totalResults: results.length }),
      durationMs: Date.now() - startTime,
    });

    return result;
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);

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
}
