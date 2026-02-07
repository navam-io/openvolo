import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { GitBranch } from "lucide-react";

export default function WorkflowsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Workflows</h1>
        <p className="text-muted-foreground">
          Visualize your contact funnel and conversion metrics.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GitBranch className="h-5 w-5" />
            Funnel Visualization
          </CardTitle>
          <CardDescription>
            Funnel chart will be available in Phase 3.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Track contacts through stages: Prospect → Engaged → Qualified → Opportunity → Customer → Advocate.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
