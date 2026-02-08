import { NextResponse } from "next/server";
import { getWorkflowRun } from "@/lib/db/queries/workflows";

/**
 * GET /api/workflows/[id]
 * Get a workflow run with all its steps.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const run = getWorkflowRun(id);

  if (!run) {
    return NextResponse.json({ error: "Workflow run not found" }, { status: 404 });
  }

  return NextResponse.json(run);
}
