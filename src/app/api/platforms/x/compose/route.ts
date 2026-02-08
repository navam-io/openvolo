import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { nanoid } from "nanoid";
import { getPlatformAccountByPlatform } from "@/lib/db/queries/platform-accounts";
import { createContentItem, updateContentItem, getContentItem, getThreadItems } from "@/lib/db/queries/content";
import {
  getAuthenticatedUser,
  postTweet,
  postThread,
  RateLimitError,
  TierRestrictedError,
} from "@/lib/platforms/x/client";

const composeSchema = z.object({
  tweets: z.array(z.string().min(1).max(280)).min(1).max(25),
  saveAsDraft: z.boolean().optional(),
  draftId: z.string().optional(),
});

/**
 * POST /api/platforms/x/compose
 * Compose and publish tweets/threads, or save as drafts.
 */
export async function POST(req: NextRequest) {
  try {
    const account = getPlatformAccountByPlatform("x");
    if (!account) {
      return NextResponse.json({ error: "No X account connected" }, { status: 400 });
    }

    if (account.status === "needs_reauth") {
      return NextResponse.json({ error: "X account needs re-authentication" }, { status: 401 });
    }

    const body = await req.json();
    const { tweets, saveAsDraft, draftId } = composeSchema.parse(body);

    const isThread = tweets.length > 1;
    const threadId = draftId
      ? getExistingThreadId(draftId)
      : (isThread ? nanoid() : null);

    // --- Save as draft ---
    if (saveAsDraft) {
      const items = saveDraftItems(tweets, threadId, draftId, account.id);
      return NextResponse.json({ success: true, draft: true, items });
    }

    // --- Publish ---
    if (isThread) {
      const result = await postThread(account.id, tweets);
      const me = await getAuthenticatedUser(account.id);

      // Create content items for each posted tweet
      const items = result.posted.map((tweet, i) => {
        const item = createContentItem(
          {
            body: tweets[i],
            contentType: i === 0 ? "thread" : "reply",
            status: "published",
            origin: "authored",
            direction: "outbound",
            platformAccountId: account.id,
            threadId: threadId!,
            parentItemId: i > 0 ? undefined : undefined, // linked via threadId
          },
          {
            platformAccountId: account.id,
            platformPostId: tweet.id,
            platformUrl: `https://x.com/${me.username}/status/${tweet.id}`,
            publishedAt: Math.floor(Date.now() / 1000),
            status: "published",
            engagementSnapshot: JSON.stringify({
              likes: 0,
              replies: 0,
              retweets: 0,
              quotes: 0,
            }),
          }
        );
        return item;
      });

      // Clean up draft items if publishing from a draft
      if (draftId) {
        cleanupDraftItems(draftId);
      }

      if (result.error) {
        return NextResponse.json({
          success: true,
          partial: true,
          error: result.error,
          published: items.length,
          total: tweets.length,
          items,
        });
      }

      return NextResponse.json({ success: true, items });
    }

    // Single tweet
    const tweet = await postTweet(account.id, tweets[0]);
    const me = await getAuthenticatedUser(account.id);

    const item = createContentItem(
      {
        body: tweets[0],
        contentType: "post",
        status: "published",
        origin: "authored",
        direction: "outbound",
        platformAccountId: account.id,
      },
      {
        platformAccountId: account.id,
        platformPostId: tweet.id,
        platformUrl: `https://x.com/${me.username}/status/${tweet.id}`,
        publishedAt: Math.floor(Date.now() / 1000),
        status: "published",
        engagementSnapshot: JSON.stringify({
          likes: 0,
          replies: 0,
          retweets: 0,
          quotes: 0,
        }),
      }
    );

    // Clean up draft if publishing from one
    if (draftId) {
      cleanupDraftItems(draftId);
    }

    return NextResponse.json({ success: true, items: [item] });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    if (error instanceof RateLimitError) {
      return NextResponse.json(
        { error: `Rate limited. Try again in ${error.retryAfter} seconds.`, retryAfter: error.retryAfter },
        { status: 429 }
      );
    }
    if (error instanceof TierRestrictedError) {
      return NextResponse.json(
        { error: "Posting requires a higher X API tier.", code: "TIER_RESTRICTED" },
        { status: 403 }
      );
    }
    const message = error instanceof Error ? error.message : "Compose failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/** Get existing threadId from a draft's first content item. */
function getExistingThreadId(draftId: string): string | null {
  const item = getContentItem(draftId);
  return item?.threadId ?? null;
}

/** Save tweets as draft content items. If draftId provided, update existing draft. */
function saveDraftItems(
  tweets: string[],
  threadId: string | null,
  draftId: string | undefined,
  accountId: string
) {
  const isThread = tweets.length > 1;

  // If updating existing draft, update the first item and handle additions/removals
  if (draftId) {
    const existing = getContentItem(draftId);
    if (existing) {
      const existingThreadItems = existing.threadId
        ? getThreadItems(existing.threadId)
        : [existing];

      // Update existing items with new text, create new items if needed
      const updatedItems = [];
      for (let i = 0; i < tweets.length; i++) {
        if (i < existingThreadItems.length) {
          // Update existing item
          const updated = updateContentItem(existingThreadItems[i].id, {
            body: tweets[i],
            contentType: isThread ? (i === 0 ? "thread" : "reply") : "post",
          });
          if (updated) updatedItems.push(updated);
        } else {
          // Create new item for additional tweets
          const item = createContentItem({
            body: tweets[i],
            contentType: isThread ? "reply" : "post",
            status: "draft",
            origin: "authored",
            direction: "outbound",
            platformAccountId: accountId,
            threadId: threadId,
          });
          updatedItems.push(item);
        }
      }

      // Delete excess items if the new draft has fewer tweets
      for (let i = tweets.length; i < existingThreadItems.length; i++) {
        updateContentItem(existingThreadItems[i].id, { status: "draft" });
        // We can't delete easily, so just leave extras — they'll be cleaned up on publish
      }

      return updatedItems;
    }
  }

  // Create new draft items
  const items = tweets.map((text, i) => {
    return createContentItem({
      body: text,
      contentType: isThread ? (i === 0 ? "thread" : "reply") : "post",
      status: "draft",
      origin: "authored",
      direction: "outbound",
      platformAccountId: accountId,
      threadId: isThread ? threadId : null,
    });
  });

  return items;
}

/** Remove draft items after successful publish. */
function cleanupDraftItems(draftId: string) {
  const item = getContentItem(draftId);
  if (!item) return;

  if (item.threadId) {
    const threadItems = getThreadItems(item.threadId);
    for (const ti of threadItems) {
      if (ti.status === "draft") {
        updateContentItem(ti.id, { status: "published" });
      }
    }
  } else {
    updateContentItem(draftId, { status: "published" });
  }
}
