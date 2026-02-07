import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Bot } from "lucide-react";

export default function AgentsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Agents</h1>
        <p className="text-muted-foreground">
          Monitor and manage AI agent runs on a Kanban board.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5" />
            No agent runs yet
          </CardTitle>
          <CardDescription>
            Agent infrastructure will be available in Phase 2.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Kanban board with Queued, Running, Completed, and Failed columns.
            Live SSE updates and step-by-step execution traces.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
