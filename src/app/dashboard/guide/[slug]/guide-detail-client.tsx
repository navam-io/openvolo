"use client";

import Link from "next/link";
import { ChevronLeft, ChevronRight, BookOpen } from "lucide-react";
import { GuideMarkdown } from "@/components/guide-markdown";
import type { GuideMeta } from "@/lib/guide/types";

interface GuideDetailClientProps {
  meta: GuideMeta;
  content: string;
  allGuides: GuideMeta[];
}

export function GuideDetailClient({
  meta,
  content,
  allGuides,
}: GuideDetailClientProps) {
  const currentIndex = allGuides.findIndex((g) => g.slug === meta.slug);
  const prev = currentIndex > 0 ? allGuides[currentIndex - 1] : null;
  const next =
    currentIndex < allGuides.length - 1 ? allGuides[currentIndex + 1] : null;

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link
          href="/dashboard/guide"
          className="flex items-center gap-1 hover:text-foreground transition-colors"
        >
          <BookOpen className="h-4 w-4" />
          Guide
        </Link>
        <span>/</span>
        <span className="text-foreground font-medium">{meta.title}</span>
      </div>

      {/* Content */}
      <GuideMarkdown content={content} />

      {/* Previous / Next navigation */}
      <div className="flex items-center justify-between border-t pt-6">
        {prev ? (
          <Link
            href={`/dashboard/guide/${prev.slug}`}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
            {prev.title}
          </Link>
        ) : (
          <div />
        )}
        {next ? (
          <Link
            href={`/dashboard/guide/${next.slug}`}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            {next.title}
            <ChevronRight className="h-4 w-4" />
          </Link>
        ) : (
          <Link
            href="/dashboard/guide"
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Back to Guide Index
            <ChevronRight className="h-4 w-4" />
          </Link>
        )}
      </div>
    </div>
  );
}
