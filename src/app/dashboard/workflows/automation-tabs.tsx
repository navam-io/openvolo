"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { TemplateGallery } from "./template-gallery";
import { ScheduledJobsList } from "./scheduled-jobs-list";
import { ActionCards } from "./action-cards";
import { WorkflowViewSwitcher } from "./workflow-view-switcher";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/empty-state";
import { Zap } from "lucide-react";
import type { WorkflowRun } from "@/lib/db/types";

const TABS = [
  { key: "agents", label: "Agents" },
  { key: "actions", label: "Actions" },
  { key: "runs", label: "Runs" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

interface AutomationTabsProps {
  runs: WorkflowRun[];
  totalRuns: number;
}

function AutomationTabsInner({ runs, totalRuns }: AutomationTabsProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeTab = (searchParams.get("tab") as TabKey) || "agents";

  function setTab(tab: TabKey) {
    const params = new URLSearchParams(searchParams.toString());
    if (tab === "agents") {
      params.delete("tab");
    } else {
      params.set("tab", tab);
    }
    router.push(`/dashboard/workflows?${params.toString()}`);
  }

  return (
    <div className="space-y-6">
      {/* Tab bar */}
      <div className="flex items-center gap-1 border-b">
        {TABS.map((tab) => (
          <Button
            key={tab.key}
            variant="ghost"
            size="sm"
            className={`h-9 rounded-none border-b-2 px-4 ${
              activeTab === tab.key
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
            onClick={() => setTab(tab.key)}
          >
            {tab.label}
          </Button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === "agents" && (
        <div className="space-y-6">
          <TemplateGallery />
          <ScheduledJobsList />
        </div>
      )}

      {activeTab === "actions" && (
        <ActionCards />
      )}

      {activeTab === "runs" && (
        <>
          {totalRuns === 0 ? (
            <Card className="border-border/50">
              <EmptyState
                icon={Zap}
                title="No runs yet"
                description="Runs are created when you execute agents or sync actions."
              />
            </Card>
          ) : (
            <WorkflowViewSwitcher runs={runs} />
          )}
        </>
      )}
    </div>
  );
}

export function AutomationTabs(props: AutomationTabsProps) {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <AutomationTabsInner {...props} />
    </Suspense>
  );
}
