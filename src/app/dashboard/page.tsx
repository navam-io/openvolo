import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Megaphone, Bot, FileText } from "lucide-react";

const stats = [
  {
    title: "Contacts",
    value: "0",
    description: "Total contacts in CRM",
    icon: Users,
  },
  {
    title: "Campaigns",
    value: "0",
    description: "Active campaigns",
    icon: Megaphone,
  },
  {
    title: "Agent Runs",
    value: "0",
    description: "Completed today",
    icon: Bot,
  },
  {
    title: "Content",
    value: "0",
    description: "Items in library",
    icon: FileText,
  },
];

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Your AI-powered social CRM at a glance.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground">{stat.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest agent runs and engagements</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              No activity yet. Connect a platform and run your first agent to get started.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Get started with OpenVolo</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm text-muted-foreground">
              1. Go to Settings and add your Anthropic API key
            </p>
            <p className="text-sm text-muted-foreground">
              2. Connect your X/Twitter account
            </p>
            <p className="text-sm text-muted-foreground">
              3. Import or create your first contacts
            </p>
            <p className="text-sm text-muted-foreground">
              4. Launch an AI agent to research and engage
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
