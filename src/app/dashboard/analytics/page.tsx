import { AnalyticsDashboard } from "./analytics-dashboard";

export default function AnalyticsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-heading-1">Analytics</h1>
        <p className="text-muted-foreground mt-1">
          Track contact pipeline, AI costs, engagement, and sync health.
        </p>
      </div>
      <AnalyticsDashboard />
    </div>
  );
}
