"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Target,
  TrendingUp,
  Users,
  FileText,
  ArrowUpRight,
  Clock,
  Pencil,
  Pause,
  Play,
  Trash2,
  Plus,
  Link2,
  Unlink,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
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
import { AreaChartCard } from "@/components/charts/area-chart-card";
import { GoalDialog } from "../goal-dialog";
import { LinkWorkflowDialog } from "./link-workflow-dialog";
import type { GoalWithWorkflows } from "@/lib/db/queries/goals";
import type { GoalProgress } from "@/lib/db/types";

const GOAL_TYPE_LABELS: Record<string, string> = {
  audience_growth: "Audience Growth",
  lead_generation: "Lead Generation",
  content_engagement: "Content Engagement",
  pipeline_progression: "Pipeline Progression",
};

const GOAL_TYPE_ICONS: Record<string, typeof TrendingUp> = {
  audience_growth: TrendingUp,
  lead_generation: Users,
  content_engagement: FileText,
  pipeline_progression: ArrowUpRight,
};

interface GoalDetailClientProps {
  goal: GoalWithWorkflows;
  progress: GoalProgress[];
}

export function GoalDetailClient({ goal, progress }: GoalDetailClientProps) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [linkOpen, setLinkOpen] = useState(false);
  const [addingProgress, setAddingProgress] = useState(false);
  const [manualDelta, setManualDelta] = useState("");

  const Icon = GOAL_TYPE_ICONS[goal.goalType] ?? Target;
  const pct = goal.targetValue > 0
    ? Math.min(100, Math.round((goal.currentValue / goal.targetValue) * 100))
    : 0;

  // Build chart data from progress history (oldest first)
  const chartData = [...progress].reverse().map((p) => ({
    date: new Date(p.snapshotAt * 1000).toISOString().split("T")[0],
    value: p.value,
  }));

  async function togglePause() {
    const newStatus = goal.status === "paused" ? "active" : "paused";
    await fetch(`/api/goals/${goal.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    router.refresh();
  }

  async function handleDelete() {
    await fetch(`/api/goals/${goal.id}`, { method: "DELETE" });
    router.push("/dashboard/goals");
  }

  async function handleUnlink(linkId: string) {
    await fetch(`/api/goals/${goal.id}/link-workflow`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ linkId }),
    });
    router.refresh();
  }

  async function handleManualProgress() {
    const delta = parseInt(manualDelta, 10);
    if (!delta || isNaN(delta)) return;

    setAddingProgress(true);
    try {
      // Update current value and create progress snapshot
      await fetch(`/api/goals/${goal.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentValue: goal.currentValue + delta }),
      });
      // Create a progress record via the progress endpoint indirectly —
      // we'll do a manual entry by POSTing to the goals API
      // For now, refresh to show updated value
      setManualDelta("");
      router.refresh();
    } finally {
      setAddingProgress(false);
    }
  }

  function formatDate(unix: number): string {
    return new Date(unix * 1000).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard/goals">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <Icon className="h-5 w-5 text-muted-foreground" />
            <h1 className="text-heading-1">{goal.name}</h1>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="outline">
              {GOAL_TYPE_LABELS[goal.goalType] ?? goal.goalType}
            </Badge>
            <Badge variant={goal.status === "active" ? "default" : goal.status === "achieved" ? "secondary" : "outline"}>
              {goal.status}
            </Badge>
            {goal.platform && (
              <Badge variant="outline" className="capitalize">{goal.platform}</Badge>
            )}
            {goal.deadline && (
              <span className="text-sm text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Due {formatDate(goal.deadline)}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
            <Pencil className="h-4 w-4 mr-1" />
            Edit
          </Button>
          <Button variant="outline" size="sm" onClick={togglePause}>
            {goal.status === "paused" ? (
              <><Play className="h-4 w-4 mr-1" /> Resume</>
            ) : (
              <><Pause className="h-4 w-4 mr-1" /> Pause</>
            )}
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Trash2 className="h-4 w-4 mr-1" />
                Delete
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete goal?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete &ldquo;{goal.name}&rdquo; and all its progress history.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* Progress Overview */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-2xl font-bold">
              {goal.currentValue.toLocaleString()} <span className="text-base font-normal text-muted-foreground">/ {goal.targetValue.toLocaleString()} {goal.unit}</span>
            </span>
            <span className="text-lg font-semibold">{pct}%</span>
          </div>
          <Progress value={pct} className="h-3 mb-4" />
          <div className="flex items-center gap-2">
            <input
              type="number"
              className="flex h-9 w-24 rounded-md border border-input bg-background px-3 py-1 text-sm"
              placeholder="+10"
              value={manualDelta}
              onChange={(e) => setManualDelta(e.target.value)}
            />
            <Button
              size="sm"
              variant="outline"
              onClick={handleManualProgress}
              disabled={addingProgress || !manualDelta}
            >
              <Plus className="h-3 w-3 mr-1" />
              Add Progress
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Progress Chart */}
      <AreaChartCard
        title="Progress Over Time"
        description="Goal value tracked over the last 30 days"
        data={chartData}
        dataKeys={[{ key: "value", label: goal.unit, color: "var(--chart-1)" }]}
        xAxisKey="date"
      />

      {/* Linked Workflows */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-heading-3">Linked Workflows</CardTitle>
          <Button size="sm" variant="outline" onClick={() => setLinkOpen(true)}>
            <Link2 className="h-4 w-4 mr-1" />
            Link Workflow
          </Button>
        </CardHeader>
        <CardContent>
          {goal.linkedWorkflows.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No workflows linked. Link workflow templates to automatically track progress.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Template</TableHead>
                  <TableHead>Contribution</TableHead>
                  <TableHead className="w-20">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {goal.linkedWorkflows.map((lw) => (
                  <TableRow key={lw.id}>
                    <TableCell className="font-medium">{lw.templateName}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {lw.contribution}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleUnlink(lw.id)}
                      >
                        <Unlink className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Progress History */}
      {progress.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-heading-3">Progress History</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Value</TableHead>
                  <TableHead>Change</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Note</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {progress.slice(0, 20).map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="text-sm">
                      {formatDate(p.snapshotAt)}
                    </TableCell>
                    <TableCell>{p.value.toLocaleString()}</TableCell>
                    <TableCell>
                      <span className={p.delta > 0 ? "text-green-600" : p.delta < 0 ? "text-red-600" : ""}>
                        {p.delta > 0 ? "+" : ""}{p.delta}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground font-mono">
                      {p.source === "manual" ? "Manual" : p.source?.slice(0, 8) ?? "—"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {p.note ?? "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <GoalDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        onSuccess={() => router.refresh()}
        editGoal={goal}
      />

      <LinkWorkflowDialog
        open={linkOpen}
        onOpenChange={setLinkOpen}
        goalId={goal.id}
        existingTemplateIds={goal.linkedWorkflows.map((lw) => lw.templateId)}
        onSuccess={() => router.refresh()}
      />
    </div>
  );
}
