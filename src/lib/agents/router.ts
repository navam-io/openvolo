import type { RoutingDecision, FetchStrategy } from "@/lib/agents/types";

/**
 * Domain-based routing rules.
 * Maps domain patterns to the preferred fetch strategy.
 */
const DOMAIN_RULES: Array<{ pattern: RegExp; strategy: FetchStrategy; reason: string }> = [
  // Static content — url_fetch is sufficient
  { pattern: /wikipedia\.org$/i, strategy: "url_fetch", reason: "Wikipedia serves static HTML" },
  { pattern: /github\.com$/i, strategy: "url_fetch", reason: "GitHub serves static HTML" },
  { pattern: /medium\.com$/i, strategy: "url_fetch", reason: "Medium serves static HTML" },
  { pattern: /substack\.com$/i, strategy: "url_fetch", reason: "Substack serves static HTML" },
  { pattern: /dev\.to$/i, strategy: "url_fetch", reason: "dev.to serves static HTML" },
  { pattern: /news\.ycombinator\.com$/i, strategy: "url_fetch", reason: "HN serves static HTML" },
  { pattern: /reddit\.com$/i, strategy: "url_fetch", reason: "Reddit old/new serves static HTML" },
  { pattern: /crunchbase\.com$/i, strategy: "url_fetch", reason: "Crunchbase serves static HTML" },

  // JS-rendered — needs browser
  { pattern: /x\.com$/i, strategy: "browser_scrape", reason: "X.com is a JS-rendered SPA" },
  { pattern: /twitter\.com$/i, strategy: "browser_scrape", reason: "Twitter is a JS-rendered SPA" },
  { pattern: /linkedin\.com$/i, strategy: "browser_scrape", reason: "LinkedIn is a JS-rendered SPA" },
  { pattern: /instagram\.com$/i, strategy: "browser_scrape", reason: "Instagram is a JS-rendered SPA" },
  { pattern: /facebook\.com$/i, strategy: "browser_scrape", reason: "Facebook is a JS-rendered SPA" },
  { pattern: /threads\.net$/i, strategy: "browser_scrape", reason: "Threads is a JS-rendered SPA" },
];

/**
 * Determine the best fetch strategy for a URL based on domain rules.
 * Falls back to url_fetch with automatic escalation if content is empty.
 */
export function routeUrl(url: string): RoutingDecision {
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname;

    // Check domain rules
    for (const rule of DOMAIN_RULES) {
      if (rule.pattern.test(hostname)) {
        return {
          url,
          strategy: rule.strategy,
          reason: rule.reason,
        };
      }
    }

    // Default: try url_fetch first (lighter, faster)
    return {
      url,
      strategy: "url_fetch",
      reason: "No domain rule matched — defaulting to url_fetch",
    };
  } catch {
    return {
      url,
      strategy: "url_fetch",
      reason: "Invalid URL — will attempt url_fetch",
    };
  }
}

/**
 * Check if url_fetch content indicates the page needs browser rendering.
 * Used to escalate from url_fetch to browser_scrape.
 */
export function shouldEscalateToBrowser(content: string, contentLength: number): boolean {
  if (contentLength < 100) return true;

  const indicators = [
    "enable javascript",
    "javascript is required",
    "please turn on javascript",
    "loading...",
    "please wait",
  ];

  const lower = content.toLowerCase();
  return indicators.some((ind) => lower.includes(ind));
}
