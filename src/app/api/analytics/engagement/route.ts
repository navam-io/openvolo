import { NextRequest, NextResponse } from "next/server";
import { parseSinceFromRange } from "@/lib/analytics/utils";
import {
  getEngagementVolume,
  getEngagementDirectionSummary,
  getEngagementTypeBreakdown,
  getTopEngagedContacts,
} from "@/lib/db/queries/analytics";

/**
 * GET /api/analytics/engagement?range=30d
 * Returns engagement volume, direction summary, breakdown, and top contacts.
 */
export async function GET(req: NextRequest) {
  const range = req.nextUrl.searchParams.get("range");
  const since = parseSinceFromRange(range);

  return NextResponse.json({
    volume: getEngagementVolume(since),
    directionSummary: getEngagementDirectionSummary(since),
    typeBreakdown: getEngagementTypeBreakdown(since),
    topContacts: getTopEngagedContacts(since),
  });
}
