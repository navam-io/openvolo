import { NextResponse } from "next/server";
import { getPlatformAccountByPlatform } from "@/lib/db/queries/platform-accounts";
import { disconnectXAccount } from "@/lib/platforms/x/auth";
import { decrypt } from "@/lib/auth/crypto";
import type { PlatformCredentials } from "@/lib/platforms/adapter";

/**
 * GET /api/platforms/x
 * Check X connection status including granted scopes / sync capability.
 */
export async function GET() {
  const account = getPlatformAccountByPlatform("x");

  if (!account) {
    return NextResponse.json({ connected: false });
  }

  // Determine granted scopes from encrypted credentials
  let grantedScopes = "";
  let syncCapable = false;
  if (account.credentialsEncrypted) {
    try {
      const creds: PlatformCredentials = JSON.parse(decrypt(account.credentialsEncrypted));
      grantedScopes = creds.grantedScopes ?? "";
      syncCapable = grantedScopes.includes("follows.read");
    } catch {
      // Credentials may be corrupted — don't block the status response
    }
  }

  return NextResponse.json({
    connected: true,
    account: {
      id: account.id,
      displayName: account.displayName,
      status: account.status,
      lastSyncedAt: account.lastSyncedAt,
      createdAt: account.createdAt,
      grantedScopes,
      syncCapable,
    },
  });
}

/**
 * DELETE /api/platforms/x
 * Disconnect X account (revoke tokens, delete row).
 */
export async function DELETE() {
  const account = getPlatformAccountByPlatform("x");

  if (!account) {
    return NextResponse.json({ error: "No X account connected" }, { status: 404 });
  }

  try {
    await disconnectXAccount(account.id);
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Disconnect failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
