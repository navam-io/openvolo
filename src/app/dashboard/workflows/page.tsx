import { listWorkflowRuns } from "@/lib/db/queries/workflows";
import { WorkflowProgressCard } from "@/components/workflow-progress-card";
import { WorkflowQuickActions } from "./workflow-quick-actions";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/empty-state";
import { GitBranch } from "lucide-react";
import Link from "next/link";

export default function WorkflowsPage() {
  // Fetch active (running/pending) and recent workflows
  const active = listWorkflowRuns({ status: "running", pageSize: 10 });
  const pending = listWorkflowRuns({ status: "pending", pageSize: 5 });
  const recent = listWorkflowRuns({ pageSize: 20 });

  const activeRuns = [...active.data, ...pending.data];
  // Exclude active runs from recent list
  const activeIds = new Set(activeRuns.map((r) => r.id));
  const recentRuns = recent.data.filter((r) => !activeIds.has(r.id));
  const hasAnyRuns = recent.total > 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-heading-1">Workflows</h1>
          <p className="text-muted-foreground mt-1">
            Track sync, enrichment, and search pipeline progress.
          </p>
        </div>
        <WorkflowQuickActions />
      </div>

      {/* Active workflows */}
      {activeRuns.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-medium text-muted-foreground">Active Workflows</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {activeRuns.map((run) => (
              <WorkflowProgressCard key={run.id} run={run} />
            ))}
          </div>
        </section>
      )}

      {/* Recent workflows */}
      {recentRuns.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-sm font-medium text-muted-foreground">
            Recent Workflows
            <Badge variant="secondary" className="ml-2 text-[10px]">
              {recent.total}
            </Badge>
          </h2>
          <Card className="divide-y divide-border/50">
            {recentRuns.map((run) => (
              <WorkflowRunRow key={run.id} run={run} />
            ))}
          </Card>
        </section>
      ) : !hasAnyRuns ? (
        <Card className="border-border/50">
          <EmptyState
            icon={GitBranch}
            title="No workflows yet"
            description="Workflows are created automatically when you sync contacts or run enrichment. Use the quick actions above to get started."
          />
        </Card>
      ) : null}
    </div>
  );
}

function WorkflowRunRow({
  run,
}: {
  run: ReturnType<typeof listWorkflowRuns>["data"][number];
}) {
  const typeLabels: Record<string, string> = {
    sync: "Sync",
    enrich: "Enrich",
    search: "Search",
    prune: "Prune",
  };
  const statusColors: Record<string, string> = {
    completed: "bg-green-600",
    failed: "bg-destructive",
    cancelled: "bg-muted-foreground",
    paused: "bg-yellow-500",
    running: "bg-blue-500",
    pending: "bg-muted-foreground",
  };

  let subLabel: string | null = null;
  try {
    const config = JSON.parse(run.config ?? "{}");
    const subTypeLabels: Record<string, string> = {
      x_contacts: "X Contacts",
      x_tweets: "X Tweets",
      x_mentions: "X Mentions",
      x_enrich: "X Profiles",
      gmail_contacts: "Gmail Contacts",
      gmail_metadata: "Gmail Metadata",
      linkedin_contacts: "LinkedIn",
    };
    subLabel = subTypeLabels[config.syncSubType] ?? null;
  } catch { /* ignore */ }

  const durationSec = run.startedAt && run.completedAt
    ? run.completedAt - run.startedAt
    : null;

  return (
    <Link
      href={`/dashboard/workflows/${run.id}`}
      className="flex items-center justify-between px-4 py-3 hover:bg-muted/50 transition-colors"
    >
      <div className="flex items-center gap-3">
        <Badge variant="outline" className="text-[10px] px-1.5 py-0 w-[60px] justify-center">
          {typeLabels[run.workflowType] ?? run.workflowType}
        </Badge>
        <span className="text-sm">{subLabel ?? typeLabels[run.workflowType]}</span>
      </div>
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <span>
          {run.successItems > 0 && `${run.successItems} ok`}
          {run.errorItems > 0 && ` ${run.errorItems} err`}
          {run.successItems === 0 && run.errorItems === 0 && "-"}
        </span>
        {durationSec !== null && (
          <span className="font-mono">
            {durationSec < 60 ? `${durationSec}s` : `${Math.floor(durationSec / 60)}m`}
          </span>
        )}
        <Badge className={`${statusColors[run.status] ?? ""} text-[10px] px-1.5 py-0`}>
          {run.status}
        </Badge>
      </div>
    </Link>
  );
}
