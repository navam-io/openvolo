import type { Browser, BrowserContext } from "playwright";
import { sleep } from "@/lib/browser/anti-detection";
import {
  ensureSession,
  createPublishContext,
  captureScreenshot,
  resolveMediaPaths,
  detectSessionExpired,
  detectCaptcha,
  humanTypeText,
} from "@/lib/browser/publishers/publish-utils";
import { PublishError } from "@/lib/browser/publishers/types";
import type { PublishRequest, PublishResult } from "@/lib/browser/publishers/types";

/**
 * Publish a post to LinkedIn via browser automation.
 * Auto mode: headless, clicks Post automatically.
 * Review mode: headed, waits for user to click Post.
 * LinkedIn does not support threads.
 */
export async function publishToLinkedIn(request: PublishRequest): Promise<PublishResult> {
  let browser: Browser | null = null;
  let context: BrowserContext | null = null;

  try {
    const session = ensureSession("linkedin");
    const ctx = await createPublishContext(session, request.mode);
    browser = ctx.browser;
    context = ctx.context;
    const page = ctx.page;

    // Navigate to LinkedIn feed
    await page.goto("https://www.linkedin.com/feed/", {
      waitUntil: "domcontentloaded",
      timeout: 30_000,
    });
    await sleep(2000);

    // Check for session expiry
    if (detectSessionExpired(page, "linkedin")) {
      throw new PublishError(
        "LinkedIn session has expired. Please re-authenticate in Settings.",
        "session_expired"
      );
    }

    // Check for CAPTCHA
    if (detectCaptcha(page)) {
      await captureScreenshot(page);
      throw new PublishError("CAPTCHA or verification challenge detected.", "captcha");
    }

    // Wait for feed to confirm logged-in state
    await page
      .waitForSelector(".feed-identity-module", { timeout: 15_000 })
      .catch(() => {
        // Fallback: check for any feed content
        return page.waitForSelector('[data-finite-scroll-hotkey-context="FEED"]', { timeout: 10_000 });
      });

    // Click "Start a post" to open compose modal
    const shareBoxSelector = ".share-box-feed-entry__trigger";
    const shareBox = page.locator(shareBoxSelector);
    await shareBox.waitFor({ timeout: 10_000 });
    await shareBox.click();
    await sleep(1500);

    // Wait for the Quill rich text editor
    const editorSelector = ".ql-editor";
    await page.waitForSelector(editorSelector, { timeout: 10_000 });

    // Type the post text
    await humanTypeText(page, editorSelector, request.text, 15);
    await sleep(500);

    // Upload media
    if (request.mediaAssetIds && request.mediaAssetIds.length > 0) {
      await uploadMediaLinkedIn(page, request.mediaAssetIds);
    }

    if (request.mode === "auto") {
      // Auto mode: click the Post button
      const postButton = page.locator("button.share-actions__primary-action");
      await postButton.waitFor({ timeout: 5_000 });
      await postButton.click();

      // Wait for post to be published
      await sleep(3000);

      // Verify
      const result = await verifyLinkedInPost(page);
      return result;
    } else {
      // Review mode: wait for user to manually click Post
      const startWait = Date.now();
      const maxWait = 5 * 60 * 1000;

      while (Date.now() - startWait < maxWait) {
        // Check if the compose modal has closed
        const modalOpen = await page
          .locator(editorSelector)
          .isVisible()
          .catch(() => false);

        if (!modalOpen) {
          await sleep(2000);
          const result = await verifyLinkedInPost(page);
          return result;
        }
        await sleep(2000);
      }

      return {
        success: false,
        error: "Review mode timed out after 5 minutes. Post may not have been published.",
        errorCode: "timeout",
      };
    }
  } catch (err) {
    if (err instanceof PublishError) {
      return {
        success: false,
        error: err.message,
        errorCode: err.errorCode,
      };
    }
    return {
      success: false,
      error: err instanceof Error ? err.message : String(err),
      errorCode: "unknown",
    };
  } finally {
    if (request.mode === "auto") {
      await context?.close().catch(() => {});
      await browser?.close().catch(() => {});
    }
  }
}

/** Upload media files using LinkedIn's file input. */
async function uploadMediaLinkedIn(
  page: import("playwright").Page,
  assetIds: string[]
): Promise<void> {
  const filePaths = resolveMediaPaths(assetIds);
  if (filePaths.length === 0) return;

  // Click the photo/media button to reveal the file input
  const photoButton = page.locator('button[aria-label="Add a photo"]');
  const mediaButton = page.locator('button[aria-label="Add media"]');

  const photoVisible = await photoButton.isVisible().catch(() => false);
  if (photoVisible) {
    await photoButton.click();
  } else {
    await mediaButton.waitFor({ timeout: 5_000 });
    await mediaButton.click();
  }
  await sleep(1000);

  // Find the file input and set files
  const fileInput = page.locator('input[type="file"]').first();
  await fileInput.waitFor({ timeout: 5_000 });
  await fileInput.setInputFiles(filePaths);

  // Wait for upload to process
  await sleep(5000);
}

/** Attempt to verify a post was published by checking the LinkedIn feed. */
async function verifyLinkedInPost(
  page: import("playwright").Page
): Promise<PublishResult> {
  try {
    await page.goto("https://www.linkedin.com/feed/", {
      waitUntil: "domcontentloaded",
      timeout: 15_000,
    });
    await sleep(2000);

    // Look for the most recent post activity link
    const activityLink = await page
      .locator('.feed-shared-update-v2 a[href*="/feed/update/"]')
      .first()
      .getAttribute("href", { timeout: 10_000 })
      .catch(() => null);

    if (activityLink) {
      // Extract activity ID from the URL
      const match = activityLink.match(/activity[:-](\d+)/);
      const platformPostId = match?.[1] ?? null;
      const platformUrl = activityLink.startsWith("http")
        ? activityLink
        : `https://www.linkedin.com${activityLink}`;

      return {
        success: true,
        platformUrl,
        platformPostId: platformPostId ?? undefined,
      };
    }

    return { success: true };
  } catch {
    return { success: true };
  }
}
