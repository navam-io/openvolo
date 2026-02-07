import { NextRequest, NextResponse } from "next/server";
import { getPlatformAccountByPlatform } from "@/lib/db/queries/platform-accounts";
import { syncContactsFromPlatform } from "@/lib/platforms/sync-contacts";
import { TierRestrictedError } from "@/lib/platforms/x/client";
import { decrypt } from "@/lib/auth/crypto";
import type { PlatformCredentials } from "@/lib/platforms/adapter";

/**
 * POST /api/platforms/x/sync
 * Trigger a contact sync from X (imports following list).
 * Requires follows.read scope (Basic+ tier).
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

    // Check if the account has follows.read scope
    if (account.credentialsEncrypted) {
      try {
        const creds: PlatformCredentials = JSON.parse(decrypt(account.credentialsEncrypted));
        if (!creds.grantedScopes?.includes("follows.read")) {
          return NextResponse.json(
            {
              error: "Contact sync requires the follows.read scope. Click \"Enable Contact Sync\" to upgrade permissions (requires X API Basic tier, $200/mo).",
              code: "TIER_RESTRICTED",
            },
            { status: 403 }
          );
        }
      } catch {
        // If we can't read credentials, let the sync attempt proceed and fail naturally
      }
    }

    const body = await req.json().catch(() => ({}));
    const maxPages = body.type === "delta" ? 2 : 10;

    const result = await syncContactsFromPlatform(account.id, { maxPages });

    return NextResponse.json({
      success: true,
      result,
    });
  } catch (error) {
    if (error instanceof TierRestrictedError) {
      return NextResponse.json(
        {
          error: "Contact sync requires X API Basic tier ($200/mo). Your current plan doesn't include access to the follows endpoint.",
          code: "TIER_RESTRICTED",
        },
        { status: 403 }
      );
    }
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
