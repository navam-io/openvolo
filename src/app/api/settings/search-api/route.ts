import { NextRequest, NextResponse } from "next/server";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";
import { homedir } from "os";
import { encrypt, decrypt } from "@/lib/auth/crypto";

const dataDir =
  process.env.OPENVOLO_DATA_DIR?.replace("~", homedir()) ??
  join(homedir(), ".openvolo");
const configPath = join(dataDir, "config.json");

function readConfig(): Record<string, unknown> {
  if (!existsSync(configPath)) return {};
  return JSON.parse(readFileSync(configPath, "utf-8"));
}

function writeConfig(config: Record<string, unknown>) {
  writeFileSync(configPath, JSON.stringify(config, null, 2), "utf-8");
}

/**
 * GET /api/settings/search-api
 * Check if Brave Search API key is configured.
 */
export async function GET() {
  // Check env var first
  if (process.env.BRAVE_SEARCH_API_KEY) {
    const key = process.env.BRAVE_SEARCH_API_KEY;
    return NextResponse.json({
      configured: true,
      source: "env_var",
      keyPrefix: key.slice(0, 8) + "...****",
    });
  }

  const config = readConfig();
  if (config.braveSearchApiKey) {
    try {
      const key = decrypt(config.braveSearchApiKey as string);
      return NextResponse.json({
        configured: true,
        source: "config",
        keyPrefix: key.slice(0, 8) + "...****",
      });
    } catch {
      return NextResponse.json({ configured: false, source: "none", keyPrefix: null });
    }
  }

  return NextResponse.json({ configured: false, source: "none", keyPrefix: null });
}

/**
 * POST /api/settings/search-api
 * Save or clear the Brave Search API key.
 */
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { action, apiKey } = body;

  if (action === "save_key") {
    if (!apiKey || typeof apiKey !== "string") {
      return NextResponse.json({ error: "API key is required" }, { status: 400 });
    }

    // Validate by making a test request
    try {
      const res = await fetch(
        `https://api.search.brave.com/res/v1/web/search?q=test&count=1`,
        {
          headers: {
            Accept: "application/json",
            "X-Subscription-Token": apiKey,
          },
        }
      );

      if (res.status === 401 || res.status === 403) {
        return NextResponse.json(
          { error: "Invalid API key — authentication failed" },
          { status: 400 }
        );
      }

      if (!res.ok) {
        return NextResponse.json(
          { error: `Brave API returned ${res.status}` },
          { status: 400 }
        );
      }
    } catch {
      return NextResponse.json(
        { error: "Could not reach Brave Search API" },
        { status: 400 }
      );
    }

    const config = readConfig();
    config.braveSearchApiKey = encrypt(apiKey);
    writeConfig(config);

    return NextResponse.json({ success: true });
  }

  if (action === "clear_key") {
    const config = readConfig();
    delete config.braveSearchApiKey;
    writeConfig(config);
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
