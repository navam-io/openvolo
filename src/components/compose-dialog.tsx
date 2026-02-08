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
import { TweetInput } from "@/components/tweet-input";
import { Loader2, Plus, ListOrdered, AlignLeft } from "lucide-react";

interface TweetItem {
  id: string;
  body: string;
}

interface ComposeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  draftId?: string | null;
  onSuccess?: () => void;
}

const MAX_CHARS = 280;
const MAX_THREAD_SIZE = 25;

export function ComposeDialog({
  open,
  onOpenChange,
  draftId,
  onSuccess,
}: ComposeDialogProps) {
  const [tweets, setTweets] = useState<TweetItem[]>([
    { id: nanoid(), body: "" },
  ]);
  const [threadMode, setThreadMode] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [publishProgress, setPublishProgress] = useState<string | null>(null);
  const [loadingDraft, setLoadingDraft] = useState(false);

  // Load draft content when draftId changes
  useEffect(() => {
    if (!open) return;
    if (!draftId) {
      // Reset state for new compose
      setTweets([{ id: nanoid(), body: "" }]);
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
        // If it has a threadId, fetch thread items
        if (item.threadId) {
          return fetch(`/api/content?threadId=${item.threadId}&status=draft`)
            .then((res) => res.json())
            .then((threadData) => {
              const items: TweetItem[] = (threadData.items || []).map(
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                (ti: any) => ({
                  id: ti.id,
                  body: ti.body || "",
                })
              );
              if (items.length > 1) {
                setThreadMode(true);
              }
              setTweets(items.length > 0 ? items : [{ id: nanoid(), body: item.body || "" }]);
            });
        }

        setTweets([{ id: item.id, body: item.body || "" }]);
        setThreadMode(false);
      })
      .catch(() => setError("Failed to load draft"))
      .finally(() => setLoadingDraft(false));
  }, [draftId, open]);

  const updateTweet = useCallback((index: number, value: string) => {
    setTweets((prev) =>
      prev.map((t, i) => (i === index ? { ...t, body: value } : t))
    );
  }, []);

  const addTweet = useCallback(() => {
    setTweets((prev) => [...prev, { id: nanoid(), body: "" }]);
  }, []);

  const removeTweet = useCallback((index: number) => {
    setTweets((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const moveTweet = useCallback((from: number, to: number) => {
    setTweets((prev) => {
      const next = [...prev];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      return next;
    });
  }, []);

  const toggleThreadMode = useCallback(() => {
    setThreadMode((prev) => {
      if (!prev) {
        // Switching to thread mode: if only 1 tweet, add a second
        setTweets((t) =>
          t.length === 1 ? [...t, { id: nanoid(), body: "" }] : t
        );
      } else {
        // Switching to single mode: keep only first tweet
        setTweets((t) => [t[0]]);
      }
      return !prev;
    });
  }, []);

  const hasContent = tweets.some((t) => t.body.trim().length > 0);
  const hasOverflow = tweets.some((t) => t.body.length > MAX_CHARS);
  const canPublish = hasContent && !hasOverflow && !publishing && !saving;
  const canSaveDraft = hasContent && !publishing && !saving;

  async function handlePublish() {
    if (!canPublish) return;
    setPublishing(true);
    setError(null);
    setPublishProgress(
      threadMode ? `Publishing thread (${tweets.length} tweets)...` : "Publishing..."
    );

    try {
      const res = await fetch("/api/platforms/x/compose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tweets: tweets.map((t) => t.body),
          draftId: draftId || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Publish failed");
        return;
      }

      if (data.partial) {
        setError(`Published ${data.published}/${data.total} tweets. ${data.error}`);
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
      const res = await fetch("/api/platforms/x/compose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tweets: tweets.map((t) => t.body),
          saveAsDraft: true,
          draftId: draftId || undefined,
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
            Compose
            {threadMode && (
              <Badge variant="secondary" className="text-xs">
                Thread
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription>
            {threadMode
              ? "Create a thread of connected tweets"
              : "Write and publish a tweet"}
          </DialogDescription>
        </DialogHeader>

        {loadingDraft ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-3">
            {/* Thread / Single toggle */}
            <div className="flex items-center gap-2">
              <Button
                variant={threadMode ? "default" : "outline"}
                size="sm"
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
            </div>

            {/* Tweet inputs */}
            {threadMode && (
              <div className="relative pl-3 border-l-2 border-muted space-y-3">
                {tweets.map((tweet, i) => (
                  <TweetInput
                    key={tweet.id}
                    value={tweet.body}
                    onChange={(v) => updateTweet(i, v)}
                    index={i}
                    total={tweets.length}
                    showNumber={true}
                    onRemove={tweets.length > 1 ? () => removeTweet(i) : undefined}
                    onMoveUp={i > 0 ? () => moveTweet(i, i - 1) : undefined}
                    onMoveDown={
                      i < tweets.length - 1 ? () => moveTweet(i, i + 1) : undefined
                    }
                    autoFocus={i === tweets.length - 1 && tweets.length > 1}
                  />
                ))}

                {tweets.length < MAX_THREAD_SIZE && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={addTweet}
                    className="text-muted-foreground"
                  >
                    <Plus className="mr-1.5 h-3.5 w-3.5" />
                    Add tweet
                  </Button>
                )}
              </div>
            )}

            {!threadMode && (
              <TweetInput
                value={tweets[0].body}
                onChange={(v) => updateTweet(0, v)}
                index={0}
                total={1}
                showNumber={false}
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
          <Button onClick={handlePublish} disabled={!canPublish}>
            {publishing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {threadMode ? `Publish Thread (${tweets.length})` : "Publish"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
