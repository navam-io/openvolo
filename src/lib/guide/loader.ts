import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { getGuideMeta } from "@/lib/guide/registry";
import type { GuideMeta } from "@/lib/guide/types";

/** Read the markdown content for a guide by slug. */
export function getGuideContent(
  slug: string,
): { meta: GuideMeta; content: string } | null {
  const meta = getGuideMeta(slug);
  if (!meta) return null;

  const filePath = join(process.cwd(), "guide", meta.filename);
  if (!existsSync(filePath)) return null;

  const content = readFileSync(filePath, "utf-8");
  return { meta, content };
}
