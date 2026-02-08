import { notFound } from "next/navigation";
import { getWorkflowRun } from "@/lib/db/queries/workflows";
import { WorkflowStepTimeline } from "@/components/workflow-step-timeline";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  RefreshCw,
  Sparkles,
  Search,
  Trash2,
  ArrowLeft,
  CheckCircle,
  XCircle,
  Clock,
  Loader2,
  Pause,
  Ban,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

const TYPE_ICONS: Record<string, typeof RefreshCw> = {
  sync: RefreshCw,
  enrich: Sparkles,
  search: Search,
  prune: Trash2,
};

const SYNC_SUBTYPE_LABELS: Record<string, string> = {
  x_contacts: "X Contact Sync",
  x_tweets: "X Tweet Sync",
  x_mentions: "X Mention Sync",
  x_enrich: "X Profile Enrichment",
  gmail_contacts: "Gmail Contact Sync",
  gmail_metadata: "Gmail Metadata Enrichment",
  linkedin_contacts: "LinkedIn Contact Sync",
};

const STATUS_CONFIG: Record<
  string,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: typeof CheckCircle }
> = {
  pending: { label: "Pending", variant: "secondary", icon: Clock },
  running: { label: "Running", variant: "default", icon: Loader2 },
  paused: { label: "Paused", variant: "outline", icon: Pause },
  completed: { label: "Completed", variant: "secondary", icon: CheckCircle },
  failed: { label: "Failed", variant: "destructive", icon: XCircle },
  cancelled: { label: "Cancelled", variant: "outline", icon: Ban },
};

function formatDuration(startedAt: number | null, completedAt: number | null): string {
  if (!startedAt) return "-";
  const end = completedAt ?? Math.floor(Date.now() / 1000);
  const seconds = end - startedAt;
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
  return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
}

function formatTimestamp(unix: number): string {
  return new Date(unix * 1000).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function WorkflowDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const run = getWorkflowRun(id);

  if (!run) notFound();

  const Icon = TYPE_ICONS[run.workflowType] ?? RefreshCw;
  const statusConfig = STATUS_CONFIG[run.status] ?? STATUS_CONFIG.pending;
  const StatusIcon = statusConfig.icon;

  let title = run.workflowType.charAt(0).toUpperCase() + run.workflowType.slice(1) + " Workflow";
  try {
    const config = JSON.parse(run.config ?? "{}");
    if (config.syncSubType && SYNC_SUBTYPE_LABELS[config.syncSubType]) {
      title = SYNC_SUBTYPE_LABELS[config.syncSubType];
    }
  } catch { /* ignore */ }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard/workflows">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex items-center gap-3 flex-1">
          <div className="rounded-md bg-muted p-2">
            <Icon className="h-5 w-5 text-muted-foreground" />
          </div>
          <div>
            <h1 className="text-heading-1">{title}</h1>
            <p className="text-xs text-muted-foreground">
              {formatTimestamp(run.createdAt)}
            </p>
          </div>
        </div>
        <Badge variant={statusConfig.variant} className="text-xs px-2 py-0.5">
          {run.status === "running" ? (
            <Loader2 className="mr-1 h-3 w-3 animate-spin" />
          ) : (
            <StatusIcon className="mr-1 h-3 w-3" />
          )}
          {statusConfig.label}
        </Badge>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Processed" value={run.processedItems} total={run.totalItems} />
        <StatCard label="Success" value={run.successItems} color="text-green-500" />
        <StatCard label="Skipped" value={run.skippedItems} color="text-muted-foreground" />
        <StatCard label="Errors" value={run.errorItems} color="text-destructive" />
      </div>

      {/* Duration */}
      <Card className="p-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Duration</span>
          <span className="font-mono">
            {formatDuration(run.startedAt, run.completedAt)}
          </span>
        </div>
      </Card>

      {/* Step timeline */}
      <section className="space-y-3">
        <h2 className="text-sm font-medium text-muted-foreground">
          Step Timeline
          <Badge variant="secondary" className="ml-2 text-[10px]">
            {run.steps.length}
          </Badge>
        </h2>
        <Card className="p-2">
          <WorkflowStepTimeline steps={run.steps} />
        </Card>
      </section>

      {/* Errors (if any) */}
      {run.errorItems > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-medium text-destructive">Errors</h2>
          <Card className="p-4 space-y-2">
            {(() => {
              try {
                const errors: string[] = JSON.parse(run.errors ?? "[]");
                return errors.map((err, i) => (
                  <p key={i} className="text-xs text-destructive">
                    {err}
                  </p>
                ));
              } catch {
                return <p className="text-xs text-muted-foreground">Unable to parse errors</p>;
              }
            })()}
          </Card>
        </section>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  total,
  color,
}: {
  label: string;
  value: number;
  total?: number | null;
  color?: string;
}) {
  return (
    <Card className="p-3 text-center">
      <p className="text-2xl font-semibold tabular-nums">
        <span className={color}>{value}</span>
        {total != null && total > 0 && (
          <span className="text-sm text-muted-foreground">/{total}</span>
        )}
      </p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </Card>
  );
}
