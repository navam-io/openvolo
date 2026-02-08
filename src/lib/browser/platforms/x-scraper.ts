import type { Page } from "playwright";
import { BaseScraper } from "@/lib/browser/scraper";
import type { AntiDetectionConfig, RawProfileData } from "@/lib/browser/types";

const X_HOME = "https://x.com/home";
const PROFILE_URL = (handle: string) => `https://x.com/${handle}`;

/** Max tweets to extract from a profile page. */
const MAX_TWEETS = 5;

/** Timeout for waiting on profile page elements (ms). */
const SELECTOR_TIMEOUT = 10_000;

/**
 * X/Twitter profile page scraper.
 * Navigates to x.com/{handle} and extracts raw text from DOM elements.
 * All extraction is defensive — individual field failures return null.
 */
export class XScraper extends BaseScraper {
  constructor(config?: Partial<AntiDetectionConfig>) {
    super("x", config);
  }

  /**
   * Validate that the stored session is still authenticated on X.
   * Navigates to x.com/home and checks for the primary column indicator.
   */
  async validateSession(): Promise<boolean> {
    if (!this.context) {
      throw new Error("Scraper not initialized. Call init() first.");
    }

    const page = await this.context.newPage();
    try {
      await page.goto(X_HOME, { waitUntil: "domcontentloaded", timeout: 30_000 });

      const loggedIn = await page
        .waitForSelector("[data-testid=\"primaryColumn\"]", { timeout: SELECTOR_TIMEOUT })
        .then(() => true)
        .catch(() => false);

      return loggedIn;
    } catch {
      return false;
    } finally {
      await page.close();
    }
  }

  /**
   * Scrape a single X profile page.
   * Returns RawProfileData with whatever fields could be extracted.
   * Returns null if the profile page cannot be loaded or a challenge is detected.
   */
  async scrapeProfile(handle: string): Promise<RawProfileData | null> {
    const page = await this.navigateWithDelay(PROFILE_URL(handle));

    try {
      // Wait for the profile to render — UserName is the key indicator
      const loaded = await page
        .waitForSelector("[data-testid=\"UserName\"]", { timeout: SELECTOR_TIMEOUT })
        .then(() => true)
        .catch(() => false);

      // Detect CAPTCHA / challenge / suspended account
      if (!loaded) {
        if (await detectChallenge(page)) {
          throw new Error(`Challenge/CAPTCHA detected while loading @${handle}. Stopping batch.`);
        }
        // Profile may not exist or is suspended
        return null;
      }

      // Extract all fields defensively
      const [displayName, bio, location, website, pinnedTweetText, recentTweetTexts, followerCount, followingCount] =
        await Promise.all([
          extractDisplayName(page),
          extractBio(page),
          extractLocation(page),
          extractWebsite(page),
          extractPinnedTweet(page),
          extractRecentTweets(page),
          extractFollowerCount(page),
          extractFollowingCount(page),
        ]);

      return {
        platform: "x",
        platformHandle: handle,
        displayName,
        bio,
        location,
        website,
        pinnedTweetText,
        recentTweetTexts,
        followerCount,
        followingCount,
        scrapedAt: Math.floor(Date.now() / 1000),
      };
    } finally {
      await page.close();
    }
  }
}

// ---------------------------------------------------------------------------
// DOM extraction helpers — each returns null on failure
// ---------------------------------------------------------------------------

async function extractDisplayName(page: Page): Promise<string | null> {
  try {
    // UserName container: first child div holds the display name
    const el = await page.$("[data-testid=\"UserName\"] > div:first-child span");
    return el ? ((await el.textContent()) ?? "").trim() || null : null;
  } catch {
    return null;
  }
}

async function extractBio(page: Page): Promise<string | null> {
  try {
    const el = await page.$("[data-testid=\"UserDescription\"]");
    return el ? ((await el.textContent()) ?? "").trim() || null : null;
  } catch {
    return null;
  }
}

async function extractLocation(page: Page): Promise<string | null> {
  try {
    const el = await page.$("[data-testid=\"UserLocation\"] span:last-child");
    return el ? ((await el.textContent()) ?? "").trim() || null : null;
  } catch {
    return null;
  }
}

/**
 * Extract website URL from the profile.
 * Uses visible text content (not href) to avoid t.co shortened URLs.
 */
async function extractWebsite(page: Page): Promise<string | null> {
  try {
    const el = await page.$("[data-testid=\"UserUrl\"] a");
    if (!el) return null;
    // Visible text shows the real URL, href is t.co
    const text = ((await el.textContent()) ?? "").trim();
    return text || null;
  } catch {
    return null;
  }
}

/**
 * Extract pinned tweet text if present.
 * Pinned tweets have a social context label containing "Pinned" above the tweet.
 */
async function extractPinnedTweet(page: Page): Promise<string | null> {
  try {
    // Look for tweets with a social context that mentions "Pinned"
    const tweets = await page.$$("[data-testid=\"tweet\"]");
    for (const tweet of tweets) {
      const socialContext = await tweet.$("[data-testid=\"socialContext\"]");
      if (!socialContext) continue;

      const contextText = ((await socialContext.textContent()) ?? "").toLowerCase();
      if (contextText.includes("pinned")) {
        const tweetText = await tweet.$("[data-testid=\"tweetText\"]");
        return tweetText ? ((await tweetText.textContent()) ?? "").trim() || null : null;
      }
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Extract recent original tweet texts (skip retweets).
 * Returns up to MAX_TWEETS tweet texts.
 */
async function extractRecentTweets(page: Page): Promise<string[]> {
  try {
    const tweets = await page.$$("[data-testid=\"tweet\"]");
    const texts: string[] = [];

    for (const tweet of tweets) {
      if (texts.length >= MAX_TWEETS) break;

      // Skip retweets — they have a socialContext with "Reposted"
      const socialContext = await tweet.$("[data-testid=\"socialContext\"]");
      if (socialContext) {
        const contextText = ((await socialContext.textContent()) ?? "").toLowerCase();
        if (contextText.includes("reposted")) continue;
        // "Pinned" tweets are original content — don't skip those
      }

      const tweetText = await tweet.$("[data-testid=\"tweetText\"]");
      if (!tweetText) continue;

      const text = ((await tweetText.textContent()) ?? "").trim();
      if (text) texts.push(text);
    }

    return texts;
  } catch {
    return [];
  }
}

/** Parse a compact number string like "12.5K" or "1.2M" into a number. */
function parseCompactNumber(text: string): number | null {
  const cleaned = text.replace(/,/g, "").trim();
  const match = cleaned.match(/^([\d.]+)\s*([KkMm]?)$/);
  if (!match) return null;

  const num = parseFloat(match[1]);
  if (isNaN(num)) return null;

  const suffix = match[2].toUpperCase();
  if (suffix === "K") return Math.round(num * 1_000);
  if (suffix === "M") return Math.round(num * 1_000_000);
  return Math.round(num);
}

async function extractFollowerCount(page: Page): Promise<number | null> {
  try {
    const el = await page.$("a[href$=\"/verified_followers\"] span, a[href$=\"/followers\"] span");
    if (!el) return null;
    const text = (await el.textContent()) ?? "";
    return parseCompactNumber(text);
  } catch {
    return null;
  }
}

async function extractFollowingCount(page: Page): Promise<number | null> {
  try {
    const el = await page.$("a[href$=\"/following\"] span");
    if (!el) return null;
    const text = (await el.textContent()) ?? "";
    return parseCompactNumber(text);
  } catch {
    return null;
  }
}

/**
 * Detect if the page shows a CAPTCHA, challenge, or login redirect.
 * Signals that the session is compromised or rate-limited.
 */
async function detectChallenge(page: Page): Promise<boolean> {
  try {
    const title = (await page.title()).toLowerCase();
    if (title.includes("verify") || title.includes("challenge")) return true;

    // Check for login redirect (session expired)
    const url = page.url();
    if (url.includes("/login") || url.includes("/account/access")) return true;

    // Check for "Something went wrong" error page
    const errorText = await page.$("text=Something went wrong");
    if (errorText) return true;

    return false;
  } catch {
    return false;
  }
}
