import { NextRequest, NextResponse } from "next/server";
import { listGoalProgress } from "@/lib/db/queries/goals";
import { parseSinceFromRange } from "@/lib/analytics/utils";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { searchParams } = new URL(req.url);
  const range = searchParams.get("range");
  const since = parseSinceFromRange(range);

  const progress = listGoalProgress(id, since);
  return NextResponse.json({ data: progress });
}
