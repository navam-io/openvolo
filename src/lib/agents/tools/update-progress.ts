import {
  createWorkflowStep,
  updateWorkflowRun,
  nextStepIndex,
} from "@/lib/db/queries/workflows";

/**
 * Report progress from within an agent workflow.
 * Creates a workflow step and optionally updates run counters.
 */
export function updateProgress(
  workflowRunId: string,
  data: {
    message: string;
    processedItems?: number;
    successItems?: number;
    errorItems?: number;
  }
): { success: boolean } {
  createWorkflowStep({
    workflowRunId,
    stepIndex: nextStepIndex(workflowRunId),
    stepType: "thinking",
    status: "completed",
    tool: "update_progress",
    output: JSON.stringify({ message: data.message }),
  });

  // Update run counters if provided
  const updates: Record<string, unknown> = {};
  if (data.processedItems !== undefined) updates.processedItems = data.processedItems;
  if (data.successItems !== undefined) updates.successItems = data.successItems;
  if (data.errorItems !== undefined) updates.errorItems = data.errorItems;

  if (Object.keys(updates).length > 0) {
    updateWorkflowRun(workflowRunId, updates as Parameters<typeof updateWorkflowRun>[1]);
  }

  return { success: true };
}
