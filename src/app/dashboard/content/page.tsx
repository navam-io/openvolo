import { Card } from "@/components/ui/card";
import { FileText } from "lucide-react";
import { EmptyState } from "@/components/empty-state";

export default function ContentPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-heading-1">Content</h1>
        <p className="text-muted-foreground mt-1">
          Create, schedule, and publish content across platforms.
        </p>
      </div>

      <Card className="border-border/50">
        <EmptyState
          icon={FileText}
          title="No content yet"
          description="AI-assisted content creation with platform-specific formatting. Content library will be available in Phase 3."
        />
      </Card>
    </div>
  );
}
