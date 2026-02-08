import { decrypt } from "@/lib/auth/crypto";
import { getPlatformAccountById, updatePlatformAccount } from "@/lib/db/queries/platform-accounts";
import { refreshGmailTokenAsync } from "@/lib/platforms/gmail/auth";
import { checkRateLimit, updateRateLimitFromHeaders, RateLimitError } from "@/lib/platforms/rate-limiter";
import type { PlatformCredentials } from "@/lib/platforms/adapter";

// --- Google API Types ---

/** Google People API person resource. */
export interface GooglePerson {
  resourceName: string; // e.g. "people/c123456"
  etag?: string;
  names?: Array<{
    displayName?: string;
    familyName?: string;
    givenName?: string;
    metadata?: { primary?: boolean };
  }>;
  emailAddresses?: Array<{
    value?: string;
    type?: string;
    metadata?: { primary?: boolean };
  }>;
  phoneNumbers?: Array<{
    value?: string;
    type?: string;
    metadata?: { primary?: boolean };
  }>;
  organizations?: Array<{
    name?: string;
    title?: string;
    department?: string;
    metadata?: { primary?: boolean };
  }>;
  photos?: Array<{
    url?: string;
    default?: boolean;
    metadata?: { primary?: boolean };
  }>;
  urls?: Array<{
    value?: string;
    type?: string;
  }>;
  biographies?: Array<{
    value?: string;
    contentType?: string;
  }>;
  addresses?: Array<{
    formattedValue?: string;
    city?: string;
    region?: string;
    country?: string;
    metadata?: { primary?: boolean };
  }>;
}

/** People API connections list response. */
export interface GoogleConnectionsResponse {
  connections?: GooglePerson[];
  nextPageToken?: string;
  totalPeople?: number;
  totalItems?: number;
}

/** Google OAuth2 userinfo response. */
export interface GoogleUserInfo {
  sub: string;
  name?: string;
  given_name?: string;
  family_name?: string;
  picture?: string;
  email?: string;
  email_verified?: boolean;
}

/** Gmail message list item (minimal). */
export interface GmailMessageRef {
  id: string;
  threadId: string;
}

/** Gmail message metadata (format=metadata). */
export interface GmailMessageMetadata {
  id: string;
  threadId: string;
  internalDate: string; // unix ms as string
  payload?: {
    headers?: Array<{
      name: string;
      value: string;
    }>;
  };
}

// --- Error Classes ---

export class GoogleApiRequestError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
    this.name = "GoogleApiRequestError";
  }
}

// --- Core Fetch ---

/** Get decrypted credentials for a Gmail account. */
function getCredentials(accountId: string): PlatformCredentials {
  const account = getPlatformAccountById(accountId);
  if (!account?.credentialsEncrypted) {
    throw new Error("No credentials found for Gmail account");
  }
  return JSON.parse(decrypt(account.credentialsEncrypted));
}

/**
 * Authenticated fetch for Google API endpoints.
 * Handles token refresh on 401, rate limit handling on 429 with Retry-After header.
 */
export async function googleApiFetch<T>(
  accountId: string,
  url: string,
  options: RequestInit = {}
): Promise<T> {
  // Derive endpoint pattern for rate limiting
  const endpointPattern = new URL(url).pathname.replace(/\/[a-zA-Z0-9_-]{20,}/g, "/:id");

  // Check rate limit before making the request
  const rateCheck = checkRateLimit(accountId, endpointPattern);
  if (!rateCheck.allowed) {
    throw new RateLimitError(endpointPattern, rateCheck.retryAfter!);
  }

  let creds = getCredentials(accountId);
  const now = Math.floor(Date.now() / 1000);

  // Google tokens last ~1 hour — refresh if within 5 minutes of expiry
  const FIVE_MINUTES = 5 * 60;
  if (creds.expiresAt - now < FIVE_MINUTES) {
    creds = await refreshGmailTokenAsync(accountId);
  }

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
    creds = await refreshGmailTokenAsync(accountId);
    const retryRes = await fetch(url, {
      ...options,
      headers: {
        Authorization: `Bearer ${creds.accessToken}`,
        ...options.headers,
      },
    });

    updateRateLimitFromHeaders(accountId, endpointPattern, retryRes.headers);

    if (!retryRes.ok) {
      const err = await retryRes.json().catch(() => ({ error: { message: retryRes.statusText } }));
      throw new GoogleApiRequestError(retryRes.status, err.error?.message || "Request failed");
    }

    return retryRes.json();
  }

  if (res.status === 429) {
    const retryAfterHeader = res.headers.get("Retry-After");
    const retryAfter = retryAfterHeader ? parseInt(retryAfterHeader) : 60;
    throw new RateLimitError(endpointPattern, retryAfter);
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: { message: res.statusText } }));
    throw new GoogleApiRequestError(res.status, err.error?.message || "Request failed");
  }

  return res.json();
}

// --- Endpoint Functions ---

/** Fetch the authenticated Google user's profile. */
export async function getAuthenticatedGoogleProfile(accountId: string): Promise<GoogleUserInfo> {
  return googleApiFetch<GoogleUserInfo>(
    accountId,
    "https://www.googleapis.com/oauth2/v3/userinfo"
  );
}

/** Fetch the user's Google contacts via People API (token-based pagination). */
export async function getGoogleContacts(
  accountId: string,
  opts?: { pageToken?: string; pageSize?: number }
): Promise<GoogleConnectionsResponse> {
  const pageSize = opts?.pageSize ?? 100;
  const params = new URLSearchParams({
    personFields: "names,emailAddresses,phoneNumbers,organizations,photos,urls,biographies,addresses",
    pageSize: String(pageSize),
  });

  if (opts?.pageToken) {
    params.set("pageToken", opts.pageToken);
  }

  return googleApiFetch<GoogleConnectionsResponse>(
    accountId,
    `https://people.googleapis.com/v1/people/me/connections?${params.toString()}`
  );
}

/** Search Gmail for messages involving a contact's email address. */
export async function getGmailMessagesByContact(
  accountId: string,
  email: string,
  opts?: { maxResults?: number; query?: string }
): Promise<{ messages?: GmailMessageRef[]; resultSizeEstimate?: number }> {
  const maxResults = opts?.maxResults ?? 10;
  const baseQuery = opts?.query ?? `from:${email} OR to:${email}`;
  const params = new URLSearchParams({
    q: baseQuery,
    maxResults: String(maxResults),
  });

  return googleApiFetch(
    accountId,
    `https://gmail.googleapis.com/gmail/v1/users/me/messages?${params.toString()}`
  );
}

/** Get metadata-only details for a single Gmail message. */
export async function getGmailMessageMetadata(
  accountId: string,
  messageId: string
): Promise<GmailMessageMetadata> {
  const params = new URLSearchParams({
    format: "metadata",
    metadataHeaders: "From",
  });
  // Gmail API only allows one metadataHeaders per param — append additional
  params.append("metadataHeaders", "To");
  params.append("metadataHeaders", "Date");

  return googleApiFetch<GmailMessageMetadata>(
    accountId,
    `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}?${params.toString()}`
  );
}
