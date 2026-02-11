import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getPlatformAccountByPlatform } from "@/lib/db/queries/platform-accounts";
import { createContentItem, updateContentItem, getContentItem } from "@/lib/db/queries/content";

const composeSchema = z.object({
  tweets: z.array(z.string().min(1).max(3000)).min(1).max(1),
  saveAsDraft: z.boolean().optional(),
  draftId: z.string().optional(),
  platformTarget: z.literal("linkedin").optional(),
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
    const { tweets, draftId } = composeSchema.parse(body);

    // LinkedIn only supports draft saving for now
    if (draftId) {
      const existing = getContentItem(draftId);
      if (existing) {
        const updated = updateContentItem(draftId, {
          body: tweets[0],
          contentType: "post",
        });
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

    return NextResponse.json({ success: true, draft: true, items: [item] });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    const message = error instanceof Error ? error.message : "Compose failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
