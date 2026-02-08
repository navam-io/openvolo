import { NextRequest, NextResponse } from "next/server";
import { getPlatformAccountByPlatform } from "@/lib/db/queries/platform-accounts";
import { listSyncCursors } from "@/lib/db/queries/sync";
import { syncContactsFromGmail } from "@/lib/platforms/sync-gmail-contacts";
import { syncGmailMetadata } from "@/lib/platforms/sync-gmail-metadata";

/**
 * POST /api/platforms/gmail/sync
 * Trigger a sync from Gmail/Google.
 * Body: { type: "contacts" | "metadata" }
 */
export async function POST(req: NextRequest) {
  try {
    const account = getPlatformAccountByPlatform("gmail");
    if (!account) {
      return NextResponse.json(
        { error: "No Gmail account connected" },
        { status: 400 }
      );
    }

    if (account.status === "needs_reauth") {
      return NextResponse.json(
        { error: "Gmail account needs re-authentication" },
        { status: 401 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const syncType = body.type || "contacts";

    switch (syncType) {
      case "metadata": {
        const result = await syncGmailMetadata(account.id, {
          maxContacts: body.maxContacts ?? 50,
        });
        return NextResponse.json({ success: true, result });
      }
      case "contacts":
      default: {
        const result = await syncContactsFromGmail(account.id, {
          maxPages: body.maxPages ?? 10,
        });
        return NextResponse.json({ success: true, result });
      }
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Sync failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * GET /api/platforms/gmail/sync
 * Get sync status for the Gmail account.
 */
export async function GET() {
  const account = getPlatformAccountByPlatform("gmail");
  if (!account) {
    return NextResponse.json({ synced: false });
  }

  // Get sync cursors for detailed per-type status
  const cursors = listSyncCursors(account.id);
  const cursorMap: Record<string, {
    status: string;
    totalSynced: number;
    lastSyncedAt: number | null;
    lastError: string | null;
  }> = {};

  for (const c of cursors) {
    cursorMap[c.dataType] = {
      status: c.syncStatus,
      totalSynced: c.totalItemsSynced,
      lastSyncedAt: c.lastSyncCompletedAt,
      lastError: c.lastError,
    };
  }

  return NextResponse.json({
    synced: !!account.lastSyncedAt,
    lastSyncedAt: account.lastSyncedAt,
    status: account.status,
    cursors: cursorMap,
  });
}
