import { NextRequest, NextResponse } from "next/server";
import {
  hasSession,
  loadSession,
  clearSession,
  setupSession,
  validateSession,
} from "@/lib/browser/session";

/**
 * POST /api/platforms/x/browser-session
 * Manage browser session for X.
 * Body: { action: "setup" | "validate" }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const action = body.action || "setup";

    switch (action) {
      case "setup": {
        // Launch headed browser for manual login
        const session = await setupSession("x");
        return NextResponse.json({
          status: "session_created",
          createdAt: session.createdAt,
        });
      }

      case "validate": {
        const isValid = await validateSession("x");
        return NextResponse.json({
          status: isValid ? "valid" : "invalid",
          isValid,
        });
      }

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Browser session operation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * GET /api/platforms/x/browser-session
 * Check browser session status.
 */
export async function GET() {
  const exists = hasSession("x");

  if (!exists) {
    return NextResponse.json({
      hasSession: false,
    });
  }

  const session = loadSession("x");
  return NextResponse.json({
    hasSession: true,
    lastValidatedAt: session?.lastValidatedAt ?? null,
    createdAt: session?.createdAt ?? null,
  });
}

/**
 * DELETE /api/platforms/x/browser-session
 * Clear stored browser session.
 */
export async function DELETE() {
  clearSession("x");
  return NextResponse.json({ status: "cleared" });
}
