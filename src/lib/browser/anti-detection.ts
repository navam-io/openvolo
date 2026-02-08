import type { Page } from "playwright";
import type { AntiDetectionConfig } from "@/lib/browser/types";

/** Default anti-detection settings tuned for X/Twitter. */
export const DEFAULT_CONFIG: AntiDetectionConfig = {
  minDelay: 8_000,
  maxDelay: 20_000,
  batchLimit: 15,
  batchCooldown: 30 * 60 * 1000, // 30 minutes
  scrollMin: 300,
  scrollMax: 800,
};

/** Common desktop viewports to rotate through per-session. */
export const VIEWPORTS = [
  { width: 1366, height: 768 },
  { width: 1440, height: 900 },
  { width: 1536, height: 864 },
  { width: 1920, height: 1080 },
  { width: 1280, height: 720 },
] as const;

/** Pick a random viewport from the pool. */
export function randomViewport(): { width: number; height: number } {
  return { ...VIEWPORTS[Math.floor(Math.random() * VIEWPORTS.length)] };
}

/**
 * Generate a normally distributed random delay between min and max (ms).
 * Uses the Box-Muller transform so most delays cluster around the midpoint,
 * mimicking natural browsing rhythm.
 */
export function randomDelay(min: number, max: number): number {
  const u1 = Math.random();
  const u2 = Math.random();
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  const mid = (min + max) / 2;
  const spread = (max - min) / 6; // 99.7% within range
  return Math.max(min, Math.min(max, Math.round(mid + z * spread)));
}

/** Random integer in [min, max] (inclusive). */
function randomInRange(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/** Sleep for a given number of milliseconds. */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Simulate human-like scroll after page load.
 * Scrolls in multiple small steps with micro-pauses between each.
 */
export async function simulateScroll(
  page: Page,
  config: AntiDetectionConfig = DEFAULT_CONFIG
): Promise<void> {
  const distance = randomInRange(config.scrollMin, config.scrollMax);
  const steps = randomInRange(3, 7);
  const stepSize = Math.round(distance / steps);

  for (let i = 0; i < steps; i++) {
    await page.mouse.wheel(0, stepSize);
    await sleep(randomInRange(100, 400));
  }
}

/**
 * Wait a randomized delay before the next page navigation.
 * Call this between profile scrapes.
 */
export async function waitBetweenPages(
  config: AntiDetectionConfig = DEFAULT_CONFIG
): Promise<void> {
  const delay = randomDelay(config.minDelay, config.maxDelay);
  await sleep(delay);
}
