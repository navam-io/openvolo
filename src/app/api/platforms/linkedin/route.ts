import { NextResponse } from "next/server";
import { getPlatformAccountByPlatform } from "@/lib/db/queries/platform-accounts";
import { disconnectLinkedInAccount } from "@/lib/platforms/linkedin/auth";

/**
 * GET /api/platforms/linkedin
 * Check LinkedIn connection status.
 */
export async function GET() {
  const account = getPlatformAccountByPlatform("linkedin");

  if (!account) {
    return NextResponse.json({ connected: false });
  }

  return NextResponse.json({
    connected: true,
    account: {
      id: account.id,
      displayName: account.displayName,
      status: account.status,
      lastSyncedAt: account.lastSyncedAt,
      createdAt: account.createdAt,
    },
  });
}

/**
 * DELETE /api/platforms/linkedin
 * Disconnect LinkedIn account (delete platform account row).
 */
export async function DELETE() {
  const account = getPlatformAccountByPlatform("linkedin");

  if (!account) {
    return NextResponse.json({ error: "No LinkedIn account connected" }, { status: 404 });
  }

  try {
    await disconnectLinkedInAccount(account.id);
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Disconnect failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
