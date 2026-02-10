"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { Loader2, Plus, RefreshCw, Sparkles, Mail } from "lucide-react";
import { useRouter } from "next/navigation";

type SyncAction = {
  label: string;
  platform: string;
  endpoint: string;
  body: Record<string, unknown>;
  icon: typeof RefreshCw;
};

const SYNC_ACTIONS: SyncAction[] = [
  { label: "Sync X Tweets", platform: "x", endpoint: "/api/platforms/x/sync", body: { type: "tweets" }, icon: RefreshCw },
  { label: "Sync X Mentions", platform: "x", endpoint: "/api/platforms/x/sync", body: { type: "mentions" }, icon: RefreshCw },
  { label: "Sync X Contacts", platform: "x", endpoint: "/api/platforms/x/sync", body: { type: "contacts" }, icon: RefreshCw },
  { label: "Sync Gmail Contacts", platform: "gmail", endpoint: "/api/platforms/gmail/sync", body: { type: "contacts" }, icon: Mail },
  { label: "Sync Gmail Metadata", platform: "gmail", endpoint: "/api/platforms/gmail/sync", body: { type: "metadata" }, icon: Mail },
  { label: "Sync LinkedIn", platform: "linkedin", endpoint: "/api/platforms/linkedin/sync", body: { type: "contacts" }, icon: RefreshCw },
  { label: "Enrich X Profiles", platform: "x", endpoint: "/api/platforms/x/enrich", body: {}, icon: Sparkles },
];

export function WorkflowQuickActions() {
  const [mounted, setMounted] = useState(false);
  const [running, setRunning] = useState<string | null>(null);
  const router = useRouter();

  // Defer Radix DropdownMenu render to avoid SSR hydration ID mismatch
  useEffect(() => setMounted(true), []);

  async function handleAction(action: SyncAction) {
    setRunning(action.label);
    try {
      const res = await fetch(action.endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(action.body),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.workflowRunId) {
          router.push(`/dashboard/workflows/${data.workflowRunId}`);
          return;
        }
      }
      // Refresh page to show new workflow
      router.refresh();
    } catch {
      // Errors will be visible in the workflow run
      router.refresh();
    } finally {
      setRunning(null);
    }
  }

  if (!mounted) {
    return (
      <Button variant="outline" size="sm">
        <Plus className="mr-2 h-4 w-4" />
        Quick Action
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" disabled={!!running}>
          {running ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Plus className="mr-2 h-4 w-4" />
          )}
          {running ?? "Quick Action"}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Platform Sync</DropdownMenuLabel>
        {SYNC_ACTIONS.filter((a) => a.platform === "x" && a.endpoint.includes("sync")).map((action) => (
          <DropdownMenuItem
            key={action.label}
            onClick={() => handleAction(action)}
          >
            <action.icon className="mr-2 h-4 w-4" />
            {action.label}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        {SYNC_ACTIONS.filter((a) => a.platform === "gmail").map((action) => (
          <DropdownMenuItem
            key={action.label}
            onClick={() => handleAction(action)}
          >
            <action.icon className="mr-2 h-4 w-4" />
            {action.label}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        {SYNC_ACTIONS.filter((a) => a.platform === "linkedin").map((action) => (
          <DropdownMenuItem
            key={action.label}
            onClick={() => handleAction(action)}
          >
            <action.icon className="mr-2 h-4 w-4" />
            {action.label}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuLabel>Enrichment</DropdownMenuLabel>
        {SYNC_ACTIONS.filter((a) => a.endpoint.includes("enrich")).map((action) => (
          <DropdownMenuItem
            key={action.label}
            onClick={() => handleAction(action)}
          >
            <action.icon className="mr-2 h-4 w-4" />
            {action.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
