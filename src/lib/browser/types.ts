/** Platform identifiers for browser sessions. */
export type BrowserPlatform = "x" | "linkedin";

/** Serialized cookie (matches Playwright's Cookie shape). */
export interface CookieData {
  name: string;
  value: string;
  domain: string;
  path: string;
  expires: number;
  httpOnly: boolean;
  secure: boolean;
  sameSite: "Strict" | "Lax" | "None";
}

/** Stored browser session (encrypted at rest via AES-256-GCM). */
export interface BrowserSession {
  platform: BrowserPlatform;
  cookies: CookieData[];
  userAgent: string;
  viewport: { width: number; height: number };
  createdAt: number; // unix seconds
  lastValidatedAt: number; // unix seconds
  expiresAt?: number; // unix seconds (platform-specific)
}

/** Anti-detection timing and behavior configuration. */
export interface AntiDetectionConfig {
  /** Min delay between page loads (ms). */
  minDelay: number;
  /** Max delay between page loads (ms). */
  maxDelay: number;
  /** Max profiles per session batch. */
  batchLimit: number;
  /** Cooldown between batches (ms). */
  batchCooldown: number;
  /** Min scroll distance after page load (px). */
  scrollMin: number;
  /** Max scroll distance after page load (px). */
  scrollMax: number;
}

/** Raw text extracted from a profile page (pre-LLM). */
export interface RawProfileData {
  platform: BrowserPlatform;
  platformHandle: string;
  displayName: string | null;
  bio: string | null;
  location: string | null;
  website: string | null;
  pinnedTweetText: string | null;
  recentTweetTexts: string[];
  followerCount: number | null;
  followingCount: number | null;
  scrapedAt: number; // unix seconds
}

/** Structured data extracted by LLM from raw profile text. */
export interface ParsedProfileData {
  company: string | null;
  title: string | null;
  headline: string | null;
  email: string | null;
  phone: string | null;
  skills: string[];
  interests: string[];
  previousCompanies: string[];
  industry: string | null;
  confidence: number; // 0.0 – 1.0
}

/** Per-profile scrape result. */
export interface ScrapeResult {
  contactId: string;
  platformHandle: string;
  raw: RawProfileData | null;
  parsed: ParsedProfileData | null;
  merged: boolean;
  error?: string;
}
