"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface ChartSkeletonProps {
  className?: string;
}

export function ChartSkeleton({ className }: ChartSkeletonProps) {
  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-3 w-60" />
      </CardHeader>
      <CardContent>
        <div className="flex items-end gap-2 h-[200px] pt-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton
              key={i}
              className="flex-1 rounded-t-sm"
              style={{ height: `${30 + Math.random() * 70}%` }}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function StatCardSkeleton() {
  return (
    <Card>
      <CardHeader className="pb-2">
        <Skeleton className="h-3 w-24" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-8 w-20" />
      </CardContent>
    </Card>
  );
}
