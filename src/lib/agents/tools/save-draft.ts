import { createContentItem } from "@/lib/db/queries/content";
import {
  createWorkflowStep,
  nextStepIndex,
} from "@/lib/db/queries/workflows";

export interface SaveDraftResult {
  contentItemId: string;
  title: string | null;
  contentType: string;
  saved: boolean;
  message: string;
}

/**
 * Save a content draft to the contentItems table.
 * Logs a `content_create` workflow step for observability.
 * Used by the agent runner's `save_draft` tool during content workflows.
 */
export function saveDraft(
  params: {
    title?: string;
    body: string;
    contentType?: string;
    platformTarget?: string;
    generationPrompt?: string;
  },
  workflowRunId: string
): SaveDraftResult {
  const startTime = Date.now();

  const contentType = (params.contentType ?? "post") as "post" | "article" | "thread" | "reply" | "image" | "video" | "email" | "dm" | "newsletter";

  const item = createContentItem({
    title: params.title ?? null,
    body: params.body,
    contentType,
    platformTarget: params.platformTarget ?? null,
    status: "draft",
    aiGenerated: true,
    generationPrompt: params.generationPrompt ?? null,
    origin: "authored",
    direction: "outbound",
  });

  createWorkflowStep({
    workflowRunId,
    stepIndex: nextStepIndex(workflowRunId),
    stepType: "content_create",
    status: "completed",
    tool: "save_draft",
    input: JSON.stringify({
      title: params.title ?? null,
      contentType,
      platformTarget: params.platformTarget ?? null,
      bodyLength: params.body.length,
    }),
    output: JSON.stringify({
      contentItemId: item.id,
      title: item.title,
      contentType: item.contentType,
    }),
    durationMs: Date.now() - startTime,
  });

  return {
    contentItemId: item.id,
    title: item.title ?? null,
    contentType: item.contentType,
    saved: true,
    message: `Draft saved: "${item.title ?? "Untitled"}" (${item.contentType}). It will appear in Content > Drafts.`,
  };
}
