import { NextRequest, NextResponse } from "next/server";
import { parseSinceFromRange } from "@/lib/analytics/utils";
import {
  getContentPublishedOverTime,
  getTopPostsByEngagement,
  getContentTypeDistribution,
  getAverageEngagementMetrics,
} from "@/lib/db/queries/analytics";

/**
 * GET /api/analytics/content?range=30d
 * Returns content publishing and engagement data.
 */
export async function GET(req: NextRequest) {
  const range = req.nextUrl.searchParams.get("range");
  const since = parseSinceFromRange(range);

  return NextResponse.json({
    publishedOverTime: getContentPublishedOverTime(since),
    topPosts: getTopPostsByEngagement(),
    typeDistribution: getContentTypeDistribution(),
    avgMetrics: getAverageEngagementMetrics(since),
  });
}
