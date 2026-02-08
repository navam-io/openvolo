import { NextRequest, NextResponse } from "next/server";
import { parseSinceFromRange } from "@/lib/analytics/utils";
import {
  getContactGrowth,
  getEnrichmentDistribution,
  getPlatformMix,
} from "@/lib/db/queries/analytics";

/**
 * GET /api/analytics/overview?range=30d
 * Returns contact growth, enrichment distribution, and platform mix.
 */
export async function GET(req: NextRequest) {
  const range = req.nextUrl.searchParams.get("range");
  const since = parseSinceFromRange(range);

  return NextResponse.json({
    contactGrowth: getContactGrowth(since),
    enrichmentDistribution: getEnrichmentDistribution(),
    platformMix: getPlatformMix(),
  });
}
