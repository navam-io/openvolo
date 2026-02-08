import { NextRequest, NextResponse } from "next/server";
import { getPlatformAccountByPlatform } from "@/lib/db/queries/platform-accounts";
import { listSyncCursors } from "@/lib/db/queries/sync";
import { syncContactsFromLinkedIn } from "@/lib/platforms/sync-linkedin-contacts";
import { runSyncWorkflow } from "@/lib/workflows/run-sync-workflow";

/**
 * POST /api/platforms/linkedin/sync
 * Trigger a sync from LinkedIn.
 * Body: { type: "contacts" }
 */
export async function POST(req: NextRequest) {
  try {
    const account = getPlatformAccountByPlatform("linkedin");
    if (!account) {
      return NextResponse.json(
        { error: "No LinkedIn account connected" },
        { status: 400 }
      );
    }

    if (account.status === "needs_reauth") {
      return NextResponse.json(
        { error: "LinkedIn account needs re-authentication" },
        { status: 401 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const syncType = body.type || "contacts";

    switch (syncType) {
      case "contacts":
      default: {
        const maxPages = body.maxPages ?? 10;
        const { workflowRun, syncResult } = await runSyncWorkflow({
          workflowType: "sync",
          syncSubType: "linkedin_contacts",
          platformAccountId: account.id,
          syncFunction: () => syncContactsFromLinkedIn(account.id, { maxPages }),
        });
        return NextResponse.json({ success: true, result: syncResult, workflowRunId: workflowRun.id });
      }
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Sync failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * GET /api/platforms/linkedin/sync
 * Get sync status for the LinkedIn account.
 */
export async function GET() {
  const account = getPlatformAccountByPlatform("linkedin");
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
