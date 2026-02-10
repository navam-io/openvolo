"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { CalendarClock, Trash2, Loader2 } from "lucide-react";

interface ScheduledJob {
  id: string;
  jobType: string;
  templateId: string | null;
  cronExpression: string | null;
  enabled: number;
  status: string;
  runAt: number;
  lastTriggeredAt: number | null;
  payload: string | null;
  error: string | null;
  createdAt: number;
}

interface TemplateMap {
  [id: string]: string;
}

function formatCron(cron: string | null): string {
  if (!cron) return "—";
  // Common cron expression descriptions
  const presets: Record<string, string> = {
    "0 9 * * *": "Daily at 9:00 AM",
    "0 9 * * 1-5": "Weekdays at 9:00 AM",
    "0 9 * * 1": "Weekly on Monday",
    "0 9 1 * *": "Monthly on the 1st",
  };
  return presets[cron] ?? cron;
}

function formatTimestamp(ts: number | null): string {
  if (!ts) return "—";
  return new Date(ts * 1000).toLocaleString();
}

export function ScheduledJobsList() {
  const router = useRouter();
  const [jobs, setJobs] = useState<ScheduledJob[]>([]);
  const [templateNames, setTemplateNames] = useState<TemplateMap>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/workflows/schedule").then((r) => r.json()),
      fetch("/api/workflows/templates?pageSize=50").then((r) => r.json()),
    ])
      .then(([scheduleData, templateData]) => {
        setJobs(scheduleData.data ?? []);
        const names: TemplateMap = {};
        for (const t of templateData.data ?? []) {
          names[t.id] = t.name;
        }
        setTemplateNames(names);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  async function handleToggle(jobId: string, currentEnabled: number) {
    const newEnabled = currentEnabled === 1 ? false : true;
    await fetch(`/api/workflows/schedule/${jobId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: newEnabled }),
    });
    setJobs((prev) =>
      prev.map((j) =>
        j.id === jobId ? { ...j, enabled: newEnabled ? 1 : 0 } : j
      )
    );
  }

  async function handleDelete(jobId: string) {
    await fetch(`/api/workflows/schedule/${jobId}`, { method: "DELETE" });
    setJobs((prev) => prev.filter((j) => j.id !== jobId));
    router.refresh();
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (jobs.length === 0) return null;

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold flex items-center gap-2">
        <CalendarClock className="h-4 w-4" />
        Scheduled Workflows
      </h2>
      <Card>
        <div className="rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Template</TableHead>
                <TableHead>Schedule</TableHead>
                <TableHead>Next Run</TableHead>
                <TableHead>Last Run</TableHead>
                <TableHead className="w-20">Enabled</TableHead>
                <TableHead className="w-16" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {jobs.map((job) => (
                <TableRow key={job.id}>
                  <TableCell className="font-medium">
                    {job.templateId
                      ? templateNames[job.templateId] ?? "Unknown"
                      : "—"}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="font-mono text-xs">
                      {formatCron(job.cronExpression)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatTimestamp(job.runAt)}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatTimestamp(job.lastTriggeredAt)}
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={job.enabled === 1}
                      onCheckedChange={() =>
                        handleToggle(job.id, job.enabled)
                      }
                    />
                  </TableCell>
                  <TableCell>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete schedule?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will permanently remove this recurring schedule.
                            It will not affect previous workflow runs.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDelete(job.id)}
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
