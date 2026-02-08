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

interface ProviderStatus {
  configured: boolean;
  source: "env_var" | "config" | "none";
  keyPrefix: string | null;
}

function getBraveStatus(): ProviderStatus {
  if (process.env.BRAVE_SEARCH_API_KEY) {
    const key = process.env.BRAVE_SEARCH_API_KEY;
    return { configured: true, source: "env_var", keyPrefix: key.slice(0, 8) + "...****" };
  }
  const config = readConfig();
  if (config.braveSearchApiKey) {
    try {
      const key = decrypt(config.braveSearchApiKey as string);
      return { configured: true, source: "config", keyPrefix: key.slice(0, 8) + "...****" };
    } catch {
      return { configured: false, source: "none", keyPrefix: null };
    }
  }
  return { configured: false, source: "none", keyPrefix: null };
}

function getTavilyStatus(): ProviderStatus {
  if (process.env.TAVILY_API_KEY) {
    const key = process.env.TAVILY_API_KEY;
    return { configured: true, source: "env_var", keyPrefix: key.slice(0, 8) + "...****" };
  }
  const config = readConfig();
  if (config.tavilyApiKey) {
    try {
      const key = decrypt(config.tavilyApiKey as string);
      return { configured: true, source: "config", keyPrefix: key.slice(0, 8) + "...****" };
    } catch {
      return { configured: false, source: "none", keyPrefix: null };
    }
  }
  return { configured: false, source: "none", keyPrefix: null };
}

/**
 * GET /api/settings/search-api
 * Check configuration status for both Brave and Tavily search providers.
 */
export async function GET() {
  const brave = getBraveStatus();
  const tavily = getTavilyStatus();

  return NextResponse.json({
    configured: brave.configured || tavily.configured,
    brave,
    tavily,
  });
}

/**
 * POST /api/settings/search-api
 * Save or clear a search API key. Accepts `provider` field ("brave" | "tavily").
 * Defaults to "brave" for backward compatibility.
 */
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { action, apiKey, provider: rawProvider } = body;
  const provider = rawProvider ?? "brave";

  if (provider !== "brave" && provider !== "tavily") {
    return NextResponse.json({ error: "Invalid provider" }, { status: 400 });
  }

  if (action === "save_key") {
    if (!apiKey || typeof apiKey !== "string") {
      return NextResponse.json({ error: "API key is required" }, { status: 400 });
    }

    // Validate by making a test request
    if (provider === "brave") {
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
    } else {
      // Tavily validation
      try {
        const res = await fetch("https://api.tavily.com/search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ api_key: apiKey, query: "test", max_results: 1 }),
        });

        if (res.status === 401 || res.status === 403) {
          return NextResponse.json(
            { error: "Invalid API key — authentication failed" },
            { status: 400 }
          );
        }

        if (!res.ok) {
          return NextResponse.json(
            { error: `Tavily API returned ${res.status}` },
            { status: 400 }
          );
        }
      } catch {
        return NextResponse.json(
          { error: "Could not reach Tavily Search API" },
          { status: 400 }
        );
      }

      const config = readConfig();
      config.tavilyApiKey = encrypt(apiKey);
      writeConfig(config);
    }

    return NextResponse.json({ success: true });
  }

  if (action === "clear_key") {
    const config = readConfig();
    if (provider === "brave") {
      delete config.braveSearchApiKey;
    } else {
      delete config.tavilyApiKey;
    }
    writeConfig(config);
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
