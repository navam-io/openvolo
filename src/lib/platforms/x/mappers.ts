import type { NewContact, NewContactIdentity } from "@/lib/db/types";
import type { XUser } from "@/lib/platforms/x/client";

/** Split a display name into firstName/lastName. */
function splitName(name: string): { firstName: string; lastName: string } {
  const trimmed = name.trim();
  const idx = trimmed.indexOf(" ");
  if (idx === -1) return { firstName: trimmed, lastName: "" };
  return { firstName: trimmed.slice(0, idx), lastName: trimmed.slice(idx + 1) };
}

/** Extract a clean website URL from X user entities or raw URL field. */
function extractWebsite(xUser: XUser): string | null {
  // X often wraps URLs in t.co — the raw url field may contain the expanded version
  if (xUser.url) return xUser.url;
  return null;
}

/** Map an X user profile to OpenVolo contact fields. */
export function mapXUserToContact(xUser: XUser): Omit<NewContact, "id"> {
  const { firstName, lastName } = splitName(xUser.name);

  return {
    name: xUser.name,
    firstName,
    lastName,
    bio: xUser.description || null,
    location: xUser.location || null,
    website: extractWebsite(xUser),
    photoUrl: xUser.profile_image_url?.replace("_normal", "_400x400") || null,
    platform: "x" as const,
    platformUserId: xUser.id,
    profileUrl: `https://x.com/${xUser.username}`,
    avatarUrl: xUser.profile_image_url || null,
  };
}

/** Map an X user profile to a contactIdentity row. */
export function mapXUserToIdentity(
  xUser: XUser,
  contactId: string
): Omit<NewContactIdentity, "id"> {
  return {
    contactId,
    platform: "x" as const,
    platformUserId: xUser.id,
    platformHandle: `@${xUser.username}`,
    platformUrl: `https://x.com/${xUser.username}`,
    platformData: JSON.stringify({
      followersCount: xUser.public_metrics?.followers_count ?? 0,
      followingCount: xUser.public_metrics?.following_count ?? 0,
      tweetCount: xUser.public_metrics?.tweet_count ?? 0,
      listedCount: xUser.public_metrics?.listed_count ?? 0,
      verified: xUser.verified ?? false,
      createdAt: xUser.created_at ?? null,
    }),
    isPrimary: 1,
    isActive: 1,
    lastSyncedAt: Math.floor(Date.now() / 1000),
  };
}
