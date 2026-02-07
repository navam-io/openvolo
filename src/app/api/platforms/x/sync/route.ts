import { NextRequest, NextResponse } from "next/server";
import { getPlatformAccountByPlatform } from "@/lib/db/queries/platform-accounts";
import { syncContactsFromPlatform } from "@/lib/platforms/sync-contacts";

/**
 * POST /api/platforms/x/sync
 * Trigger a contact sync from X (imports following list).
 */
export async function POST(req: NextRequest) {
  try {
    const account = getPlatformAccountByPlatform("x");
    if (!account) {
      return NextResponse.json(
        { error: "No X account connected" },
        { status: 400 }
      );
    }

    if (account.status === "needs_reauth") {
      return NextResponse.json(
        { error: "X account needs re-authentication" },
        { status: 401 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const maxPages = body.type === "delta" ? 2 : 10;

    const result = await syncContactsFromPlatform(account.id, { maxPages });

    return NextResponse.json({
      success: true,
      result,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Sync failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * GET /api/platforms/x/sync
 * Get sync status/stats for the X account.
 */
export async function GET() {
  const account = getPlatformAccountByPlatform("x");
  if (!account) {
    return NextResponse.json({ synced: false });
  }

  return NextResponse.json({
    synced: !!account.lastSyncedAt,
    lastSyncedAt: account.lastSyncedAt,
    status: account.status,
  });
}
