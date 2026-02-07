import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function CampaignDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Campaign Detail</h1>
      <Card>
        <CardHeader>
          <CardTitle>Campaign {id}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Campaign builder will be implemented in Phase 3.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
