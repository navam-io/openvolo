import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";
import { homedir } from "os";
import { encrypt, decrypt } from "./crypto";

interface OpenVoloConfig {
  anthropicApiKey?: string; // encrypted
  xClientId?: string;
  xClientSecret?: string; // encrypted
  linkedinClientId?: string;
  linkedinClientSecret?: string; // encrypted
  authMethod?: "api_key" | "max_pro";
}

const dataDir = process.env.OPENVOLO_DATA_DIR?.replace("~", homedir()) ?? join(homedir(), ".openvolo");
const configPath = join(dataDir, "config.json");

function readConfig(): OpenVoloConfig {
  if (!existsSync(configPath)) return {};
  const raw = readFileSync(configPath, "utf-8");
  return JSON.parse(raw);
}

function writeConfig(config: OpenVoloConfig) {
  writeFileSync(configPath, JSON.stringify(config, null, 2), "utf-8");
}

/**
 * Save an Anthropic API key (encrypted at rest).
 */
export function saveApiKey(apiKey: string) {
  const config = readConfig();
  config.anthropicApiKey = encrypt(apiKey);
  config.authMethod = "api_key";
  writeConfig(config);
}

/**
 * Get the decrypted Anthropic API key, or null if not set.
 */
export function getApiKey(): string | null {
  // Check environment variable first
  if (process.env.ANTHROPIC_API_KEY) {
    return process.env.ANTHROPIC_API_KEY;
  }

  const config = readConfig();
  if (!config.anthropicApiKey) return null;

  try {
    return decrypt(config.anthropicApiKey);
  } catch {
    return null;
  }
}

/**
 * Validate that an API key works by making a lightweight request.
 */
export async function validateApiKey(apiKey: string): Promise<boolean> {
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 1,
        messages: [{ role: "user", content: "hi" }],
      }),
    });
    // 200 = valid key, 401 = invalid, anything else = network issue
    return res.status === 200;
  } catch {
    return false;
  }
}

/**
 * Get the current auth method.
 */
export function getAuthMethod(): "api_key" | "max_pro" | "none" {
  if (process.env.ANTHROPIC_API_KEY) return "api_key";
  const config = readConfig();
  if (config.anthropicApiKey) return config.authMethod ?? "api_key";
  return "none";
}

/**
 * Remove stored API key.
 */
export function clearApiKey() {
  const config = readConfig();
  delete config.anthropicApiKey;
  config.authMethod = undefined;
  writeConfig(config);
}
