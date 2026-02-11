"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { nanoid } from "nanoid";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PostInput } from "@/components/post-input";
import { Loader2, Plus, ListOrdered, AlignLeft } from "lucide-react";
import type { MediaThumbnailItem } from "@/components/media-thumbnail-grid";
import { validateMediaFile, validateMediaSet } from "@/lib/media/constraints";

type Platform = "x" | "linkedin";

interface MediaAttachment extends MediaThumbnailItem {
  assetId?: string; // DB ID after upload completes
  fileSize: number;
}

interface PostItem {
  id: string;
  body: string;
  media: MediaAttachment[];
}

interface ComposeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  draftId?: string | null;
  onSuccess?: () => void;
}

const PLATFORM_CONFIG: Record<Platform, {
  maxChars: number;
  placeholder: string;
  threadSupport: boolean;
  label: string;
}> = {
  x: {
    maxChars: 280,
    placeholder: "What's happening?",
    threadSupport: true,
    label: "X",
  },
  linkedin: {
    maxChars: 3000,
    placeholder: "What do you want to talk about?",
    threadSupport: false,
    label: "LinkedIn",
  },
};

const MAX_THREAD_SIZE = 25;

export function ComposeDialog({
  open,
  onOpenChange,
  draftId,
  onSuccess,
}: ComposeDialogProps) {
  const [platform, setPlatform] = useState<Platform>("x");
  const [posts, setPosts] = useState<PostItem[]>([
    { id: nanoid(), body: "", media: [] },
  ]);
  const [threadMode, setThreadMode] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [publishProgress, setPublishProgress] = useState<string | null>(null);
  const [loadingDraft, setLoadingDraft] = useState(false);
  const blobUrlsRef = useRef<string[]>([]);

  const config = PLATFORM_CONFIG[platform];

  // Load draft content when draftId changes
  useEffect(() => {
    if (!open) return;
    if (!draftId) {
      // Reset state for new compose
      setPosts([{ id: nanoid(), body: "", media: [] }]);
      setThreadMode(false);
      setError(null);
      setPublishProgress(null);
      return;
    }

    setLoadingDraft(true);
    setError(null);

    fetch(`/api/content/${draftId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          setError(data.error);
          return;
        }

        const item = data.item;

        // Set platform from draft's platformTarget if available
        if (item.platformTarget === "linkedin") {
          setPlatform("linkedin");
        } else {
          setPlatform("x");
        }

        // If it has a threadId, fetch thread items
        if (item.threadId) {
          return fetch(`/api/content?threadId=${item.threadId}&status=draft`)
            .then((res) => res.json())
            .then((threadData) => {
              const items: PostItem[] = (threadData.items || []).map(
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                (ti: any) => ({
                  id: ti.id,
                  body: ti.body || "",
                  media: [],
                })
              );
              if (items.length > 1) {
                setThreadMode(true);
              }
              setPosts(items.length > 0 ? items : [{ id: nanoid(), body: item.body || "", media: [] }]);
            });
        }

        setPosts([{ id: item.id, body: item.body || "", media: [] }]);
        setThreadMode(false);
      })
      .catch(() => setError("Failed to load draft"))
      .finally(() => setLoadingDraft(false));
  }, [draftId, open]);

  const updatePost = useCallback((index: number, value: string) => {
    setPosts((prev) =>
      prev.map((t, i) => (i === index ? { ...t, body: value } : t))
    );
  }, []);

  const addPost = useCallback(() => {
    setPosts((prev) => [...prev, { id: nanoid(), body: "", media: [] }]);
  }, []);

  const removePost = useCallback((index: number) => {
    setPosts((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const movePost = useCallback((from: number, to: number) => {
    setPosts((prev) => {
      const next = [...prev];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      return next;
    });
  }, []);

  const toggleThreadMode = useCallback(() => {
    setThreadMode((prev) => {
      if (!prev) {
        // Switching to thread mode: if only 1 post, add a second
        setPosts((t) =>
          t.length === 1 ? [...t, { id: nanoid(), body: "", media: [] }] : t
        );
      } else {
        // Switching to single mode: keep only first post
        setPosts((t) => [t[0]]);
      }
      return !prev;
    });
  }, []);

  const handlePlatformSwitch = useCallback((p: Platform) => {
    setPlatform(p);
    // Disable thread mode when switching to a platform that doesn't support it
    if (!PLATFORM_CONFIG[p].threadSupport && threadMode) {
      setThreadMode(false);
      setPosts((prev) => [prev[0]]);
    }
  }, [threadMode]);

  // --- Media handlers ---

  const handleAddMedia = useCallback(
    (postIndex: number, files: File[]) => {
      setError(null);

      for (const file of files) {
        const err = validateMediaFile(
          { name: file.name, type: file.type, size: file.size },
          platform,
        );
        if (err) {
          setError(err);
          return;
        }
      }

      // Check set validation with current + new
      const currentMedia = posts[postIndex]?.media ?? [];
      const newMediaTypes = files.map((f) => ({ mimeType: f.type }));
      const setError2 = validateMediaSet(
        [...currentMedia, ...newMediaTypes],
        platform,
      );
      if (setError2) {
        setError(setError2);
        return;
      }

      // Create blob URLs and upload
      const newAttachments: MediaAttachment[] = files.map((file) => {
        const previewUrl = URL.createObjectURL(file);
        blobUrlsRef.current.push(previewUrl);
        return {
          id: nanoid(),
          previewUrl,
          filename: file.name,
          mimeType: file.type,
          fileSize: file.size,
          uploading: true,
        };
      });

      // Add to state immediately (optimistic)
      setPosts((prev) =>
        prev.map((p, i) =>
          i === postIndex ? { ...p, media: [...p.media, ...newAttachments] } : p
        ),
      );

      // Upload each file
      newAttachments.forEach((attachment, idx) => {
        const file = files[idx];
        const formData = new FormData();
        formData.append("file", file);
        formData.append("platformTarget", platform);

        fetch("/api/media", { method: "POST", body: formData })
          .then((res) => res.json())
          .then((data) => {
            if (data.error) {
              setError(data.error);
              // Remove failed upload from state
              setPosts((prev) =>
                prev.map((p, i) =>
                  i === postIndex
                    ? { ...p, media: p.media.filter((m) => m.id !== attachment.id) }
                    : p
                ),
              );
              return;
            }
            // Mark upload complete with server ID
            setPosts((prev) =>
              prev.map((p, i) =>
                i === postIndex
                  ? {
                      ...p,
                      media: p.media.map((m) =>
                        m.id === attachment.id
                          ? { ...m, uploading: false, assetId: data.id }
                          : m
                      ),
                    }
                  : p
              ),
            );
          })
          .catch(() => {
            setError(`Failed to upload ${file.name}`);
            setPosts((prev) =>
              prev.map((p, i) =>
                i === postIndex
                  ? { ...p, media: p.media.filter((m) => m.id !== attachment.id) }
                  : p
              ),
            );
          });
      });
    },
    [platform, posts],
  );

  const handleRemoveMedia = useCallback(
    (postIndex: number, mediaId: string) => {
      const post = posts[postIndex];
      const attachment = post?.media.find((m) => m.id === mediaId);
      if (!attachment) return;

      // Revoke blob URL
      URL.revokeObjectURL(attachment.previewUrl);
      blobUrlsRef.current = blobUrlsRef.current.filter(
        (u) => u !== attachment.previewUrl,
      );

      // Remove from state
      setPosts((prev) =>
        prev.map((p, i) =>
          i === postIndex
            ? { ...p, media: p.media.filter((m) => m.id !== mediaId) }
            : p
        ),
      );

      // Delete from server if uploaded
      if (attachment.assetId) {
        fetch(`/api/media/${attachment.assetId}`, { method: "DELETE" }).catch(
          () => {},
        );
      }
    },
    [posts],
  );

  // Cleanup blob URLs on dialog close
  useEffect(() => {
    if (!open) {
      blobUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
      blobUrlsRef.current = [];
    }
  }, [open]);

  const hasContent = posts.some((t) => t.body.trim().length > 0);
  const hasMedia = posts.some((t) => t.media.length > 0);
  const hasOverflow = posts.some((t) => t.body.length > config.maxChars);
  const isUploading = posts.some((t) => t.media.some((m) => m.uploading));
  const canPublish = (hasContent || hasMedia) && !hasOverflow && !publishing && !saving && !isUploading && platform === "x";
  const canSaveDraft = (hasContent || hasMedia) && !publishing && !saving && !isUploading;

  async function handlePublish() {
    if (!canPublish) return;
    setPublishing(true);
    setError(null);
    setPublishProgress(
      threadMode ? `Publishing thread (${posts.length} posts)...` : "Publishing..."
    );

    try {
      const res = await fetch("/api/platforms/x/compose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tweets: posts.map((t) => t.body),
          draftId: draftId || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Publish failed");
        return;
      }

      if (data.partial) {
        setError(`Published ${data.published}/${data.total} posts. ${data.error}`);
        return;
      }

      onOpenChange(false);
      onSuccess?.();
    } catch {
      setError("Publish failed");
    } finally {
      setPublishing(false);
      setPublishProgress(null);
    }
  }

  async function handleSaveDraft() {
    if (!canSaveDraft) return;
    setSaving(true);
    setError(null);

    try {
      // Collect media asset IDs per post
      const mediaAssetIds = posts.map((t) =>
        t.media.filter((m) => m.assetId).map((m) => m.assetId!)
      );

      const res = await fetch(`/api/platforms/${platform}/compose`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tweets: posts.map((t) => t.body),
          saveAsDraft: true,
          draftId: draftId || undefined,
          platformTarget: platform,
          mediaAssetIds,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Save failed");
        return;
      }

      onOpenChange(false);
      onSuccess?.();
    } catch {
      setError("Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {platform === "linkedin" ? "Compose LinkedIn Post" : "Compose Post"}
            {threadMode && (
              <Badge variant="secondary" className="text-xs">
                Thread
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription>
            {platform === "linkedin"
              ? "Write a LinkedIn post"
              : threadMode
                ? "Create a thread of connected posts"
                : "Write and publish a post"}
          </DialogDescription>
        </DialogHeader>

        {loadingDraft ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-3">
            {/* Platform toggle */}
            <div className="flex items-center gap-2">
              <div className="flex items-center rounded-lg border p-0.5">
                <Button
                  variant={platform === "x" ? "default" : "ghost"}
                  size="sm"
                  className="h-7 text-xs px-3"
                  onClick={() => handlePlatformSwitch("x")}
                >
                  X
                </Button>
                <Button
                  variant={platform === "linkedin" ? "default" : "ghost"}
                  size="sm"
                  className="h-7 text-xs px-3"
                  onClick={() => handlePlatformSwitch("linkedin")}
                >
                  LinkedIn
                </Button>
              </div>

              {/* Thread / Single toggle — only for platforms that support it */}
              {config.threadSupport && (
                <Button
                  variant={threadMode ? "default" : "outline"}
                  size="sm"
                  className="h-7 text-xs"
                  onClick={toggleThreadMode}
                >
                  {threadMode ? (
                    <>
                      <AlignLeft className="mr-1.5 h-3.5 w-3.5" />
                      Single
                    </>
                  ) : (
                    <>
                      <ListOrdered className="mr-1.5 h-3.5 w-3.5" />
                      Thread
                    </>
                  )}
                </Button>
              )}
            </div>

            {/* Post inputs */}
            {threadMode && config.threadSupport && (
              <div className="relative pl-3 border-l-2 border-muted space-y-3">
                {posts.map((post, i) => (
                  <PostInput
                    key={post.id}
                    value={post.body}
                    onChange={(v) => updatePost(i, v)}
                    index={i}
                    total={posts.length}
                    showNumber={true}
                    maxChars={config.maxChars}
                    placeholder={`Post ${i + 1}...`}
                    onRemove={posts.length > 1 ? () => removePost(i) : undefined}
                    onMoveUp={i > 0 ? () => movePost(i, i - 1) : undefined}
                    onMoveDown={
                      i < posts.length - 1 ? () => movePost(i, i + 1) : undefined
                    }
                    autoFocus={i === posts.length - 1 && posts.length > 1}
                    media={post.media}
                    onAddMedia={(files) => handleAddMedia(i, files)}
                    onRemoveMedia={(id) => handleRemoveMedia(i, id)}
                    platform={platform}
                  />
                ))}

                {posts.length < MAX_THREAD_SIZE && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={addPost}
                    className="text-muted-foreground"
                  >
                    <Plus className="mr-1.5 h-3.5 w-3.5" />
                    Add post
                  </Button>
                )}
              </div>
            )}

            {!threadMode && (
              <PostInput
                value={posts[0].body}
                onChange={(v) => updatePost(0, v)}
                index={0}
                total={1}
                showNumber={false}
                maxChars={config.maxChars}
                placeholder={config.placeholder}
                autoFocus
                media={posts[0].media}
                onAddMedia={(files) => handleAddMedia(0, files)}
                onRemoveMedia={(id) => handleRemoveMedia(0, id)}
                platform={platform}
              />
            )}

            {/* Error display */}
            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200">
                {error}
              </div>
            )}

            {/* Publish progress */}
            {publishProgress && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                {publishProgress}
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={publishing || saving}
          >
            Cancel
          </Button>
          <Button
            variant="secondary"
            onClick={handleSaveDraft}
            disabled={!canSaveDraft}
          >
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Draft
          </Button>
          {platform === "x" && (
            <Button onClick={handlePublish} disabled={!canPublish}>
              {publishing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {threadMode ? `Publish Thread (${posts.length})` : "Publish"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
