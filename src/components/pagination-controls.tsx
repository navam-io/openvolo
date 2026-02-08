"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";

interface PaginationControlsProps {
  page: number;
  pageSize: number;
  total: number;
  createPageUrl: (page: number) => string;
}

export function PaginationControls({
  page,
  pageSize,
  total,
  createPageUrl,
}: PaginationControlsProps) {
  const totalPages = Math.ceil(total / pageSize);
  if (totalPages <= 1) return null;

  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);

  // Build page number window
  const pages = buildPageWindow(page, totalPages);

  return (
    <div className="flex items-center justify-between pt-4">
      <p className="text-sm text-muted-foreground">
        Showing {start}-{end} of {total}
      </p>
      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="sm"
          disabled={page <= 1}
          asChild={page > 1}
        >
          {page > 1 ? (
            <Link href={createPageUrl(page - 1)}>Prev</Link>
          ) : (
            <span>Prev</span>
          )}
        </Button>

        {pages.map((p, i) =>
          p === "ellipsis" ? (
            <span key={`e${i}`} className="px-2 text-sm text-muted-foreground">
              ...
            </span>
          ) : (
            <Button
              key={p}
              variant={p === page ? "default" : "outline"}
              size="sm"
              className="min-w-[36px]"
              asChild={p !== page}
            >
              {p === page ? (
                <span>{p}</span>
              ) : (
                <Link href={createPageUrl(p)}>{p}</Link>
              )}
            </Button>
          )
        )}

        <Button
          variant="outline"
          size="sm"
          disabled={page >= totalPages}
          asChild={page < totalPages}
        >
          {page < totalPages ? (
            <Link href={createPageUrl(page + 1)}>Next</Link>
          ) : (
            <span>Next</span>
          )}
        </Button>
      </div>
    </div>
  );
}

/** Build a windowed array of page numbers with ellipsis markers. */
function buildPageWindow(
  current: number,
  total: number
): (number | "ellipsis")[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const pages: (number | "ellipsis")[] = [1];

  if (current > 3) {
    pages.push("ellipsis");
  }

  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);

  for (let i = start; i <= end; i++) {
    pages.push(i);
  }

  if (current < total - 2) {
    pages.push("ellipsis");
  }

  pages.push(total);

  return pages;
}
