import { nanoid } from "nanoid";
import { db } from "@/lib/db/client";
import { contentItems, contentPosts, engagementMetrics } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { getContentPostByPlatformId } from "@/lib/db/queries/content";
import { getSyncCursor, updateSyncCursor } from "@/lib/db/queries/sync";
import { updatePlatformAccount } from "@/lib/db/queries/platform-accounts";
import { getAuthenticatedUser, getUserTweets, getUserMentions } from "@/lib/platforms/x/client";
import { mapXTweetToContentItem, mapXTweetToContentPost, extractTweetMetrics } from "@/lib/platforms/x/mappers";
import type { XTweet } from "@/lib/platforms/x/client";
import type { SyncResult } from "@/lib/platforms/adapter";

interface ContentSyncResult extends SyncResult {
  /** Total items processed (including skipped). */
  total: number;
}

/**
 * Sync tweets from the authenticated user's timeline.
 * Deduplicates by platformPostId on the content_posts table.
 * Uses sync_cursors for pagination state.
 */
export async function syncTweetsFromX(
  accountId: string,
  opts?: { maxPages?: number }
): Promise<ContentSyncResult> {
  const result: ContentSyncResult = { added: 0, updated: 0, skipped: 0, errors: [], total: 0 };
  const maxPages = opts?.maxPages ?? 5;

  const cursor = getSyncCursor(accountId, "tweets");
  updateSyncCursor(cursor.id, {
    syncStatus: "syncing",
    lastSyncStartedAt: Math.floor(Date.now() / 1000),
  });

  try {
    const me = await getAuthenticatedUser(accountId);
    let paginationToken: string | undefined = cursor.cursor ?? undefined;
    let page = 0;

    while (page < maxPages) {
      const res = await getUserTweets(accountId, me.id, {
        maxResults: 10,
        paginationToken,
      });

      const tweets = Array.isArray(res.data) ? res.data : [];
      if (tweets.length === 0) break;

      for (const tweet of tweets) {
        try {
          const wasAdded = processTweet(tweet, accountId, "authored");
          if (wasAdded) {
            result.added++;
          } else {
            result.skipped++;
          }
          result.total++;
        } catch (err) {
          result.errors.push(
            `Failed to process tweet ${tweet.id}: ${err instanceof Error ? err.message : String(err)}`
          );
        }
      }

      // Update cursor with pagination token
      paginationToken = res.meta?.next_token ?? undefined;
      updateSyncCursor(cursor.id, {
        cursor: paginationToken ?? null,
        totalItemsSynced: cursor.totalItemsSynced + result.added,
        syncProgress: JSON.stringify({
          current: result.total,
          message: `Imported ${result.added} tweets`,
        }),
      });

      if (!paginationToken) break;
      page++;
    }

    updateSyncCursor(cursor.id, {
      syncStatus: "completed",
      lastSyncCompletedAt: Math.floor(Date.now() / 1000),
      totalItemsSynced: cursor.totalItemsSynced + result.added,
    });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    result.errors.push(`Tweet sync failed: ${errorMessage}`);
    updateSyncCursor(cursor.id, {
      syncStatus: result.added > 0 ? "completed" : "failed",
      lastSyncCompletedAt: Math.floor(Date.now() / 1000),
      totalItemsSynced: cursor.totalItemsSynced + result.added,
      lastError: errorMessage,
    });
  }

  // Update account last synced time
  updatePlatformAccount(accountId, {
    lastSyncedAt: Math.floor(Date.now() / 1000),
  });

  return result;
}

/**
 * Sync mentions of the authenticated user.
 * Mentions are treated as "received" content.
 */
export async function syncMentionsFromX(
  accountId: string,
  opts?: { maxPages?: number }
): Promise<ContentSyncResult> {
  const result: ContentSyncResult = { added: 0, updated: 0, skipped: 0, errors: [], total: 0 };
  const maxPages = opts?.maxPages ?? 5;

  const cursor = getSyncCursor(accountId, "mentions");
  updateSyncCursor(cursor.id, {
    syncStatus: "syncing",
    lastSyncStartedAt: Math.floor(Date.now() / 1000),
  });

  try {
    const me = await getAuthenticatedUser(accountId);
    let paginationToken: string | undefined = cursor.cursor ?? undefined;
    let page = 0;

    while (page < maxPages) {
      const res = await getUserMentions(accountId, me.id, {
        maxResults: 10,
        paginationToken,
      });

      const mentions = Array.isArray(res.data) ? res.data : [];
      if (mentions.length === 0) break;

      for (const mention of mentions) {
        try {
          const wasAdded = processTweet(mention, accountId, "received");
          if (wasAdded) {
            result.added++;
          } else {
            result.skipped++;
          }
          result.total++;
        } catch (err) {
          result.errors.push(
            `Failed to process mention ${mention.id}: ${err instanceof Error ? err.message : String(err)}`
          );
        }
      }

      paginationToken = res.meta?.next_token ?? undefined;
      updateSyncCursor(cursor.id, {
        cursor: paginationToken ?? null,
        totalItemsSynced: cursor.totalItemsSynced + result.added,
        syncProgress: JSON.stringify({
          current: result.total,
          message: `Imported ${result.added} mentions`,
        }),
      });

      if (!paginationToken) break;
      page++;
    }

    updateSyncCursor(cursor.id, {
      syncStatus: "completed",
      lastSyncCompletedAt: Math.floor(Date.now() / 1000),
      totalItemsSynced: cursor.totalItemsSynced + result.added,
    });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    result.errors.push(`Mention sync failed: ${errorMessage}`);
    updateSyncCursor(cursor.id, {
      syncStatus: result.added > 0 ? "completed" : "failed",
      lastSyncCompletedAt: Math.floor(Date.now() / 1000),
      totalItemsSynced: cursor.totalItemsSynced + result.added,
      lastError: errorMessage,
    });
  }

  updatePlatformAccount(accountId, {
    lastSyncedAt: Math.floor(Date.now() / 1000),
  });

  return result;
}

/**
 * Process a single tweet/mention — create content_item + content_post + metrics.
 * Returns true if added, false if skipped (already exists).
 */
function processTweet(
  tweet: XTweet,
  accountId: string,
  origin: "authored" | "received"
): boolean {
  // Dedup check: does this tweet already exist?
  const existingPost = getContentPostByPlatformId(tweet.id, accountId);
  if (existingPost) return false;

  // Create content item
  const itemData = mapXTweetToContentItem(tweet, accountId, origin);
  const itemId = nanoid();
  db.insert(contentItems).values({ ...itemData, id: itemId }).run();

  // Create content post (published instance)
  const postData = mapXTweetToContentPost(tweet, accountId);
  const postId = nanoid();
  db.insert(contentPosts)
    .values({ ...postData, id: postId, contentItemId: itemId })
    .run();

  // Store engagement metrics snapshot
  const metrics = extractTweetMetrics(tweet);
  db.insert(engagementMetrics)
    .values({
      id: nanoid(),
      contentPostId: postId,
      ...metrics,
    })
    .run();

  return true;
}
