import {
  createWorkflowStep,
  nextStepIndex,
} from "@/lib/db/queries/workflows";
import { loadSession, createSessionContext } from "@/lib/browser/session";
import type { BrowserPlatform } from "@/lib/browser/types";
import type { Browser } from "playwright";

export interface EngagePostResult {
  success: boolean;
  action: "like" | "reply" | "retweet";
  platform: "x" | "linkedin";
  postUrl: string;
  error?: string;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Engage with a post on X or LinkedIn via browser automation.
 * Supports like, reply, and retweet actions.
 */
export async function engagePost(
  platform: "x" | "linkedin",
  postUrl: string,
  action: "like" | "reply" | "retweet",
  workflowRunId: string,
  opts?: { replyText?: string }
): Promise<EngagePostResult> {
  const startTime = Date.now();
  let browser: Browser | null = null;

  try {
    // Load existing session
    const session = loadSession(platform as BrowserPlatform);
    if (!session) {
      const result: EngagePostResult = {
        success: false,
        action,
        platform,
        postUrl,
        error: `No browser session found for ${platform}. Set up a session in Settings first.`,
      };

      createWorkflowStep({
        workflowRunId,
        stepIndex: nextStepIndex(workflowRunId),
        stepType: "post_engagement",
        status: "failed",
        url: postUrl,
        tool: "engage_post",
        input: JSON.stringify({ platform, postUrl, action }),
        output: JSON.stringify(result),
        error: result.error,
        durationMs: Date.now() - startTime,
      });

      return result;
    }

    // Create browser context with session cookies
    const ctx = await createSessionContext(session);
    browser = ctx.browser;
    const page = await ctx.context.newPage();

    // Navigate to the post
    await page.goto(postUrl, { waitUntil: "domcontentloaded", timeout: 30000 });
    await sleep(2000); // Anti-detection delay

    // Execute the action based on platform
    if (platform === "x") {
      await executeXAction(page, action, opts?.replyText);
    } else {
      await executeLinkedInAction(page, action, opts?.replyText);
    }

    await sleep(1000); // Wait for action to register

    const result: EngagePostResult = {
      success: true,
      action,
      platform,
      postUrl,
    };

    createWorkflowStep({
      workflowRunId,
      stepIndex: nextStepIndex(workflowRunId),
      stepType: "post_engagement",
      status: "completed",
      url: postUrl,
      tool: "engage_post",
      input: JSON.stringify({ platform, postUrl, action, replyText: opts?.replyText }),
      output: JSON.stringify(result),
      durationMs: Date.now() - startTime,
    });

    await ctx.context.close();
    return result;
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);

    const result: EngagePostResult = {
      success: false,
      action,
      platform,
      postUrl,
      error,
    };

    createWorkflowStep({
      workflowRunId,
      stepIndex: nextStepIndex(workflowRunId),
      stepType: "post_engagement",
      status: "failed",
      url: postUrl,
      tool: "engage_post",
      input: JSON.stringify({ platform, postUrl, action }),
      output: JSON.stringify(result),
      error,
      durationMs: Date.now() - startTime,
    });

    return result;
  } finally {
    await browser?.close();
  }
}

/**
 * Execute an engagement action on X (Twitter).
 */
async function executeXAction(
  page: import("playwright").Page,
  action: "like" | "reply" | "retweet",
  replyText?: string
): Promise<void> {
  switch (action) {
    case "like": {
      const likeButton = page.locator('[data-testid="like"]').first();
      await likeButton.waitFor({ timeout: 10000 });
      await likeButton.click();
      break;
    }
    case "retweet": {
      const retweetButton = page.locator('[data-testid="retweet"]').first();
      await retweetButton.waitFor({ timeout: 10000 });
      await retweetButton.click();
      await sleep(500);
      // Click the "Repost" confirm option
      const confirmRetweet = page.locator('[data-testid="retweetConfirm"]').first();
      await confirmRetweet.waitFor({ timeout: 5000 });
      await confirmRetweet.click();
      break;
    }
    case "reply": {
      if (!replyText) throw new Error("replyText is required for reply action");
      const replyButton = page.locator('[data-testid="reply"]').first();
      await replyButton.waitFor({ timeout: 10000 });
      await replyButton.click();
      await sleep(1000);
      // Type reply in the compose box
      const replyBox = page.locator('[data-testid="tweetTextarea_0"]').first();
      await replyBox.waitFor({ timeout: 10000 });
      await replyBox.fill(replyText);
      await sleep(500);
      // Click the tweet/reply button
      const sendButton = page.locator('[data-testid="tweetButtonInline"]').first();
      await sendButton.waitFor({ timeout: 5000 });
      await sendButton.click();
      break;
    }
  }
}

/**
 * Execute an engagement action on LinkedIn.
 */
async function executeLinkedInAction(
  page: import("playwright").Page,
  action: "like" | "reply" | "retweet",
  replyText?: string
): Promise<void> {
  switch (action) {
    case "like": {
      const likeButton = page.locator('button.react-button__trigger[aria-label*="Like"]').first();
      await likeButton.waitFor({ timeout: 10000 });
      await likeButton.click();
      break;
    }
    case "retweet": {
      // LinkedIn calls this "Repost"
      const repostButton = page.locator('button[aria-label*="Repost"]').first();
      await repostButton.waitFor({ timeout: 10000 });
      await repostButton.click();
      await sleep(500);
      // Click the "Repost" option (not "Quote")
      const instantRepost = page.locator('button:has-text("Repost")').first();
      await instantRepost.waitFor({ timeout: 5000 });
      await instantRepost.click();
      break;
    }
    case "reply": {
      if (!replyText) throw new Error("replyText is required for reply action");
      const commentButton = page.locator('button[aria-label*="Comment"]').first();
      await commentButton.waitFor({ timeout: 10000 });
      await commentButton.click();
      await sleep(1000);
      const commentBox = page.locator('.ql-editor[data-placeholder="Add a comment…"]').first();
      await commentBox.waitFor({ timeout: 10000 });
      await commentBox.fill(replyText);
      await sleep(500);
      const postButton = page.locator('button.comments-comment-box__submit-button').first();
      await postButton.waitFor({ timeout: 5000 });
      await postButton.click();
      break;
    }
  }
}
