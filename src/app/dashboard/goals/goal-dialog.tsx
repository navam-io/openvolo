"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Goal } from "@/lib/db/types";

const GOAL_TYPES = [
  { value: "audience_growth", label: "Audience Growth" },
  { value: "lead_generation", label: "Lead Generation" },
  { value: "content_engagement", label: "Content Engagement" },
  { value: "pipeline_progression", label: "Pipeline Progression" },
];

const UNITS = [
  "contacts",
  "followers",
  "leads",
  "engagements",
  "posts",
  "impressions",
];

interface GoalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  editGoal?: Goal;
}

export function GoalDialog({
  open,
  onOpenChange,
  onSuccess,
  editGoal,
}: GoalDialogProps) {
  const [name, setName] = useState("");
  const [goalType, setGoalType] = useState("lead_generation");
  const [targetValue, setTargetValue] = useState("");
  const [unit, setUnit] = useState("contacts");
  const [platform, setPlatform] = useState<string>("cross-platform");
  const [deadline, setDeadline] = useState("");
  const [saving, setSaving] = useState(false);

  // Populate form when editing
  useEffect(() => {
    if (editGoal) {
      setName(editGoal.name);
      setGoalType(editGoal.goalType);
      setTargetValue(String(editGoal.targetValue));
      setUnit(editGoal.unit);
      setPlatform(editGoal.platform ?? "cross-platform");
      setDeadline(
        editGoal.deadline
          ? new Date(editGoal.deadline * 1000).toISOString().split("T")[0]
          : ""
      );
    } else {
      setName("");
      setGoalType("lead_generation");
      setTargetValue("");
      setUnit("contacts");
      setPlatform("cross-platform");
      setDeadline("");
    }
  }, [editGoal, open]);

  async function handleSubmit() {
    if (!name.trim() || !targetValue) return;

    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        name: name.trim(),
        goalType,
        targetValue: parseInt(targetValue, 10),
        unit,
        platform: platform === "cross-platform" ? null : platform,
        deadline: deadline
          ? Math.floor(new Date(deadline).getTime() / 1000)
          : null,
      };

      const url = editGoal ? `/api/goals/${editGoal.id}` : "/api/goals";
      const method = editGoal ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        onOpenChange(false);
        onSuccess();
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{editGoal ? "Edit Goal" : "Create Goal"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="goal-name">Name</Label>
            <Input
              id="goal-name"
              placeholder="e.g. Generate 100 new leads"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Goal Type</Label>
              <Select value={goalType} onValueChange={setGoalType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {GOAL_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Platform</Label>
              <Select value={platform} onValueChange={setPlatform}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cross-platform">Cross-platform</SelectItem>
                  <SelectItem value="x">X / Twitter</SelectItem>
                  <SelectItem value="linkedin">LinkedIn</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="target-value">Target</Label>
              <Input
                id="target-value"
                type="number"
                min={1}
                placeholder="100"
                value={targetValue}
                onChange={(e) => setTargetValue(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Unit</Label>
              <Select value={unit} onValueChange={setUnit}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {UNITS.map((u) => (
                    <SelectItem key={u} value={u}>
                      {u}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="deadline">Deadline (optional)</Label>
            <Input
              id="deadline"
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={saving || !name.trim() || !targetValue}
          >
            {saving ? "Saving..." : editGoal ? "Update" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
