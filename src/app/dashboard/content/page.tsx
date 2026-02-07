import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText } from "lucide-react";

export default function ContentPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Content</h1>
        <p className="text-muted-foreground">
          Create, schedule, and publish content across platforms.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            No content yet
          </CardTitle>
          <CardDescription>
            Content library will be available in Phase 3.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            AI-assisted content creation with Tiptap editor and platform-specific formatting.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
