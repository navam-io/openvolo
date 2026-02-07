import { NextRequest, NextResponse } from "next/server";
import { getApiKey, saveApiKey, validateApiKey, getAuthMethod, clearApiKey } from "@/lib/auth/claude-auth";

export async function GET() {
  const method = getAuthMethod();
  const hasKey = !!getApiKey();
  return NextResponse.json({ method, hasKey });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { action, apiKey } = body;

  if (action === "save_key") {
    if (!apiKey || typeof apiKey !== "string") {
      return NextResponse.json({ error: "API key is required" }, { status: 400 });
    }

    // Validate the key first
    const valid = await validateApiKey(apiKey);
    if (!valid) {
      return NextResponse.json(
        { error: "Invalid API key — could not authenticate with Anthropic" },
        { status: 400 }
      );
    }

    saveApiKey(apiKey);
    return NextResponse.json({ success: true });
  }

  if (action === "clear_key") {
    clearApiKey();
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
