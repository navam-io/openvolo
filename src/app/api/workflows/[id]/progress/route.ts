import { NextResponse } from "next/server";
import { getWorkflowRun } from "@/lib/db/queries/workflows";

/**
 * GET /api/workflows/[id]/progress
 * Poll the progress of a running workflow.
 * Returns the run, recent steps (last 10), and completion status.
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

  // Return the last 10 steps for the progress display
  const recentSteps = run.steps.slice(-10);
  const isComplete = ["completed", "failed", "cancelled"].includes(run.status);

  return NextResponse.json({
    run: {
      id: run.id,
      workflowType: run.workflowType,
      status: run.status,
      totalItems: run.totalItems,
      processedItems: run.processedItems,
      successItems: run.successItems,
      errorItems: run.errorItems,
      model: run.model,
      inputTokens: run.inputTokens,
      outputTokens: run.outputTokens,
      costUsd: run.costUsd,
      startedAt: run.startedAt,
      completedAt: run.completedAt,
    },
    recentSteps,
    isComplete,
    totalSteps: run.steps.length,
  });
}
