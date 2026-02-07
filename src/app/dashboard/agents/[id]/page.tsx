import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function AgentRunDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Agent Run</h1>
      <Card>
        <CardHeader>
          <CardTitle>Run {id}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Agent run trace view will be implemented in Phase 2.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
