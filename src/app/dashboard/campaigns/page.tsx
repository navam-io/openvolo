import { Card } from "@/components/ui/card";
import { Megaphone } from "lucide-react";
import { EmptyState } from "@/components/empty-state";

export default function CampaignsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-heading-1">Campaigns</h1>
        <p className="text-muted-foreground mt-1">
          Create and manage outreach and engagement campaigns.
        </p>
      </div>

      <Card className="border-border/50">
        <EmptyState
          icon={Megaphone}
          title="No campaigns yet"
          description="Build multi-step outreach sequences with AI-powered personalization. Campaigns will be available in Phase 3."
        />
      </Card>
    </div>
  );
}
