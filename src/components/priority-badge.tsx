import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const priorityColors: Record<string, string> = {
  low: "bg-chart-1/15 text-chart-1 border-chart-1/25",
  medium: "bg-chart-2/15 text-chart-2 border-chart-2/25",
  high: "bg-chart-4/15 text-chart-4 border-chart-4/25",
  urgent: "bg-destructive/15 text-destructive border-destructive/25",
};

export function PriorityBadge({ priority }: { priority: string }) {
  return (
    <Badge variant="outline" className={cn("font-medium", priorityColors[priority])}>
      {priority}
    </Badge>
  );
}
