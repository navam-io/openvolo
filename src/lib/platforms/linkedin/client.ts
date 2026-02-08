import { decrypt } from "@/lib/auth/crypto";
import { getPlatformAccountById, updatePlatformAccount } from "@/lib/db/queries/platform-accounts";
import { refreshLinkedInTokenAsync } from "@/lib/platforms/linkedin/auth";
import { checkRateLimit, updateRateLimitFromHeaders, RateLimitError } from "@/lib/platforms/rate-limiter";
import type { PlatformCredentials } from "@/lib/platforms/adapter";

// --- LinkedIn API Types ---

export interface LinkedInProfile {
  id: string;
  localizedFirstName: string;
  localizedLastName: string;
  localizedHeadline?: string;
  vanityName?: string;
  profilePicture?: {
    displayImage?: string;
    "displayImage~"?: {
      elements?: Array<{
        identifiers?: Array<{
          identifier: string;
        }>;
      }>;
    };
  };
}

export interface LinkedInEmail {
  elements?: Array<{
    "handle~"?: {
      emailAddress: string;
    };
  }>;
}

export interface LinkedInConnection {
  id: string;
  localizedFirstName?: string;
  localizedLastName?: string;
  localizedHeadline?: string;
  vanityName?: string;
  profilePicture?: LinkedInProfile["profilePicture"];
}

export interface LinkedInApiResponse<T> {
  data: T;
}

// --- Constants ---

const LINKEDIN_API_BASE = "https://api.linkedin.com/v2";

// --- Error Classes ---

export class LinkedInApiRequestError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
    this.name = "LinkedInApiRequestError";
  }
}

// --- Core Fetch ---

/** Get decrypted credentials for a LinkedIn account. */
function getCredentials(accountId: string): PlatformCredentials {
  const account = getPlatformAccountById(accountId);
  if (!account?.credentialsEncrypted) {
    throw new Error("No credentials found for LinkedIn account");
  }
  return JSON.parse(decrypt(account.credentialsEncrypted));
}

/**
 * Authenticated fetch for LinkedIn API v2 endpoints.
 * Handles token refresh, rate limit tracking, and error standardization.
 */
export async function linkedInApiFetch<T>(
  accountId: string,
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  // Derive endpoint pattern for rate limiting
  const endpointPattern = endpoint.split("?")[0].replace(/\/\d+/g, "/:id");

  // Check rate limit before making the request
  const rateCheck = checkRateLimit(accountId, endpointPattern);
  if (!rateCheck.allowed) {
    throw new RateLimitError(endpointPattern, rateCheck.retryAfter!);
  }

  let creds = getCredentials(accountId);
  const now = Math.floor(Date.now() / 1000);

  // LinkedIn tokens last 60 days — refresh if within 5 days of expiry
  const FIVE_DAYS = 5 * 24 * 60 * 60;
  if (creds.expiresAt - now < FIVE_DAYS) {
    creds = await refreshLinkedInTokenAsync(accountId);
  }

  const url = endpoint.startsWith("http") ? endpoint : `${LINKEDIN_API_BASE}${endpoint}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${creds.accessToken}`,
      ...options.headers,
    },
  });

  // Update rate limit state from response headers (LinkedIn uses same X-RateLimit-* pattern)
  updateRateLimitFromHeaders(accountId, endpointPattern, res.headers);

  if (res.status === 401) {
    // Try one token refresh
    creds = await refreshLinkedInTokenAsync(accountId);
    const retryRes = await fetch(url, {
      ...options,
      headers: {
        Authorization: `Bearer ${creds.accessToken}`,
        ...options.headers,
      },
    });

    updateRateLimitFromHeaders(accountId, endpointPattern, retryRes.headers);

    if (!retryRes.ok) {
      const err = await retryRes.json().catch(() => ({ message: retryRes.statusText }));
      throw new LinkedInApiRequestError(retryRes.status, err.message || "Request failed");
    }

    return retryRes.json();
  }

  if (res.status === 429) {
    const resetHeader = res.headers.get("x-rate-limit-reset");
    const retryAfter = resetHeader ? parseInt(resetHeader) - now : 60;
    throw new RateLimitError(endpointPattern, retryAfter);
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new LinkedInApiRequestError(res.status, err.message || err.error || "Request failed");
  }

  return res.json();
}

// --- Endpoint Functions ---

/** Fetch the authenticated user's LinkedIn profile. */
export async function getAuthenticatedProfile(accountId: string): Promise<LinkedInProfile> {
  return linkedInApiFetch<LinkedInProfile>(
    accountId,
    "/me?projection=(id,localizedFirstName,localizedLastName,localizedHeadline,vanityName,profilePicture(displayImage~:playableStreams))"
  );
}

/** Fetch the authenticated user's email address. */
export async function getAuthenticatedEmail(accountId: string): Promise<string | null> {
  const data = await linkedInApiFetch<LinkedInEmail>(
    accountId,
    "/emailAddress?q=members&projection=(elements*(handle~))"
  );

  return data.elements?.[0]?.["handle~"]?.emailAddress ?? null;
}

/** Fetch the user's connections (offset-based pagination). */
export async function getConnections(
  accountId: string,
  opts?: { start?: number; count?: number }
): Promise<{ elements: LinkedInConnection[]; paging: { start: number; count: number; total: number } }> {
  const start = opts?.start ?? 0;
  const count = opts?.count ?? 50;

  return linkedInApiFetch(
    accountId,
    `/connections?q=viewer&start=${start}&count=${count}&projection=(elements*(id,localizedFirstName,localizedLastName,localizedHeadline,vanityName,profilePicture(displayImage~:playableStreams)),paging)`
  );
}
