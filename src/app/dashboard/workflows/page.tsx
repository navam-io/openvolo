import { listWorkflowRuns } from "@/lib/db/queries/workflows";
import { WorkflowQuickActions } from "./workflow-quick-actions";
import { WorkflowViewSwitcher } from "./workflow-view-switcher";
import { TemplateGallery } from "./template-gallery";
import { ScheduledJobsList } from "./scheduled-jobs-list";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/empty-state";
import { GitBranch } from "lucide-react";

export default function WorkflowsPage() {
  const result = listWorkflowRuns({ pageSize: 100 });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-heading-1">Workflows</h1>
          <p className="text-muted-foreground mt-1">
            Run AI agents, track sync, enrichment, and pipeline progress.
          </p>
        </div>
        <WorkflowQuickActions />
      </div>

      {/* Template gallery at the top */}
      <TemplateGallery />

      {/* Scheduled jobs */}
      <ScheduledJobsList />

      {/* Workflow runs below */}
      {result.total === 0 ? (
        <Card className="border-border/50">
          <EmptyState
            icon={GitBranch}
            title="No workflows yet"
            description="Workflows are created automatically when you sync contacts, run enrichment, or launch an agent template above."
          />
        </Card>
      ) : (
        <WorkflowViewSwitcher runs={result.data} />
      )}
    </div>
  );
}
