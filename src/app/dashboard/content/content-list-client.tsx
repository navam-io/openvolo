"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useCallback, Suspense } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { FileText, Download, Loader2, Heart, MessageCircle, Repeat2, Quote, ExternalLink, ChevronDown, ChevronUp } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import type { ContentItemWithPost } from "@/lib/db/types";

const originFilters = [
  { value: "all", label: "All" },
  { value: "authored", label: "Tweets" },
  { value: "received", label: "Mentions" },
];

const contentTypeLabels: Record<string, string> = {
  post: "Post",
  article: "Article",
  thread: "Thread",
  reply: "Reply",
  image: "Image",
  video: "Video",
  email: "Email",
  dm: "DM",
  newsletter: "Newsletter",
};

interface ContentListClientProps {
  content: ContentItemWithPost[];
  currentType?: string;
  currentOrigin?: string;
}

function ContentListInner({
  content,
  currentOrigin,
}: ContentListClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [syncing, setSyncing] = useState<string | null>(null);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [syncResult, setSyncResult] = useState<{ type: string; added: number; skipped: number; errors: string[] } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const updateParams = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value && value !== "all") {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      router.push(`/dashboard/content?${params.toString()}`);
    },
    [router, searchParams]
  );

  async function handleSync(type: "tweets" | "mentions") {
    setSyncing(type);
    setSyncResult(null);
    setError(null);

    try {
      const res = await fetch("/api/platforms/x/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Sync failed");
        return;
      }

      setSyncResult({ type, ...data.result });
      router.refresh(); // re-fetch server data
    } catch {
      setError("Sync failed");
    } finally {
      setSyncing(null);
    }
  }

  function formatDate(unix: number | null | undefined): string {
    if (!unix) return "—";
    return new Date(unix * 1000).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  }

  function truncate(text: string | null | undefined, len: number): string {
    if (!text) return "—";
    return text.length > len ? text.slice(0, len) + "..." : text;
  }

  return (
    <div className="space-y-4">
      {/* Action bar */}
      <div className="flex items-center justify-between gap-4">
        <Tabs
          defaultValue={currentOrigin ?? "all"}
          onValueChange={(v) => updateParams("origin", v)}
        >
          <TabsList>
            {originFilters.map((f) => (
              <TabsTrigger key={f.value} value={f.value}>
                {f.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleSync("tweets")}
            disabled={syncing !== null}
          >
            {syncing === "tweets" ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Download className="mr-2 h-4 w-4" />
            )}
            Import Tweets
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleSync("mentions")}
            disabled={syncing !== null}
          >
            {syncing === "mentions" ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Download className="mr-2 h-4 w-4" />
            )}
            Import Mentions
          </Button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200">
          {error}
        </div>
      )}

      {/* Sync result */}
      {syncResult && (
        <div className="rounded-lg border bg-muted/50 p-3 text-sm">
          <p className="font-medium mb-1">
            {syncResult.type === "tweets" ? "Tweet" : "Mention"} import complete
          </p>
          <div className="flex gap-4 text-muted-foreground">
            <span>Added: {syncResult.added}</span>
            <span>Skipped: {syncResult.skipped}</span>
          </div>
          {syncResult.errors.length > 0 && (
            <div className="mt-2 text-destructive text-xs">
              {syncResult.errors.map((err, i) => (
                <p key={i}>{err}</p>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Content list */}
      {content.length === 0 ? (
        <Card className="border-border/50">
          <EmptyState
            icon={FileText}
            title="No content yet"
            description="Import your tweets and mentions from X to see them here, or create new content."
          />
        </Card>
      ) : (
        <div className="rounded-md border overflow-hidden">
          <Table className="table-fixed">
            <TableHeader>
              <TableRow>
                <TableHead>Content</TableHead>
                <TableHead className="w-28">Type</TableHead>
                <TableHead className="w-36">Engagement</TableHead>
                <TableHead className="w-32">Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {content.map((item) => {
                const snapshot = item.post?.engagementSnapshot
                  ? JSON.parse(item.post.engagementSnapshot)
                  : null;

                return (
                  <TableRow key={item.id} className="hover:bg-accent/30 transition-colors">
                    <TableCell>
                      <div className="space-y-1">
                        {item.title && (
                          <p className="font-medium text-sm">{truncate(item.title, 60)}</p>
                        )}
                        <div className="text-sm text-muted-foreground break-words">
                          {expandedItems.has(item.id) ? (
                            <p className="whitespace-pre-wrap">{item.body ?? "—"}</p>
                          ) : (
                            <p>{truncate(item.body, 120)}</p>
                          )}
                          <div className="flex items-center gap-2 mt-1">
                            {item.body && item.body.length > 120 && (
                              <button
                                type="button"
                                className="inline-flex items-center gap-0.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                                onClick={() => {
                                  setExpandedItems((prev) => {
                                    const next = new Set(prev);
                                    if (next.has(item.id)) {
                                      next.delete(item.id);
                                    } else {
                                      next.add(item.id);
                                    }
                                    return next;
                                  });
                                }}
                              >
                                {expandedItems.has(item.id) ? (
                                  <>
                                    <ChevronUp className="h-3 w-3" />
                                    Show less
                                  </>
                                ) : (
                                  <>
                                    <ChevronDown className="h-3 w-3" />
                                    Show more
                                  </>
                                )}
                              </button>
                            )}
                            {item.post?.platformUrl && (
                              <Button variant="ghost" size="icon" className="h-6 w-6" asChild>
                                <a
                                  href={item.post.platformUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  title="View on X"
                                >
                                  <ExternalLink className="h-3 w-3" />
                                </a>
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <Badge variant="secondary" className="text-xs w-fit">
                          {contentTypeLabels[item.contentType] ?? item.contentType}
                        </Badge>
                        {item.origin && (
                          <Badge
                            variant="outline"
                            className="text-xs w-fit"
                          >
                            {item.origin}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {snapshot ? (
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1" title="Likes">
                            <Heart className="h-3 w-3" />
                            {snapshot.likes ?? 0}
                          </span>
                          <span className="flex items-center gap-1" title="Replies">
                            <MessageCircle className="h-3 w-3" />
                            {snapshot.replies ?? 0}
                          </span>
                          <span className="flex items-center gap-1" title="Retweets">
                            <Repeat2 className="h-3 w-3" />
                            {snapshot.retweets ?? 0}
                          </span>
                          <span className="flex items-center gap-1" title="Quotes">
                            <Quote className="h-3 w-3" />
                            {snapshot.quotes ?? 0}
                          </span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {formatDate(item.post?.publishedAt ?? item.createdAt)}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

export function ContentListClient(props: ContentListClientProps) {
  return (
    <Suspense>
      <ContentListInner {...props} />
    </Suspense>
  );
}
