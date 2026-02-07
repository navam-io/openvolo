"use client";

import type { FunnelDistribution } from "@/lib/db/queries/dashboard";

const stageColors: Record<string, string> = {
  prospect: "bg-chart-1",
  engaged: "bg-chart-2",
  qualified: "bg-chart-5",
  opportunity: "bg-chart-3",
  customer: "bg-chart-4",
  advocate: "bg-chart-3",
};

const stageLabels: Record<string, string> = {
  prospect: "Prospect",
  engaged: "Engaged",
  qualified: "Qualified",
  opportunity: "Opportunity",
  customer: "Customer",
  advocate: "Advocate",
};

interface FunnelVisualizationProps {
  data: FunnelDistribution[];
}

export function FunnelVisualization({ data }: FunnelVisualizationProps) {
  const total = data.reduce((sum, d) => sum + d.count, 0);

  if (total === 0) {
    return (
      <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
        Add contacts to see your funnel distribution.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Horizontal stacked bar */}
      <div className="flex h-4 w-full overflow-hidden rounded-full bg-muted">
        {data.map((d) =>
          d.count > 0 ? (
            <div
              key={d.stage}
              className={`${stageColors[d.stage]} transition-all duration-500`}
              style={{ width: `${(d.count / total) * 100}%` }}
              title={`${stageLabels[d.stage]}: ${d.count}`}
            />
          ) : null
        )}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-x-4 gap-y-1">
        {data.map((d) => (
          <div key={d.stage} className="flex items-center gap-1.5 text-sm">
            <div className={`h-2.5 w-2.5 rounded-full ${stageColors[d.stage]}`} />
            <span className="text-muted-foreground">{stageLabels[d.stage]}</span>
            <span className="font-medium">{d.count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
