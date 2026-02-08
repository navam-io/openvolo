import { NextRequest, NextResponse } from "next/server";
import { getPlatformAccountByPlatform } from "@/lib/db/queries/platform-accounts";
import { listSyncCursors } from "@/lib/db/queries/sync";
import { hasSession } from "@/lib/browser/session";
import { syncXProfiles } from "@/lib/platforms/sync-x-profiles";
import { runSyncWorkflow } from "@/lib/workflows/run-sync-workflow";

/**
 * POST /api/platforms/x/enrich
 * Trigger browser-based profile enrichment for X contacts.
 * Body: { contactIds?: string[], maxProfiles?: number }
 */
export async function POST(req: NextRequest) {
  try {
    const account = getPlatformAccountByPlatform("x");
    if (!account) {
      return NextResponse.json(
        { error: "No X platform account found" },
        { status: 400 }
      );
    }

    if (!hasSession("x")) {
      return NextResponse.json(
        { error: "No browser session configured. Set up in Settings." },
        { status: 400 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const maxProfiles = body.maxProfiles ?? 15;

    const { workflowRun, syncResult } = await runSyncWorkflow({
      workflowType: "enrich",
      syncSubType: "x_enrich",
      platformAccountId: account.id,
      syncFunction: () =>
        syncXProfiles(account.id, {
          contactIds: body.contactIds,
          maxProfiles,
        }),
    });

    return NextResponse.json({ success: true, result: syncResult, workflowRunId: workflowRun.id });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Enrichment failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * GET /api/platforms/x/enrich
 * Get enrichment sync status.
 */
export async function GET() {
  const account = getPlatformAccountByPlatform("x");
  if (!account) {
    return NextResponse.json({ configured: false });
  }

  const hasBrowserSession = hasSession("x");

  // Find the x_profiles sync cursor if it exists
  const cursors = listSyncCursors(account.id);
  const enrichCursor = cursors.find((c) => c.dataType === "x_profiles");

  return NextResponse.json({
    configured: true,
    hasBrowserSession,
    enrichment: enrichCursor
      ? {
          status: enrichCursor.syncStatus,
          totalEnriched: enrichCursor.totalItemsSynced,
          lastEnrichedAt: enrichCursor.lastSyncCompletedAt,
          lastError: enrichCursor.lastError,
        }
      : null,
  });
}
