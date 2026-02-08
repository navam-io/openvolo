import * as cheerio from "cheerio";
import {
  createWorkflowStep,
  nextStepIndex,
} from "@/lib/db/queries/workflows";
import type { UrlFetchResult } from "@/lib/agents/types";

/** Simple per-domain rate limiter: 1 request/sec per domain. */
const lastFetchByDomain = new Map<string, number>();
const MIN_DELAY_MS = 1000;

async function respectRateLimit(domain: string): Promise<void> {
  const last = lastFetchByDomain.get(domain);
  if (last) {
    const elapsed = Date.now() - last;
    if (elapsed < MIN_DELAY_MS) {
      await new Promise((r) => setTimeout(r, MIN_DELAY_MS - elapsed));
    }
  }
  lastFetchByDomain.set(domain, Date.now());
}

/** JS framework markers that indicate a page needs browser rendering. */
const JS_FRAMEWORK_MARKERS = [
  "__NEXT_DATA__",
  "__NUXT__",
  "window.__INITIAL_STATE__",
  '<div id="root"></div>',
  '<div id="app"></div>',
  "react-root",
];

/**
 * Fetch a URL with HTTP GET, extract readable content with Cheerio.
 * Returns structured content or indicates the page needs browser rendering.
 */
export async function urlFetch(
  url: string,
  workflowRunId: string,
  opts?: { timeout?: number }
): Promise<UrlFetchResult> {
  const startTime = Date.now();
  const timeout = opts?.timeout ?? 15000;

  let result: UrlFetchResult;

  try {
    const parsedUrl = new URL(url);
    await respectRateLimit(parsedUrl.hostname);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
      },
    });

    clearTimeout(timer);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // Remove script, style, nav, footer, aside elements
    $("script, style, nav, footer, aside, header, iframe, noscript").remove();

    const title = $("title").text().trim() || $("h1").first().text().trim() || "";
    const description =
      $('meta[name="description"]').attr("content")?.trim() ||
      $('meta[property="og:description"]').attr("content")?.trim() ||
      "";

    // Extract main content — prefer article, then main, then body
    let content = "";
    const mainSelectors = ["article", "main", '[role="main"]', ".content", "#content", "body"];
    for (const selector of mainSelectors) {
      const el = $(selector);
      if (el.length > 0) {
        content = el.text().replace(/\s+/g, " ").trim();
        if (content.length > 100) break;
      }
    }

    // Detect if page needs browser rendering
    const needsBrowser =
      content.length < 100 ||
      JS_FRAMEWORK_MARKERS.some((marker) => html.includes(marker)) ||
      html.includes("<noscript>");

    result = {
      url,
      title,
      description,
      content: content.slice(0, 8000), // Cap at 8K chars for LLM context
      contentLength: content.length,
      needsBrowser,
    };
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);

    // Log error step
    createWorkflowStep({
      workflowRunId,
      stepIndex: nextStepIndex(workflowRunId),
      stepType: "url_fetch",
      status: "failed",
      url,
      tool: "url_fetch",
      input: JSON.stringify({ url }),
      output: JSON.stringify({ error }),
      error,
      durationMs: Date.now() - startTime,
    });

    return {
      url,
      title: "",
      description: "",
      content: "",
      contentLength: 0,
      needsBrowser: true,
    };
  }

  // Log success step
  createWorkflowStep({
    workflowRunId,
    stepIndex: nextStepIndex(workflowRunId),
    stepType: "url_fetch",
    status: "completed",
    url,
    tool: "url_fetch",
    input: JSON.stringify({ url }),
    output: JSON.stringify({
      title: result.title,
      contentLength: result.contentLength,
      needsBrowser: result.needsBrowser,
    }),
    durationMs: Date.now() - startTime,
  });

  return result;
}
