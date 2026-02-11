"use client";

import { useState, useEffect, useCallback } from "react";
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

type Platform = "x" | "linkedin";

interface PostItem {
  id: string;
  body: string;
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
    { id: nanoid(), body: "" },
  ]);
  const [threadMode, setThreadMode] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [publishProgress, setPublishProgress] = useState<string | null>(null);
  const [loadingDraft, setLoadingDraft] = useState(false);

  const config = PLATFORM_CONFIG[platform];

  // Load draft content when draftId changes
  useEffect(() => {
    if (!open) return;
    if (!draftId) {
      // Reset state for new compose
      setPosts([{ id: nanoid(), body: "" }]);
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
                })
              );
              if (items.length > 1) {
                setThreadMode(true);
              }
              setPosts(items.length > 0 ? items : [{ id: nanoid(), body: item.body || "" }]);
            });
        }

        setPosts([{ id: item.id, body: item.body || "" }]);
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
    setPosts((prev) => [...prev, { id: nanoid(), body: "" }]);
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
          t.length === 1 ? [...t, { id: nanoid(), body: "" }] : t
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

  const hasContent = posts.some((t) => t.body.trim().length > 0);
  const hasOverflow = posts.some((t) => t.body.length > config.maxChars);
  const canPublish = hasContent && !hasOverflow && !publishing && !saving && platform === "x";
  const canSaveDraft = hasContent && !publishing && !saving;

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
      const res = await fetch(`/api/platforms/${platform}/compose`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tweets: posts.map((t) => t.body),
          saveAsDraft: true,
          draftId: draftId || undefined,
          platformTarget: platform,
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
      <DialogContent className="sm:max-w-xl max-h-[85vh] overflow-y-auto">
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
