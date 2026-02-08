import { decrypt } from "@/lib/auth/crypto";
import { getPlatformAccountById, updatePlatformAccount } from "@/lib/db/queries/platform-accounts";
import { refreshXTokenAsync } from "@/lib/platforms/x/auth";
import { checkRateLimit, updateRateLimitFromHeaders } from "@/lib/platforms/rate-limiter";
import type { PlatformCredentials } from "@/lib/platforms/adapter";

// --- X API Types ---

export interface XUser {
  id: string;
  name: string;
  username: string;
  description?: string;
  location?: string;
  url?: string;
  profile_image_url?: string;
  public_metrics?: {
    followers_count: number;
    following_count: number;
    tweet_count: number;
    listed_count: number;
  };
  verified?: boolean;
  created_at?: string;
}

export interface XTweet {
  id: string;
  text: string;
  created_at?: string;
  public_metrics?: {
    retweet_count: number;
    reply_count: number;
    like_count: number;
    quote_count: number;
  };
  author_id?: string;
}

export interface XApiResponse<T> {
  data: T;
  meta?: {
    result_count: number;
    next_token?: string;
    previous_token?: string;
  };
}

export interface XApiError {
  title: string;
  detail: string;
  type: string;
  status: number;
}

// --- Constants ---

const X_API_BASE = "https://api.x.com/2";

const DEFAULT_USER_FIELDS = [
  "name",
  "username",
  "description",
  "location",
  "url",
  "profile_image_url",
  "public_metrics",
  "verified",
  "created_at",
].join(",");

// --- Core Fetch ---

/** Get decrypted credentials for an account. */
function getCredentials(accountId: string): PlatformCredentials {
  const account = getPlatformAccountById(accountId);
  if (!account?.credentialsEncrypted) {
    throw new Error("No credentials found for account");
  }
  return JSON.parse(decrypt(account.credentialsEncrypted));
}

/**
 * Authenticated fetch for X API v2 endpoints.
 * Handles token refresh, rate limit tracking, and error standardization.
 */
export async function xApiFetch<T>(
  accountId: string,
  endpoint: string,
  options: RequestInit = {}
): Promise<XApiResponse<T>> {
  // Derive endpoint pattern for rate limiting (e.g., "/2/users/:id/following")
  const endpointPattern = endpoint.replace(/\/\d+/g, "/:id");

  // Check rate limit before making the request
  const rateCheck = checkRateLimit(accountId, endpointPattern);
  if (!rateCheck.allowed) {
    throw new RateLimitError(endpointPattern, rateCheck.retryAfter!);
  }

  let creds = getCredentials(accountId);
  const now = Math.floor(Date.now() / 1000);

  // Auto-refresh if within 5 minutes of expiry
  if (creds.expiresAt - now < 300) {
    creds = await refreshXTokenAsync(accountId);
  }

  const url = endpoint.startsWith("http") ? endpoint : `${X_API_BASE}${endpoint}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${creds.accessToken}`,
      ...options.headers,
    },
  });

  // Update rate limit state from response headers
  updateRateLimitFromHeaders(accountId, endpointPattern, res.headers);

  if (res.status === 401) {
    // Try one token refresh
    creds = await refreshXTokenAsync(accountId);
    const retryRes = await fetch(url, {
      ...options,
      headers: {
        Authorization: `Bearer ${creds.accessToken}`,
        ...options.headers,
      },
    });

    updateRateLimitFromHeaders(accountId, endpointPattern, retryRes.headers);

    if (!retryRes.ok) {
      const err = await retryRes.json().catch(() => ({ detail: retryRes.statusText }));
      throw new XApiRequestError(retryRes.status, err.detail || err.title || "Request failed");
    }

    return retryRes.json();
  }

  if (res.status === 403) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new TierRestrictedError(
      endpointPattern,
      err.detail || "This endpoint requires a higher X API tier"
    );
  }

  if (res.status === 429) {
    const resetHeader = res.headers.get("x-rate-limit-reset");
    const retryAfter = resetHeader ? parseInt(resetHeader) - now : 60;
    throw new RateLimitError(endpointPattern, retryAfter);
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new XApiRequestError(res.status, err.detail || err.title || "Request failed");
  }

  return res.json();
}

// --- Error Classes ---

export class XApiRequestError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
    this.name = "XApiRequestError";
  }
}

export class RateLimitError extends Error {
  constructor(
    public readonly endpoint: string,
    public readonly retryAfter: number
  ) {
    super(`Rate limited on ${endpoint}. Retry after ${retryAfter}s`);
    this.name = "RateLimitError";
  }
}

export class TierRestrictedError extends Error {
  constructor(
    public readonly endpoint: string,
    detail: string
  ) {
    super(`Endpoint ${endpoint} requires a higher X API tier. ${detail}`);
    this.name = "TierRestrictedError";
  }
}

// --- Endpoint Functions ---

/** Fetch the authenticated user's profile. */
export async function getAuthenticatedUser(accountId: string): Promise<XUser> {
  const res = await xApiFetch<XUser>(
    accountId,
    `/users/me?user.fields=${DEFAULT_USER_FIELDS}`
  );
  return res.data;
}

/** Fetch a user by their X ID. */
export async function getUserById(accountId: string, userId: string): Promise<XUser> {
  const res = await xApiFetch<XUser>(
    accountId,
    `/users/${userId}?user.fields=${DEFAULT_USER_FIELDS}`
  );
  return res.data;
}

/** Fetch a user by their username. */
export async function getUserByUsername(accountId: string, username: string): Promise<XUser> {
  const res = await xApiFetch<XUser>(
    accountId,
    `/users/by/username/${username}?user.fields=${DEFAULT_USER_FIELDS}`
  );
  return res.data;
}

/** Fetch followers of a user (paginated). */
export async function getFollowers(
  accountId: string,
  userId: string,
  opts?: { maxResults?: number; paginationToken?: string }
): Promise<XApiResponse<XUser[]>> {
  const params = new URLSearchParams({
    "user.fields": DEFAULT_USER_FIELDS,
    max_results: String(opts?.maxResults ?? 100),
  });
  if (opts?.paginationToken) params.set("pagination_token", opts.paginationToken);

  return xApiFetch<XUser[]>(accountId, `/users/${userId}/followers?${params.toString()}`);
}

/** Fetch users that a user is following (paginated). */
export async function getFollowing(
  accountId: string,
  userId: string,
  opts?: { maxResults?: number; paginationToken?: string }
): Promise<XApiResponse<XUser[]>> {
  const params = new URLSearchParams({
    "user.fields": DEFAULT_USER_FIELDS,
    max_results: String(opts?.maxResults ?? 100),
  });
  if (opts?.paginationToken) params.set("pagination_token", opts.paginationToken);

  return xApiFetch<XUser[]>(accountId, `/users/${userId}/following?${params.toString()}`);
}

/** Fetch tweets by a user (paginated). */
export async function getUserTweets(
  accountId: string,
  userId: string,
  opts?: { maxResults?: number; paginationToken?: string }
): Promise<XApiResponse<XTweet[]>> {
  const params = new URLSearchParams({
    "tweet.fields": "created_at,public_metrics,author_id",
    max_results: String(opts?.maxResults ?? 10),
  });
  if (opts?.paginationToken) params.set("pagination_token", opts.paginationToken);

  return xApiFetch<XTweet[]>(accountId, `/users/${userId}/tweets?${params.toString()}`);
}

/** Fetch mentions of a user (paginated). */
export async function getUserMentions(
  accountId: string,
  userId: string,
  opts?: { maxResults?: number; paginationToken?: string }
): Promise<XApiResponse<XTweet[]>> {
  const params = new URLSearchParams({
    "tweet.fields": "created_at,public_metrics,author_id",
    max_results: String(opts?.maxResults ?? 10),
  });
  if (opts?.paginationToken) params.set("pagination_token", opts.paginationToken);

  return xApiFetch<XTweet[]>(accountId, `/users/${userId}/mentions?${params.toString()}`);
}

// --- Engagement Actions ---

/** Like a tweet. */
export async function likeTweet(
  accountId: string,
  userId: string,
  tweetId: string
): Promise<{ liked: boolean }> {
  const res = await xApiFetch<{ liked: boolean }>(accountId, `/users/${userId}/likes`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tweet_id: tweetId }),
  });
  return res.data;
}

/** Unlike a tweet. */
export async function unlikeTweet(
  accountId: string,
  userId: string,
  tweetId: string
): Promise<{ liked: boolean }> {
  const res = await xApiFetch<{ liked: boolean }>(accountId, `/users/${userId}/likes/${tweetId}`, {
    method: "DELETE",
  });
  return res.data;
}

/** Retweet a tweet. */
export async function retweet(
  accountId: string,
  userId: string,
  tweetId: string
): Promise<{ retweeted: boolean }> {
  const res = await xApiFetch<{ retweeted: boolean }>(accountId, `/users/${userId}/retweets`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tweet_id: tweetId }),
  });
  return res.data;
}

/** Unretweet a tweet. */
export async function unretweet(
  accountId: string,
  userId: string,
  tweetId: string
): Promise<{ retweeted: boolean }> {
  const res = await xApiFetch<{ retweeted: boolean }>(accountId, `/users/${userId}/retweets/${tweetId}`, {
    method: "DELETE",
  });
  return res.data;
}

/** Reply to a tweet. */
export async function replyToTweet(
  accountId: string,
  tweetId: string,
  text: string
): Promise<XTweet> {
  const res = await xApiFetch<XTweet>(accountId, `/tweets`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      text,
      reply: { in_reply_to_tweet_id: tweetId },
    }),
  });
  return res.data;
}

// --- Compose Actions ---

/** Post a single tweet. */
export async function postTweet(
  accountId: string,
  text: string
): Promise<XTweet> {
  const res = await xApiFetch<XTweet>(accountId, `/tweets`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });
  return res.data;
}

/** Post a thread (array of tweet texts). Returns posted tweets in order. */
export async function postThread(
  accountId: string,
  tweets: string[]
): Promise<{ posted: XTweet[]; error?: string }> {
  const posted: XTweet[] = [];

  for (let i = 0; i < tweets.length; i++) {
    try {
      const body: Record<string, unknown> = { text: tweets[i] };

      // Chain each tweet as a reply to the previous one
      if (i > 0) {
        body.reply = { in_reply_to_tweet_id: posted[i - 1].id };
      }

      const res = await xApiFetch<XTweet>(accountId, `/tweets`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      posted.push(res.data);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      return { posted, error: `Failed on tweet ${i + 1}: ${message}` };
    }
  }

  return { posted };
}
