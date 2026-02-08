import { NextRequest, NextResponse } from "next/server";
import { parseSinceFromRange } from "@/lib/analytics/utils";
import {
  getAgentCostSummary,
  getAgentCostOverTime,
  getCostByWorkflowType,
  getTokenUsageByModel,
  getCostPerTemplate,
  getWorkflowSuccessRate,
  getAvgDurationByType,
} from "@/lib/db/queries/analytics";

/**
 * GET /api/analytics/agents?range=30d
 * Returns agent cost tracking data.
 */
export async function GET(req: NextRequest) {
  const range = req.nextUrl.searchParams.get("range");
  const since = parseSinceFromRange(range);

  return NextResponse.json({
    costSummary: getAgentCostSummary(since),
    costOverTime: getAgentCostOverTime(since),
    costByType: getCostByWorkflowType(since),
    tokensByModel: getTokenUsageByModel(since),
    costPerTemplate: getCostPerTemplate(since),
    successRate: getWorkflowSuccessRate(since),
    avgDuration: getAvgDurationByType(since),
  });
}
