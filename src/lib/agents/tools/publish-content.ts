import {
  createWorkflowStep,
  nextStepIndex,
} from "@/lib/db/queries/workflows";
import {
  createContentItem,
  updateContentItem,
  createContentPost,
} from "@/lib/db/queries/content";
import { getPlatformAccountByPlatform } from "@/lib/db/queries/platform-accounts";
import { publishToX } from "@/lib/browser/publishers/x-publisher";
import { publishToLinkedIn } from "@/lib/browser/publishers/linkedin-publisher";
import type { PublishRequest } from "@/lib/browser/publishers/types";

export interface PublishContentResult {
  success: boolean;
  contentItemId?: string;
  platformUrl?: string;
  platformPostId?: string;
  error?: string;
  errorCode?: string;
}

/**
 * Publish content to X or LinkedIn via browser automation.
 * Creates a content item if not provided, then publishes via browser.
 * Logs a `content_publish` workflow step for observability.
 * Agent tool always uses mode: "auto" (headless, no human in loop).
 */
export async function publishContent(
  params: {
    platform: "x" | "linkedin";
    text: string;
    mediaAssetIds?: string[];
    threadTexts?: string[];
    contentItemId?: string;
  },
  workflowRunId: string
): Promise<PublishContentResult> {
  const startTime = Date.now();

  // Ensure we have a content item
  let contentItemId = params.contentItemId;
  if (!contentItemId) {
    const item = createContentItem({
      title: null,
      body: params.text,
      contentType: "post",
      platformTarget: params.platform,
      status: "draft",
      aiGenerated: true,
      generationPrompt: null,
      origin: "authored",
      direction: "outbound",
    });
    contentItemId = item.id;
  }

  // Get platform account
  const account = getPlatformAccountByPlatform(params.platform);
  if (!account) {
    const error = `No ${params.platform} account connected.`;

    createWorkflowStep({
      workflowRunId,
      stepIndex: nextStepIndex(workflowRunId),
      stepType: "content_publish",
      status: "failed",
      tool: "publish_content",
      input: JSON.stringify({ platform: params.platform, textLength: params.text.length }),
      output: JSON.stringify({ error }),
      error,
      durationMs: Date.now() - startTime,
    });

    return { success: false, contentItemId, error };
  }

  // Set intermediate status
  updateContentItem(contentItemId, { status: "review" });

  // Build publish request
  const publishRequest: PublishRequest = {
    platform: params.platform,
    mode: "auto",
    text: params.text,
    mediaAssetIds: params.mediaAssetIds,
    threadTexts: params.threadTexts,
    contentItemId,
  };

  try {
    const result =
      params.platform === "x"
        ? await publishToX(publishRequest)
        : await publishToLinkedIn(publishRequest);

    if (result.success) {
      // Update content item to published
      updateContentItem(contentItemId, { status: "published" });

      // Create content post record
      createContentPost({
        contentItemId,
        platformAccountId: account.id,
        platformPostId: result.platformPostId ?? null,
        platformUrl: result.platformUrl ?? null,
        publishedAt: Math.floor(Date.now() / 1000),
        status: "published",
      });

      createWorkflowStep({
        workflowRunId,
        stepIndex: nextStepIndex(workflowRunId),
        stepType: "content_publish",
        status: "completed",
        tool: "publish_content",
        input: JSON.stringify({
          platform: params.platform,
          textLength: params.text.length,
          hasMedia: !!params.mediaAssetIds?.length,
        }),
        output: JSON.stringify({
          contentItemId,
          platformUrl: result.platformUrl,
          platformPostId: result.platformPostId,
        }),
        durationMs: Date.now() - startTime,
      });

      return {
        success: true,
        contentItemId,
        platformUrl: result.platformUrl,
        platformPostId: result.platformPostId,
      };
    } else {
      // Revert to draft
      updateContentItem(contentItemId, { status: "draft" });

      createWorkflowStep({
        workflowRunId,
        stepIndex: nextStepIndex(workflowRunId),
        stepType: "content_publish",
        status: "failed",
        tool: "publish_content",
        input: JSON.stringify({ platform: params.platform, textLength: params.text.length }),
        output: JSON.stringify({ error: result.error, errorCode: result.errorCode }),
        error: result.error,
        durationMs: Date.now() - startTime,
      });

      return {
        success: false,
        contentItemId,
        error: result.error,
        errorCode: result.errorCode,
      };
    }
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);

    updateContentItem(contentItemId, { status: "draft" });

    createWorkflowStep({
      workflowRunId,
      stepIndex: nextStepIndex(workflowRunId),
      stepType: "content_publish",
      status: "failed",
      tool: "publish_content",
      input: JSON.stringify({ platform: params.platform, textLength: params.text.length }),
      output: JSON.stringify({ error }),
      error,
      durationMs: Date.now() - startTime,
    });

    return { success: false, contentItemId, error };
  }
}
