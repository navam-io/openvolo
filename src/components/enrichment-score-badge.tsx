import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const scoreColors: Record<string, string> = {
  rich: "bg-chart-4/15 text-chart-4 border-chart-4/25",
  good: "bg-chart-5/15 text-chart-5 border-chart-5/25",
  basic: "bg-chart-2/15 text-chart-2 border-chart-2/25",
  sparse: "bg-chart-3/15 text-chart-3 border-chart-3/25",
  minimal: "bg-chart-1/15 text-chart-1 border-chart-1/25",
};

function getScoreLevel(score: number): { label: string; key: string } {
  if (score >= 80) return { label: "Rich", key: "rich" };
  if (score >= 60) return { label: "Good", key: "good" };
  if (score >= 40) return { label: "Basic", key: "basic" };
  if (score >= 20) return { label: "Sparse", key: "sparse" };
  return { label: "Minimal", key: "minimal" };
}

export function EnrichmentScoreBadge({ score }: { score: number }) {
  const { label, key } = getScoreLevel(score);
  return (
    <Badge
      variant="outline"
      className={cn("font-medium", scoreColors[key] ?? "bg-muted/15 text-muted-foreground border-muted")}
    >
      {label} ({score})
    </Badge>
  );
}
