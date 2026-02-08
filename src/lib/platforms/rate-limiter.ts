import {
  getPlatformAccountById,
  updatePlatformAccount,
} from "@/lib/db/queries/platform-accounts";
import type { RateLimitState, RateLimitInfo } from "@/lib/platforms/adapter";

/** Thrown when a request is rate-limited. Shared across all platform clients. */
export class RateLimitError extends Error {
  constructor(
    public readonly endpoint: string,
    public readonly retryAfter: number
  ) {
    super(`Rate limited on ${endpoint}. Retry after ${retryAfter}s`);
    this.name = "RateLimitError";
  }
}

/** Read stored rate limit state for an account. */
export function getRateLimitState(accountId: string): RateLimitState {
  const account = getPlatformAccountById(accountId);
  if (!account?.rateLimitState) return {};

  try {
    return JSON.parse(account.rateLimitState) as RateLimitState;
  } catch {
    return {};
  }
}

/** Persist rate limit state to the platform account row. */
export function saveRateLimitState(accountId: string, state: RateLimitState): void {
  updatePlatformAccount(accountId, {
    rateLimitState: JSON.stringify(state),
  });
}

/**
 * Check whether a request to the given endpoint is allowed.
 * Returns { allowed: true } or { allowed: false, retryAfter: seconds }.
 */
export function checkRateLimit(
  accountId: string,
  endpointPattern: string
): { allowed: boolean; retryAfter?: number } {
  const state = getRateLimitState(accountId);
  const info = state[endpointPattern];

  if (!info) return { allowed: true };

  const now = Math.floor(Date.now() / 1000);

  // If the reset time has passed, the window has refreshed
  if (now >= info.resetsAt) return { allowed: true };

  // If remaining requests are exhausted, deny
  if (info.remaining <= 0) {
    return { allowed: false, retryAfter: info.resetsAt - now };
  }

  return { allowed: true };
}

/**
 * Parse rate limit headers from an X API response and update stored state.
 * X API headers: x-rate-limit-limit, x-rate-limit-remaining, x-rate-limit-reset
 */
export function updateRateLimitFromHeaders(
  accountId: string,
  endpointPattern: string,
  headers: Headers
): void {
  const limitHeader = headers.get("x-rate-limit-limit");
  const remainingHeader = headers.get("x-rate-limit-remaining");
  const resetHeader = headers.get("x-rate-limit-reset");

  // Only update if headers are present (not all endpoints return them)
  if (!limitHeader || !remainingHeader || !resetHeader) return;

  const info: RateLimitInfo = {
    limit: parseInt(limitHeader, 10),
    remaining: parseInt(remainingHeader, 10),
    resetsAt: parseInt(resetHeader, 10),
  };

  const state = getRateLimitState(accountId);
  state[endpointPattern] = info;
  saveRateLimitState(accountId, state);
}
