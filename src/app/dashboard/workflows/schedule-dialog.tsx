"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CalendarClock, Loader2 } from "lucide-react";
import { CronExpressionParser } from "cron-parser";

interface ScheduleDialogProps {
  template: {
    id: string;
    name: string;
    templateType: string;
    config: string;
  };
  open: boolean;
  onClose: () => void;
}

const CRON_PRESETS: { label: string; value: string }[] = [
  { label: "Daily at 9:00 AM", value: "0 9 * * *" },
  { label: "Every weekday at 9:00 AM", value: "0 9 * * 1-5" },
  { label: "Weekly on Monday at 9:00 AM", value: "0 9 * * 1" },
  { label: "Monthly on the 1st at 9:00 AM", value: "0 9 1 * *" },
  { label: "Custom", value: "custom" },
];

function getNextRun(cronExpression: string): string | null {
  try {
    const interval = CronExpressionParser.parse(cronExpression);
    const next = interval.next();
    return next.toDate().toLocaleString();
  } catch {
    return null;
  }
}

export function ScheduleDialog({ template, open, onClose }: ScheduleDialogProps) {
  const router = useRouter();
  const [preset, setPreset] = useState("0 9 * * *");
  const [customCron, setCustomCron] = useState("");
  const [enabled, setEnabled] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Config overrides based on template type
  const templateConfig = useMemo(() => {
    try {
      return JSON.parse(template.config ?? "{}");
    } catch {
      return {};
    }
  }, [template.config]);

  const [maxResults, setMaxResults] = useState(
    String(templateConfig.maxResults ?? 20)
  );
  const [maxContacts, setMaxContacts] = useState(
    String(templateConfig.maxContacts ?? 10)
  );

  const cronExpression = preset === "custom" ? customCron : preset;
  const nextRun = useMemo(() => getNextRun(cronExpression), [cronExpression]);

  async function handleCreate() {
    if (!cronExpression) {
      setError("Please enter a cron expression");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      // Build config payload
      const payload: Record<string, unknown> = {};
      if (template.templateType === "prospecting") {
        payload.maxResults = parseInt(maxResults, 10) || 20;
      }
      if (template.templateType === "enrichment" || template.templateType === "pruning") {
        payload.maxContacts = parseInt(maxContacts, 10) || 10;
      }

      const res = await fetch("/api/workflows/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          templateId: template.id,
          cronExpression,
          payload,
          enabled,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "Failed to create schedule");
      }

      onClose();
      window.dispatchEvent(new Event("schedule-changed"));
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create schedule");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarClock className="h-4 w-4" />
            Schedule: {template.name}
          </DialogTitle>
          <DialogDescription>
            Set up a recurring schedule for this workflow template.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Cron preset */}
          <div className="space-y-2">
            <Label>Schedule</Label>
            <Select value={preset} onValueChange={setPreset}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CRON_PRESETS.map((p) => (
                  <SelectItem key={p.value} value={p.value}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Custom cron input */}
          {preset === "custom" && (
            <div className="space-y-2">
              <Label>Cron Expression</Label>
              <Input
                placeholder="0 9 * * 1"
                value={customCron}
                onChange={(e) => setCustomCron(e.target.value)}
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                Format: minute hour day-of-month month day-of-week
              </p>
            </div>
          )}

          {/* Next run preview */}
          {nextRun && (
            <div className="rounded-md bg-muted/50 px-3 py-2">
              <p className="text-xs text-muted-foreground">Next run</p>
              <p className="text-sm font-medium">{nextRun}</p>
            </div>
          )}

          {/* Config overrides */}
          {template.templateType === "prospecting" && (
            <div className="space-y-2">
              <Label>Max Results per Run</Label>
              <Input
                type="number"
                value={maxResults}
                onChange={(e) => setMaxResults(e.target.value)}
              />
            </div>
          )}

          {(template.templateType === "enrichment" || template.templateType === "pruning") && (
            <div className="space-y-2">
              <Label>Max Contacts per Run</Label>
              <Input
                type="number"
                value={maxContacts}
                onChange={(e) => setMaxContacts(e.target.value)}
              />
            </div>
          )}

          {/* Enable toggle */}
          <div className="flex items-center justify-between">
            <Label htmlFor="schedule-enabled">Enabled</Label>
            <Switch
              id="schedule-enabled"
              checked={enabled}
              onCheckedChange={setEnabled}
            />
          </div>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={saving}>
            {saving && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
            Create Schedule
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
