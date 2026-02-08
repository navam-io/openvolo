import { NextResponse } from "next/server";
import { getPlatformAccountByPlatform } from "@/lib/db/queries/platform-accounts";
import { disconnectGmailAccount } from "@/lib/platforms/gmail/auth";
import { decrypt } from "@/lib/auth/crypto";
import type { PlatformCredentials } from "@/lib/platforms/adapter";

/**
 * GET /api/platforms/gmail
 * Check Gmail connection status including granted scopes.
 */
export async function GET() {
  const account = getPlatformAccountByPlatform("gmail");

  if (!account) {
    return NextResponse.json({ connected: false });
  }

  // Extract granted scopes from encrypted credentials
  let grantedScopes = "";
  if (account.credentialsEncrypted) {
    try {
      const creds: PlatformCredentials = JSON.parse(decrypt(account.credentialsEncrypted));
      grantedScopes = creds.grantedScopes ?? "";
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
    },
  });
}

/**
 * DELETE /api/platforms/gmail
 * Disconnect Gmail account (revoke token + delete platform account row).
 */
export async function DELETE() {
  const account = getPlatformAccountByPlatform("gmail");

  if (!account) {
    return NextResponse.json({ error: "No Gmail account connected" }, { status: 404 });
  }

  try {
    await disconnectGmailAccount(account.id);
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Disconnect failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
