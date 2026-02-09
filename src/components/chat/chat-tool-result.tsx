"use client";

import { useState } from "react";
import {
  Users,
  User,
  BarChart3,
  Workflow,
  FileText,
  UserPlus,
  CheckSquare,
  Play,
  ChevronDown,
  ChevronRight,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ChatToolResultProps {
  toolName: string;
  state: string;
  input?: Record<string, unknown>;
  output?: unknown;
}

const TOOL_META: Record<string, { label: string; icon: React.ElementType }> = {
  query_contacts: { label: "Search Contacts", icon: Users },
  get_contact: { label: "Contact Details", icon: User },
  query_analytics: { label: "Analytics", icon: BarChart3 },
  query_workflows: { label: "Workflows", icon: Workflow },
  query_content: { label: "Content", icon: FileText },
  create_contact: { label: "Create Contact", icon: UserPlus },
  create_task: { label: "Create Task", icon: CheckSquare },
  start_workflow: { label: "Start Workflow", icon: Play },
};

export function ChatToolResult({ toolName, state, input, output }: ChatToolResultProps) {
  const [showRaw, setShowRaw] = useState(false);
  const meta = TOOL_META[toolName] ?? { label: toolName, icon: Workflow };
  const Icon = meta.icon;
  const isLoading = state === "input-streaming" || state === "input-available";
  const hasOutput = state === "output-available";

  return (
    <div className="my-1.5 rounded-lg border border-border/60 bg-muted/30 text-sm overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border/40">
        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="font-medium text-xs">{meta.label}</span>
        {isLoading && (
          <Loader2 className="h-3 w-3 animate-spin text-muted-foreground ml-auto" />
        )}
      </div>

      {hasOutput && output != null ? (
        <div className="px-3 py-2">
          <ToolOutput toolName={toolName} output={output as Record<string, unknown>} />
        </div>
      ) : null}

      {hasOutput && output != null ? (
        <button
          onClick={() => setShowRaw(!showRaw)}
          className="flex items-center gap-1 px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground border-t border-border/40 w-full"
        >
          {showRaw ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
          Raw JSON
        </button>
      ) : null}

      {showRaw ? (
        <pre className="px-3 py-2 text-xs overflow-x-auto max-h-48 bg-muted/50 border-t border-border/40">
          {JSON.stringify(output, null, 2)}
        </pre>
      ) : null}
    </div>
  );
}

function ToolOutput({ toolName, output }: { toolName: string; output: Record<string, unknown> }) {
  switch (toolName) {
    case "query_contacts":
      return <ContactsTable output={output} />;
    case "get_contact":
      return <ContactCard output={output} />;
    case "query_analytics":
      return <AnalyticsSummary output={output} />;
    case "query_workflows":
      return <WorkflowsList output={output} />;
    case "query_content":
      return <ContentList output={output} />;
    case "create_contact":
    case "create_task":
      return <SuccessCard output={output} />;
    case "start_workflow":
      return <WorkflowStarted output={output} />;
    default:
      return <pre className="text-xs">{JSON.stringify(output, null, 2)}</pre>;
  }
}

function ContactsTable({ output }: { output: Record<string, unknown> }) {
  const contacts = (output.contacts ?? []) as Array<Record<string, unknown>>;
  const total = output.total as number;

  if (contacts.length === 0) {
    return <p className="text-muted-foreground text-xs">No contacts found.</p>;
  }

  return (
    <div>
      <p className="text-xs text-muted-foreground mb-1.5">{total} total contact{total !== 1 ? "s" : ""}</p>
      <div className="space-y-1">
        {contacts.slice(0, 8).map((c) => (
          <div key={c.id as string} className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="font-medium truncate">{c.name as string}</span>
              {c.company ? (
                <span className="text-muted-foreground truncate">
                  @ {c.company as string}
                </span>
              ) : null}
            </div>
            <span className={cn(
              "text-xs tabular-nums shrink-0 ml-2",
              (c.score as number) >= 70 ? "text-green-600 dark:text-green-400" :
              (c.score as number) >= 40 ? "text-yellow-600 dark:text-yellow-400" :
              "text-muted-foreground"
            )}>
              {c.score as number}%
            </span>
          </div>
        ))}
      </div>
      {contacts.length > 8 && (
        <p className="text-xs text-muted-foreground mt-1">+{contacts.length - 8} more</p>
      )}
    </div>
  );
}

function ContactCard({ output }: { output: Record<string, unknown> }) {
  if (output.error) {
    return <p className="text-destructive text-xs">{output.error as string}</p>;
  }

  const identities = (output.identities ?? []) as Array<Record<string, unknown>>;

  return (
    <div className="space-y-1 text-xs">
      <p className="font-medium">{output.name as string}</p>
      {output.title ? <p className="text-muted-foreground">{output.title as string}{output.company ? ` @ ${output.company as string}` : ""}</p> : null}
      {output.email ? <p className="text-muted-foreground">{output.email as string}</p> : null}
      <p>Score: <span className="font-medium">{output.enrichmentScore as number}%</span> | Stage: {output.funnelStage as string}</p>
      {identities.length > 0 ? (
        <p className="text-muted-foreground">{identities.length} identit{identities.length === 1 ? "y" : "ies"}: {identities.map((i) => `${i.platform}/${i.handle}`).join(", ")}</p>
      ) : null}
    </div>
  );
}

function AnalyticsSummary({ output }: { output: Record<string, unknown> }) {
  return (
    <div className="grid grid-cols-2 gap-2 text-xs">
      <Stat label="Contacts" value={output.totalContacts as number} />
      <Stat label="Active Workflows" value={output.activeWorkflows as number} />
      <Stat label="Pending Tasks" value={output.pendingTasks as number} />
      <Stat label="Content Items" value={output.contentItems as number} />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded border border-border/40 px-2 py-1.5">
      <p className="text-muted-foreground">{label}</p>
      <p className="font-semibold text-base tabular-nums">{value}</p>
    </div>
  );
}

function WorkflowsList({ output }: { output: Record<string, unknown> }) {
  const runs = (output.runs ?? []) as Array<Record<string, unknown>>;
  const total = output.total as number;

  if (runs.length === 0) {
    return <p className="text-muted-foreground text-xs">No workflow runs found.</p>;
  }

  return (
    <div>
      <p className="text-xs text-muted-foreground mb-1.5">{total} total run{total !== 1 ? "s" : ""}</p>
      <div className="space-y-1">
        {runs.slice(0, 5).map((r) => (
          <div key={r.id as string} className="flex items-center justify-between text-xs">
            <span className="truncate">{r.type as string}</span>
            <span className={cn(
              "shrink-0 ml-2",
              r.status === "completed" ? "text-green-600 dark:text-green-400" :
              r.status === "failed" ? "text-destructive" :
              r.status === "running" ? "text-blue-600 dark:text-blue-400" :
              "text-muted-foreground"
            )}>
              {r.status as string}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ContentList({ output }: { output: Record<string, unknown> }) {
  const items = (output.items ?? []) as Array<Record<string, unknown>>;
  const total = output.total as number;

  if (items.length === 0) {
    return <p className="text-muted-foreground text-xs">No content items found.</p>;
  }

  return (
    <div>
      <p className="text-xs text-muted-foreground mb-1.5">{total} total item{total !== 1 ? "s" : ""}</p>
      <div className="space-y-1">
        {items.slice(0, 5).map((item) => (
          <div key={item.id as string} className="text-xs">
            <span className="font-medium truncate">{(item.title as string) || (item.body as string)?.slice(0, 50) || "Untitled"}</span>
            <span className="text-muted-foreground ml-1.5">{item.contentType as string} · {item.status as string}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function SuccessCard({ output }: { output: Record<string, unknown> }) {
  return (
    <div className="text-xs">
      <p className="text-green-600 dark:text-green-400 font-medium">{output.message as string}</p>
    </div>
  );
}

function WorkflowStarted({ output }: { output: Record<string, unknown> }) {
  if (output.templates) {
    const templates = output.templates as Array<Record<string, unknown>>;
    return (
      <div>
        <p className="text-xs text-muted-foreground mb-1.5">{output.message as string}</p>
        <div className="space-y-1">
          {templates.map((t) => (
            <div key={t.id as string} className="text-xs">
              <span className="font-medium">{t.name as string}</span>
              {t.description ? <span className="text-muted-foreground ml-1.5">{(t.description as string).slice(0, 60)}</span> : null}
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="text-xs">
      <p className="text-green-600 dark:text-green-400 font-medium">{output.message as string}</p>
      <p className="text-muted-foreground">Status: {output.status as string}</p>
    </div>
  );
}
