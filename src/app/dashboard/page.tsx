import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Megaphone, CheckSquare, FileText } from "lucide-react";
import { getDashboardMetrics } from "@/lib/db/queries/dashboard";
import { FunnelStageBadge } from "@/components/funnel-stage-badge";
import { PriorityBadge } from "@/components/priority-badge";
import Link from "next/link";

export default function DashboardPage() {
  const metrics = getDashboardMetrics();

  const stats = [
    {
      title: "Contacts",
      value: metrics.totalContacts.toString(),
      description: "Total contacts in CRM",
      icon: Users,
    },
    {
      title: "Campaigns",
      value: metrics.activeCampaigns.toString(),
      description: "Active campaigns",
      icon: Megaphone,
    },
    {
      title: "Pending Tasks",
      value: metrics.pendingTasks.toString(),
      description: "Tasks needing attention",
      icon: CheckSquare,
    },
    {
      title: "Content",
      value: metrics.contentItems.toString(),
      description: "Items in library",
      icon: FileText,
    },
  ];

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
            <CardTitle>Recent Contacts</CardTitle>
            <CardDescription>Latest contacts added to your CRM</CardDescription>
          </CardHeader>
          <CardContent>
            {metrics.recentContacts.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No contacts yet. Add your first contact to get started.
              </p>
            ) : (
              <div className="space-y-3">
                {metrics.recentContacts.map((contact) => (
                  <Link
                    key={contact.id}
                    href={`/dashboard/contacts/${contact.id}`}
                    className="flex items-center justify-between rounded-md p-2 hover:bg-muted transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{contact.name}</p>
                      {contact.company && (
                        <p className="text-xs text-muted-foreground truncate">
                          {contact.company}
                        </p>
                      )}
                    </div>
                    <FunnelStageBadge stage={contact.funnelStage} />
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Pending Tasks</CardTitle>
            <CardDescription>Tasks needing your attention</CardDescription>
          </CardHeader>
          <CardContent>
            {metrics.pendingTasksList.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No pending tasks. All caught up!
              </p>
            ) : (
              <div className="space-y-3">
                {metrics.pendingTasksList.map((task) => (
                  <div
                    key={task.id}
                    className="flex items-center justify-between rounded-md p-2"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{task.title}</p>
                      {task.description && (
                        <p className="text-xs text-muted-foreground truncate">
                          {task.description}
                        </p>
                      )}
                    </div>
                    <PriorityBadge priority={task.priority} />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
