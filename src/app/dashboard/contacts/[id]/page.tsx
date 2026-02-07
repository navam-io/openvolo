import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function ContactDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Contact Detail</h1>
      <Card>
        <CardHeader>
          <CardTitle>Contact {id}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Contact details will be implemented in Phase 1.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
