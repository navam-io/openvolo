import {
  createWorkflowStep,
  nextStepIndex,
} from "@/lib/db/queries/workflows";
import type { BrowserScrapeResult } from "@/lib/agents/types";

/**
 * Scrape a URL using Playwright headless browser with anti-detection.
 * Thin wrapper around the existing browser infrastructure.
 *
 * NOTE: This requires Playwright to be installed and a browser session
 * to be configured. Falls back to an error result if unavailable.
 */
export async function browserScrape(
  url: string,
  workflowRunId: string,
  opts?: { selector?: string; waitForSelector?: string; timeout?: number }
): Promise<BrowserScrapeResult> {
  const startTime = Date.now();
  const timeout = opts?.timeout ?? 30000;

  try {
    // Dynamically import Playwright to avoid build-time failures
    const { chromium } = await import("playwright");

    const browser = await chromium.launch({
      headless: true,
      args: ["--disable-blink-features=AutomationControlled"],
    });

    const context = await browser.newContext({
      userAgent:
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      viewport: { width: 1280, height: 720 },
    });

    const page = await context.newPage();

    try {
      await page.goto(url, { timeout, waitUntil: "domcontentloaded" });

      // Wait for content to render
      if (opts?.waitForSelector) {
        await page.waitForSelector(opts.waitForSelector, { timeout: 10000 }).catch(() => {});
      } else {
        // Default: wait a bit for JS to render
        await page.waitForTimeout(2000);
      }

      const title = await page.title();

      let content: string;
      if (opts?.selector) {
        const el = await page.$(opts.selector);
        content = el ? (await el.textContent()) || "" : "";
      } else {
        // Remove noise elements then extract text
        await page.evaluate(() => {
          for (const sel of ["nav", "footer", "aside", "header", "script", "style"]) {
            document.querySelectorAll(sel).forEach((el) => el.remove());
          }
        });
        content = (await page.textContent("body")) || "";
      }

      content = content.replace(/\s+/g, " ").trim().slice(0, 8000);

      const result: BrowserScrapeResult = {
        url,
        title,
        content,
        contentLength: content.length,
        success: true,
      };

      createWorkflowStep({
        workflowRunId,
        stepIndex: nextStepIndex(workflowRunId),
        stepType: "browser_scrape",
        status: "completed",
        url,
        tool: "browser_scrape",
        input: JSON.stringify({ url, selector: opts?.selector }),
        output: JSON.stringify({ title, contentLength: content.length }),
        durationMs: Date.now() - startTime,
      });

      return result;
    } finally {
      await context.close();
      await browser.close();
    }
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);

    createWorkflowStep({
      workflowRunId,
      stepIndex: nextStepIndex(workflowRunId),
      stepType: "browser_scrape",
      status: "failed",
      url,
      tool: "browser_scrape",
      input: JSON.stringify({ url }),
      output: JSON.stringify({ error }),
      error,
      durationMs: Date.now() - startTime,
    });

    return {
      url,
      title: "",
      content: "",
      contentLength: 0,
      success: false,
      error,
    };
  }
}
