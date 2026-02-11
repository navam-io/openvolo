"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useCallback, Suspense, useMemo } from "react";
import { Card } from "@/components/ui/card";
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
import { FileText, Heart, MessageCircle, Repeat2, Quote, ExternalLink, ChevronDown, ChevronUp, PenSquare, Pencil, Share2, ThumbsUp } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { ComposeDialog } from "@/components/compose-dialog";
import { PaginationControls } from "@/components/pagination-controls";
import type { ContentItemWithPost } from "@/lib/db/types";

const originFilters = [
  { value: "all", label: "All" },
  { value: "authored", label: "Posts" },
  { value: "received", label: "Inbound" },
  { value: "drafts", label: "Drafts" },
];

const platformFilters = [
  { value: "all", label: "All Platforms" },
  { value: "x", label: "X" },
  { value: "linkedin", label: "LinkedIn" },
  { value: "gmail", label: "Gmail" },
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
  total: number;
  page: number;
  pageSize: number;
  currentType?: string;
  currentOrigin?: string;
  currentStatus?: string;
  currentPlatform?: string;
}

/** Determine platform for a content item from its associated platform account or target. */
function getItemPlatform(item: ContentItemWithPost): string | null {
  // platformTarget is set on drafts and some imported content
  if (item.platformTarget) return item.platformTarget;
  // Fall back to checking platformData for platform hints
  return null;
}

function ContentListInner({
  content,
  total,
  page,
  pageSize,
  currentOrigin,
  currentStatus,
  currentPlatform,
}: ContentListClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [composeOpen, setComposeOpen] = useState(false);
  const [composeDraftId, setComposeDraftId] = useState<string | null>(null);

  // Compute thread counts for badge display
  const threadCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const item of content) {
      if (item.threadId) {
        counts.set(item.threadId, (counts.get(item.threadId) ?? 0) + 1);
      }
    }
    return counts;
  }, [content]);

  const updateParams = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (key === "origin") {
        if (value === "drafts") {
          params.delete("origin");
          params.set("status", "draft");
        } else {
          params.delete("status");
          if (value && value !== "all") {
            params.set(key, value);
          } else {
            params.delete(key);
          }
        }
      } else if (key === "platform") {
        if (value && value !== "all") {
          params.set("platform", value);
        } else {
          params.delete("platform");
        }
      }
      params.delete("page");
      router.push(`/dashboard/content?${params.toString()}`);
    },
    [router, searchParams]
  );

  const createPageUrl = useCallback(
    (p: number) => {
      const params = new URLSearchParams(searchParams.toString());
      if (p > 1) {
        params.set("page", String(p));
      } else {
        params.delete("page");
      }
      return `/dashboard/content?${params.toString()}`;
    },
    [searchParams]
  );

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

  function renderEngagement(item: ContentItemWithPost) {
    if (item.status === "draft") {
      return (
        <Button
          variant="outline"
          size="sm"
          className="text-xs"
          onClick={(e) => {
            e.stopPropagation();
            setComposeDraftId(item.id);
            setComposeOpen(true);
          }}
        >
          <Pencil className="mr-1.5 h-3 w-3" />
          Edit
        </Button>
      );
    }

    const snapshot = item.post?.engagementSnapshot
      ? JSON.parse(item.post.engagementSnapshot)
      : null;

    if (!snapshot) {
      return <span className="text-muted-foreground text-xs">—</span>;
    }

    const platform = getItemPlatform(item);

    // LinkedIn engagement
    if (platform === "linkedin") {
      return (
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1" title="Likes">
            <ThumbsUp className="h-3 w-3" />
            {snapshot.likes ?? 0}
          </span>
          <span className="flex items-center gap-1" title="Comments">
            <MessageCircle className="h-3 w-3" />
            {snapshot.comments ?? 0}
          </span>
          <span className="flex items-center gap-1" title="Shares">
            <Share2 className="h-3 w-3" />
            {snapshot.shares ?? 0}
          </span>
        </div>
      );
    }

    // Gmail — no engagement metrics
    if (platform === "gmail") {
      return <span className="text-muted-foreground text-xs">—</span>;
    }

    // Default: X / Twitter engagement
    return (
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
    );
  }

  return (
    <div className="space-y-4">
      {/* Action bar */}
      <div className="flex items-center justify-between gap-4">
        <Tabs
          defaultValue={currentStatus === "draft" ? "drafts" : (currentOrigin ?? "all")}
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

        <Button
          size="sm"
          onClick={() => {
            setComposeDraftId(null);
            setComposeOpen(true);
          }}
        >
          <PenSquare className="mr-2 h-4 w-4" />
          Compose
        </Button>
      </div>

      {/* Platform filter row */}
      <div className="flex items-center gap-1">
        {platformFilters.map((f) => (
          <Button
            key={f.value}
            variant={(currentPlatform ?? "all") === f.value ? "default" : "ghost"}
            size="sm"
            className="h-7 text-xs"
            onClick={() => updateParams("platform", f.value)}
          >
            {f.label}
          </Button>
        ))}
      </div>

      {/* Content list */}
      {content.length === 0 ? (
        <Card className="border-border/50">
          <EmptyState
            icon={FileText}
            title="No content yet"
            description="Create new content with the Compose button, or sync posts from the Automation tab."
          />
        </Card>
      ) : (
        <div className="rounded-md border overflow-hidden">
          <Table className="table-fixed">
            <TableHeader>
              <TableRow>
                <TableHead className="max-w-0 overflow-hidden">Content</TableHead>
                <TableHead className="w-28">Type</TableHead>
                <TableHead className="w-36">Engagement</TableHead>
                <TableHead className="w-32">Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {content.map((item) => (
                <TableRow
                  key={item.id}
                  className="hover:bg-accent/30 transition-colors cursor-pointer"
                  onClick={() => router.push(`/dashboard/content/${item.id}`)}
                >
                  <TableCell className="max-w-0 overflow-hidden">
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
                              onClick={(e) => {
                                e.stopPropagation();
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
                                title="View on platform"
                                onClick={(e) => e.stopPropagation()}
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
                      {item.status === "draft" && (
                        <Badge variant="outline" className="text-xs w-fit border-yellow-500 text-yellow-600">
                          draft
                        </Badge>
                      )}
                      {item.threadId && threadCounts.get(item.threadId)! > 1 && (
                        <Badge variant="outline" className="text-xs w-fit">
                          Thread ({threadCounts.get(item.threadId)})
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {renderEngagement(item)}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {formatDate(item.post?.publishedAt ?? item.createdAt)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <PaginationControls
        page={page}
        pageSize={pageSize}
        total={total}
        createPageUrl={createPageUrl}
      />

      {/* Compose dialog */}
      <ComposeDialog
        open={composeOpen}
        onOpenChange={setComposeOpen}
        draftId={composeDraftId}
        onSuccess={() => router.refresh()}
      />
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
