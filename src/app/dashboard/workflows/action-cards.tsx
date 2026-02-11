"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  Play,
  Upload,
  RefreshCw,
  Sparkles,
  Mail,
  Lock,
} from "lucide-react";
import { cn } from "@/lib/utils";

type ActionDef = {
  id: string;
  label: string;
  description: string;
  platform: "x" | "linkedin" | "gmail";
  endpoint: string;
  body: Record<string, unknown>;
  type: "api" | "upload";
  icon: typeof RefreshCw;
};

const ACTIONS: ActionDef[] = [
  // X
  { id: "x-sync-posts", label: "Sync Posts", description: "Import your recent tweets from X.", platform: "x", endpoint: "/api/platforms/x/sync", body: { type: "tweets" }, type: "api", icon: RefreshCw },
  { id: "x-sync-mentions", label: "Sync Mentions", description: "Import recent mentions of your account.", platform: "x", endpoint: "/api/platforms/x/sync", body: { type: "mentions" }, type: "api", icon: RefreshCw },
  { id: "x-sync-contacts", label: "Sync Contacts", description: "Import followers and following from X.", platform: "x", endpoint: "/api/platforms/x/sync", body: { type: "contacts" }, type: "api", icon: RefreshCw },
  { id: "x-enrich", label: "Enrich Profiles", description: "Enrich contacts with X profile data.", platform: "x", endpoint: "/api/platforms/x/enrich", body: {}, type: "api", icon: Sparkles },
  { id: "x-enrich-low", label: "Enrich Low-Score", description: "Enrich contacts with low enrichment scores.", platform: "x", endpoint: "/api/platforms/x/enrich", body: { lowScore: true }, type: "api", icon: Sparkles },
  // LinkedIn
  { id: "li-sync-connections", label: "Sync Connections", description: "Import connections from LinkedIn.", platform: "linkedin", endpoint: "/api/platforms/linkedin/sync", body: { type: "contacts" }, type: "api", icon: RefreshCw },
  { id: "li-import-csv", label: "Import Connections CSV", description: "Upload a LinkedIn connections CSV export.", platform: "linkedin", endpoint: "/api/platforms/linkedin/import", body: {}, type: "upload", icon: Upload },
  // Gmail
  { id: "gm-sync-contacts", label: "Sync Contacts", description: "Import contacts from Google Contacts.", platform: "gmail", endpoint: "/api/platforms/gmail/sync", body: { type: "contacts" }, type: "api", icon: Mail },
  { id: "gm-sync-metadata", label: "Sync Metadata", description: "Enrich contacts with email interaction data.", platform: "gmail", endpoint: "/api/platforms/gmail/sync", body: { type: "metadata" }, type: "api", icon: Mail },
];

const PLATFORM_LABELS: Record<string, string> = {
  x: "X / Twitter",
  linkedin: "LinkedIn",
  gmail: "Gmail / Google",
};

const PLATFORM_GROUPS = ["x", "linkedin", "gmail"] as const;

type PlatformStatus = {
  connected: boolean;
  loading: boolean;
  syncCapable: boolean;
  grantedScopes: string;
  hasBrowserSession: boolean;
};

/** Per-action restriction: reason text, optional navigation target, and whether the button is disabled (no nav target). */
type Restriction = {
  reason: string;
  navigateTo?: string;
};

function getActionRestriction(
  actionId: string,
  status: PlatformStatus
): Restriction | null {
  switch (actionId) {
    case "x-sync-contacts":
      if (!status.syncCapable) {
        return { reason: "Requires X API Basic tier ($200/mo)" };
      }
      break;
    case "x-enrich":
    case "x-enrich-low":
      if (!status.hasBrowserSession) {
        return {
          reason: "Set up Browser Session in Settings",
          navigateTo: "/dashboard/settings",
        };
      }
      break;
    case "li-sync-connections":
      if (!status.syncCapable) {
        return {
          reason: "Requires r_connections scope — Reconnect",
          navigateTo: "/dashboard/settings",
        };
      }
      break;
  }
  return null;
}

export function ActionCards() {
  const router = useRouter();
  const [running, setRunning] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ id: string; message: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadActionId, setUploadActionId] = useState<string | null>(null);

  // Connection status for each platform (expanded with capability data)
  const [platformStatus, setPlatformStatus] = useState<Record<string, PlatformStatus>>({
    x: { connected: false, loading: true, syncCapable: false, grantedScopes: "", hasBrowserSession: false },
    linkedin: { connected: false, loading: true, syncCapable: false, grantedScopes: "", hasBrowserSession: false },
    gmail: { connected: false, loading: true, syncCapable: false, grantedScopes: "", hasBrowserSession: false },
  });

  useEffect(() => {
    // Fetch platform statuses + enrich capability in parallel
    Promise.allSettled([
      fetch("/api/platforms/x").then((r) => r.json()),
      fetch("/api/platforms/linkedin").then((r) => r.json()),
      fetch("/api/platforms/gmail").then((r) => r.json()),
      fetch("/api/platforms/x/enrich").then((r) => r.json()),
    ]).then(([xRes, liRes, gmRes, xEnrichRes]) => {
      const xData = xRes.status === "fulfilled" ? xRes.value : {};
      const liData = liRes.status === "fulfilled" ? liRes.value : {};
      const gmData = gmRes.status === "fulfilled" ? gmRes.value : {};
      const xEnrichData = xEnrichRes.status === "fulfilled" ? xEnrichRes.value : {};

      setPlatformStatus({
        x: {
          connected: !!xData.connected,
          loading: false,
          syncCapable: xData.account?.syncCapable ?? false,
          grantedScopes: xData.account?.grantedScopes ?? "",
          hasBrowserSession: !!xEnrichData.hasBrowserSession,
        },
        linkedin: {
          connected: !!liData.connected,
          loading: false,
          syncCapable: liData.account?.syncCapable ?? false,
          grantedScopes: liData.account?.grantedScopes ?? "",
          hasBrowserSession: false, // LinkedIn doesn't use browser sessions for actions
        },
        gmail: {
          connected: !!gmData.connected,
          loading: false,
          syncCapable: true, // Gmail has no tier restrictions
          grantedScopes: gmData.account?.grantedScopes ?? "",
          hasBrowserSession: false,
        },
      });
    });
  }, []);

  const handleAction = useCallback(async (action: ActionDef) => {
    if (action.type === "upload") {
      setUploadActionId(action.id);
      fileInputRef.current?.click();
      return;
    }

    setRunning(action.id);
    setError(null);
    setResult(null);

    try {
      const res = await fetch(action.endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(action.body),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Action failed");
        return;
      }

      if (data.workflowRunId) {
        router.push(`/dashboard/workflows/${data.workflowRunId}`);
        return;
      }

      const added = data.result?.added ?? 0;
      const updated = data.result?.updated ?? 0;
      const skipped = data.result?.skipped ?? 0;
      setResult({
        id: action.id,
        message: `Done. Added: ${added}, Updated: ${updated}, Skipped: ${skipped}`,
      });
      router.refresh();
    } catch {
      setError("Action failed");
    } finally {
      setRunning(null);
    }
  }, [router]);

  const handleFileUpload = useCallback(async (file: File) => {
    const action = ACTIONS.find((a) => a.id === uploadActionId);
    if (!action) return;

    setRunning(action.id);
    setError(null);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch(action.endpoint, {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Import failed");
        return;
      }

      const added = data.result?.added ?? 0;
      const updated = data.result?.updated ?? 0;
      setResult({
        id: action.id,
        message: `Import complete. Added: ${added}, Updated: ${updated}`,
      });
      router.refresh();
    } catch {
      setError("Import failed");
    } finally {
      setRunning(null);
      setUploadActionId(null);
    }
  }, [uploadActionId, router]);

  return (
    <div className="space-y-6">
      {/* Hidden file input for CSV uploads */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFileUpload(file);
          e.target.value = "";
        }}
      />

      {/* Error / Result banners */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200">
          {error}
        </div>
      )}
      {result && (
        <div className="rounded-lg border bg-muted/50 p-3 text-sm">
          {result.message}
        </div>
      )}

      {/* Grouped by platform */}
      {PLATFORM_GROUPS.map((platform) => {
        const actions = ACTIONS.filter((a) => a.platform === platform);
        const status = platformStatus[platform];
        const isConnected = status?.connected;
        const isLoading = status?.loading;

        return (
          <div key={platform} className="space-y-3">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-medium">{PLATFORM_LABELS[platform]}</h3>
              {isLoading ? (
                <Badge variant="outline" className="text-[10px]">
                  <Loader2 className="mr-1 h-2.5 w-2.5 animate-spin" />
                  Checking
                </Badge>
              ) : isConnected ? (
                <Badge variant="default" className="bg-green-600 text-[10px]">
                  Connected
                </Badge>
              ) : (
                <Badge variant="secondary" className="text-[10px]">
                  Not connected
                </Badge>
              )}
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {actions.map((action) => {
                const isRunning = running === action.id;
                // CSV import doesn't need platform connection
                const needsConnection = action.type !== "upload" && !isConnected && !isLoading;
                // Check per-action restrictions (only when connected)
                const restriction = isConnected && !isLoading
                  ? getActionRestriction(action.id, status)
                  : null;
                const isBlocked = needsConnection || !!restriction;
                const IconComponent = restriction ? Lock : action.icon;

                return (
                  <Card
                    key={action.id}
                    className={cn(
                      "transition-colors",
                      isBlocked
                        ? "opacity-60 border-dashed"
                        : "hover:border-primary/50"
                    )}
                  >
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <div className={cn(
                            "rounded-md p-1.5",
                            restriction ? "bg-amber-100 dark:bg-amber-950" : "bg-muted"
                          )}>
                            <IconComponent className={cn(
                              "h-3.5 w-3.5",
                              restriction ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground"
                            )} />
                          </div>
                          <CardTitle className="text-sm">{action.label}</CardTitle>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0 space-y-3">
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {action.description}
                      </p>

                      {restriction && (
                        <p className="text-xs text-amber-600 dark:text-amber-400">
                          {restriction.reason}
                        </p>
                      )}

                      {result?.id === action.id && (
                        <p className="text-xs text-muted-foreground">{result.message}</p>
                      )}

                      <Button
                        size="sm"
                        className="w-full h-8"
                        variant={isBlocked ? "secondary" : "default"}
                        onClick={() => {
                          if (needsConnection) {
                            router.push("/dashboard/settings");
                          } else if (restriction?.navigateTo) {
                            router.push(restriction.navigateTo);
                          } else if (!restriction) {
                            handleAction(action);
                          }
                        }}
                        disabled={isRunning || isLoading || (!!restriction && !restriction.navigateTo)}
                      >
                        {isRunning ? (
                          <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />
                        ) : restriction ? (
                          <Lock className="mr-1.5 h-3 w-3" />
                        ) : (
                          <Play className="mr-1.5 h-3 w-3" />
                        )}
                        {needsConnection
                          ? "Connect first"
                          : restriction?.navigateTo
                            ? "Go to Settings"
                            : restriction
                              ? "Restricted"
                              : isRunning
                                ? "Running..."
                                : "Run"}
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
