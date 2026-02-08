import type { Browser, BrowserContext, Page } from "playwright";
import type { AntiDetectionConfig, BrowserPlatform, BrowserSession } from "@/lib/browser/types";
import { loadSession, createSessionContext } from "@/lib/browser/session";
import {
  DEFAULT_CONFIG,
  simulateScroll,
  waitBetweenPages,
} from "@/lib/browser/anti-detection";

/**
 * Base scraper class providing Playwright lifecycle, anti-detection delays,
 * and batch limit tracking. Platform-specific scrapers extend this.
 */
export abstract class BaseScraper {
  protected readonly platform: BrowserPlatform;
  protected readonly config: AntiDetectionConfig;
  protected session: BrowserSession | null = null;
  protected browser: Browser | null = null;
  protected context: BrowserContext | null = null;
  private scraped = 0;

  constructor(platform: BrowserPlatform, config?: Partial<AntiDetectionConfig>) {
    this.platform = platform;
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /** Load stored session and launch headless Playwright context. */
  async init(): Promise<void> {
    this.session = loadSession(this.platform);
    if (!this.session) {
      throw new Error(
        `No browser session found for ${this.platform}. Set up a session in Settings first.`
      );
    }

    const ctx = await createSessionContext(this.session);
    this.browser = ctx.browser;
    this.context = ctx.context;
  }

  /** Validate that the session is still authenticated. Platform-specific. */
  abstract validateSession(): Promise<boolean>;

  /**
   * Navigate to a URL with anti-detection delays and scroll simulation.
   * Increments the batch counter. Throws if batch limit reached.
   */
  protected async navigateWithDelay(url: string): Promise<Page> {
    if (this.batchLimitReached) {
      throw new Error(
        `Batch limit of ${this.config.batchLimit} profiles reached. ` +
        `Wait ${Math.round(this.config.batchCooldown / 60_000)} minutes before the next batch.`
      );
    }

    if (!this.context) {
      throw new Error("Scraper not initialized. Call init() first.");
    }

    // Delay between page loads (skip for first page)
    if (this.scraped > 0) {
      await waitBetweenPages(this.config);
    }

    const page = await this.context.newPage();
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30_000 });

    // Simulate human scroll behavior
    await simulateScroll(page, this.config);

    this.scraped++;
    return page;
  }

  /** Number of profiles scraped in the current batch. */
  get profilesScraped(): number {
    return this.scraped;
  }

  /** Whether the batch limit has been reached. */
  get batchLimitReached(): boolean {
    return this.scraped >= this.config.batchLimit;
  }

  /** Close browser and clean up resources. */
  async close(): Promise<void> {
    await this.context?.close();
    await this.browser?.close();
    this.context = null;
    this.browser = null;
  }
}
