import { Card } from "@/components/ui/card";
import { Bot } from "lucide-react";
import { EmptyState } from "@/components/empty-state";

export default function AgentsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-heading-1">Agents</h1>
        <p className="text-muted-foreground mt-1">
          Monitor and manage AI agent runs on a Kanban board.
        </p>
      </div>

      <Card className="border-border/50">
        <EmptyState
          icon={Bot}
          title="No agent runs yet"
          description="Kanban board with Queued, Running, Completed, and Failed columns. Live SSE updates and step-by-step execution traces. Agent infrastructure will be available in Phase 2."
        />
      </Card>
    </div>
  );
}
