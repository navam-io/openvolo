import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const stageColors: Record<string, string> = {
  prospect: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  engaged: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  qualified: "bg-violet-100 text-violet-700 dark:bg-violet-900 dark:text-violet-300",
  opportunity: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300",
  customer: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
  advocate: "bg-pink-100 text-pink-700 dark:bg-pink-900 dark:text-pink-300",
};

export function FunnelStageBadge({ stage }: { stage: string }) {
  return (
    <Badge variant="outline" className={cn("border-0", stageColors[stage])}>
      {stage}
    </Badge>
  );
}
