import { Badge } from "@/components/ui/badge";
import {
  Globe,
  Monitor,
  Search,
  Brain,
  Users,
  UserPlus,
  Archive,
  GitBranch,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  XCircle,
  Clock,
  Loader2,
  SkipForward,
} from "lucide-react";
import type { WorkflowStep } from "@/lib/db/types";
import { formatWorkflowError } from "@/lib/workflows/format-error";

const STEP_TYPE_CONFIG: Record<
  string,
  { label: string; icon: typeof Globe; color: string }
> = {
  url_fetch: { label: "URL Fetch", icon: Globe, color: "text-blue-500" },
  browser_scrape: { label: "Browser Scrape", icon: Monitor, color: "text-purple-500" },
  web_search: { label: "Web Search", icon: Search, color: "text-green-500" },
  llm_extract: { label: "LLM Extract", icon: Brain, color: "text-amber-500" },
  contact_merge: { label: "Contact Merge", icon: Users, color: "text-cyan-500" },
  contact_create: { label: "Contact Create", icon: UserPlus, color: "text-emerald-500" },
  contact_archive: { label: "Contact Archive", icon: Archive, color: "text-orange-500" },
  routing_decision: { label: "Routing Decision", icon: GitBranch, color: "text-indigo-500" },
  sync_page: { label: "Sync", icon: RefreshCw, color: "text-sky-500" },
  error: { label: "Error", icon: AlertCircle, color: "text-destructive" },
};

const STATUS_ICONS: Record<string, typeof CheckCircle> = {
  pending: Clock,
  running: Loader2,
  completed: CheckCircle,
  failed: XCircle,
  skipped: SkipForward,
};

function formatTime(unixSeconds: number): string {
  return new Date(unixSeconds * 1000).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

function formatDurationMs(ms: number | null): string {
  if (ms === null) return "";
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function parseJson(str: string | null): Record<string, unknown> | null {
  if (!str) return null;
  try {
    const parsed = JSON.parse(str);
    if (typeof parsed === "object" && parsed !== null) return parsed as Record<string, unknown>;
    return null;
  } catch {
    return null;
  }
}

export function WorkflowStepTimeline({ steps }: { steps: WorkflowStep[] }) {
  if (steps.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-4">
        No steps recorded yet.
      </p>
    );
  }

  return (
    <div className="space-y-1">
      {steps.map((step) => {
        const config = STEP_TYPE_CONFIG[step.stepType] ?? STEP_TYPE_CONFIG.error;
        const StepIcon = config.icon;
        const StatusIcon = STATUS_ICONS[step.status] ?? Clock;
        const output = parseJson(step.output);

        return (
          <div
            key={step.id}
            className="flex items-start gap-3 py-2 px-3 rounded-md hover:bg-muted/50 text-sm"
          >
            {/* Timestamp */}
            <span className="text-xs font-mono text-muted-foreground w-[70px] shrink-0 pt-0.5">
              {formatTime(step.createdAt)}
            </span>

            {/* Step type badge */}
            <div className="flex items-center gap-1.5 w-[140px] shrink-0">
              <StepIcon className={`h-3.5 w-3.5 ${config.color}`} />
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-normal">
                {config.label}
              </Badge>
            </div>

            {/* Description / details */}
            <div className="flex-1 min-w-0 space-y-0.5">
              {step.tool && (
                <span className="text-xs text-muted-foreground">{step.tool}</span>
              )}
              {step.url && (
                <p className="text-xs font-mono truncate text-muted-foreground">
                  {step.url}
                </p>
              )}
              {step.error && (() => {
                const friendly = formatWorkflowError(step.error);
                return (
                  <p className="text-xs text-destructive" title={step.error}>
                    {friendly.title}
                    {friendly.detail && (
                      <span className="text-muted-foreground ml-1">— {friendly.detail}</span>
                    )}
                  </p>
                );
              })()}
              {output && Object.keys(output).length > 0 && !step.error && (
                <p className="text-xs text-muted-foreground">
                  {Object.entries(output)
                    .filter(([, v]) => v !== undefined && v !== null && v !== 0)
                    .map(([k, v]) => `${k}: ${v}`)
                    .join(", ")}
                </p>
              )}
            </div>

            {/* Status + duration */}
            <div className="flex items-center gap-2 shrink-0">
              {step.durationMs !== null && step.durationMs > 0 && (
                <span className="text-[10px] text-muted-foreground font-mono">
                  {formatDurationMs(step.durationMs)}
                </span>
              )}
              <StatusIcon
                className={`h-3.5 w-3.5 ${
                  step.status === "completed"
                    ? "text-green-500"
                    : step.status === "failed"
                      ? "text-destructive"
                      : step.status === "running"
                        ? "text-blue-500 animate-spin"
                        : "text-muted-foreground"
                }`}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
