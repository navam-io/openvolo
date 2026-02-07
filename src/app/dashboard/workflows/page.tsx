import { Card } from "@/components/ui/card";
import { GitBranch } from "lucide-react";
import { EmptyState } from "@/components/empty-state";

export default function WorkflowsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-heading-1">Workflows</h1>
        <p className="text-muted-foreground mt-1">
          Visualize your contact funnel and conversion metrics.
        </p>
      </div>

      <Card className="border-border/50">
        <EmptyState
          icon={GitBranch}
          title="Funnel Visualization"
          description="Track contacts through stages: Prospect, Engaged, Qualified, Opportunity, Customer, Advocate. Funnel chart will be available in Phase 3."
        />
      </Card>
    </div>
  );
}
