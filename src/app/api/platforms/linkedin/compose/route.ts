import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getPlatformAccountByPlatform } from "@/lib/db/queries/platform-accounts";
import { createContentItem, updateContentItem, getContentItem } from "@/lib/db/queries/content";
import { linkMediaToContent } from "@/lib/db/queries/media";

const composeSchema = z.object({
  tweets: z.array(z.string().min(1).max(3000)).min(1).max(1),
  saveAsDraft: z.boolean().optional(),
  draftId: z.string().optional(),
  platformTarget: z.literal("linkedin").optional(),
  mediaAssetIds: z.array(z.array(z.string())).optional(),
});

/**
 * POST /api/platforms/linkedin/compose
 * Save LinkedIn posts as drafts. Publishing deferred to Phase 6B (browser publishing).
 */
export async function POST(req: NextRequest) {
  try {
    const account = getPlatformAccountByPlatform("linkedin");
    if (!account) {
      return NextResponse.json({ error: "No LinkedIn account connected" }, { status: 400 });
    }

    const body = await req.json();
    const { tweets, draftId, mediaAssetIds } = composeSchema.parse(body);

    // LinkedIn only supports draft saving for now
    if (draftId) {
      const existing = getContentItem(draftId);
      if (existing) {
        const updated = updateContentItem(draftId, {
          body: tweets[0],
          contentType: "post",
        });
        // Link media assets
        if (mediaAssetIds?.[0]) {
          for (const assetId of mediaAssetIds[0]) {
            linkMediaToContent(assetId, draftId);
          }
        }
        return NextResponse.json({ success: true, draft: true, items: updated ? [updated] : [] });
      }
    }

    const item = createContentItem({
      body: tweets[0],
      contentType: "post",
      status: "draft",
      origin: "authored",
      direction: "outbound",
      platformAccountId: account.id,
      platformTarget: "linkedin",
    });

    // Link media assets to the new content item
    if (mediaAssetIds?.[0]) {
      for (const assetId of mediaAssetIds[0]) {
        linkMediaToContent(assetId, item.id);
      }
    }

    return NextResponse.json({ success: true, draft: true, items: [item] });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    const message = error instanceof Error ? error.message : "Compose failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
