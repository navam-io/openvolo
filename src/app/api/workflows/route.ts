import { NextRequest, NextResponse } from "next/server";
import { listWorkflowRuns } from "@/lib/db/queries/workflows";

/**
 * GET /api/workflows
 * List workflow runs with optional filtering.
 * Query params: status, workflowType, campaignId, page, pageSize
 */
export async function GET(req: NextRequest) {
  const url = req.nextUrl;
  const status = url.searchParams.get("status") as
    | "pending" | "running" | "paused" | "completed" | "failed" | "cancelled"
    | null;
  const workflowType = url.searchParams.get("workflowType") as
    | "sync" | "enrich" | "search" | "prune"
    | null;
  const campaignId = url.searchParams.get("campaignId") ?? undefined;
  const page = parseInt(url.searchParams.get("page") ?? "1", 10);
  const pageSize = parseInt(url.searchParams.get("pageSize") ?? "25", 10);

  const result = listWorkflowRuns({
    status: status ?? undefined,
    workflowType: workflowType ?? undefined,
    campaignId,
    page,
    pageSize,
  });

  return NextResponse.json(result);
}
