/**
 * Analytics utility functions for time range parsing and formatting.
 */

/** Convert a range string ("7d"|"30d"|"90d"|"all") to a Unix timestamp (seconds). */
export function parseSinceFromRange(range: string | null): number {
  const now = Math.floor(Date.now() / 1000);
  switch (range) {
    case "7d":
      return now - 7 * 86400;
    case "30d":
      return now - 30 * 86400;
    case "90d":
      return now - 90 * 86400;
    case "all":
      return 0;
    default:
      return now - 30 * 86400; // default 30 days
  }
}

/** Format a USD cost amount as "$0.42". */
export function formatCost(usd: number): string {
  if (usd < 0.01 && usd > 0) return "<$0.01";
  return `$${usd.toFixed(2)}`;
}

/** Format a token count as "12.4K" or "1.2M". */
export function formatTokens(count: number): string {
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
  if (count >= 1_000) return `${(count / 1_000).toFixed(1)}K`;
  return count.toString();
}
