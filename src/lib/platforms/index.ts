import type { PlatformAdapter } from "@/lib/platforms/adapter";

/** Factory function — returns the adapter for a given platform. */
export function getPlatformAdapter(platform: string): PlatformAdapter {
  switch (platform) {
    case "x": {
      // Lazy import to avoid loading X-specific code for other platforms
      const { XPlatformAdapter } = require("@/lib/platforms/x/adapter");
      return new XPlatformAdapter();
    }
    case "linkedin": {
      const { LinkedInPlatformAdapter } = require("@/lib/platforms/linkedin/adapter");
      return new LinkedInPlatformAdapter();
    }
    default:
      throw new Error(`Platform "${platform}" is not yet supported`);
  }
}
