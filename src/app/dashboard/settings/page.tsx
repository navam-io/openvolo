"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Key, CheckCircle, XCircle, Loader2, Monitor, Download } from "lucide-react";
import { PlatformConnectionCard } from "@/components/platform-connection-card";

type AuthSource = "env_var" | "config" | "none";

interface AuthState {
  status: "loading" | "ready";
  source: AuthSource;
  keyPrefix: string | null;
}

interface XConnectionState {
  loading: boolean;
  connected: boolean;
  displayName: string | null;
  status: "active" | "paused" | "needs_reauth" | null;
  lastSyncedAt: number | null;
  syncCapable: boolean;
  grantedScopes: string;
}

interface LinkedInConnectionState {
  loading: boolean;
  connected: boolean;
  displayName: string | null;
  status: "active" | "paused" | "needs_reauth" | null;
  lastSyncedAt: number | null;
}

interface SyncResultState {
  added: number;
  updated: number;
  skipped: number;
  errors: string[];
}

export default function SettingsPage() {
  return (
    <Suspense>
      <SettingsContent />
    </Suspense>
  );
}

function SettingsContent() {
  const searchParams = useSearchParams();
  const [apiKey, setApiKey] = useState("");
  const [auth, setAuth] = useState<AuthState>({ status: "loading", source: "none", keyPrefix: null });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // X connection state
  const [xState, setXState] = useState<XConnectionState>({
    loading: true,
    connected: false,
    displayName: null,
    status: null,
    lastSyncedAt: null,
    syncCapable: false,
    grantedScopes: "",
  });
  const [connecting, setConnecting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [syncResult, setSyncResult] = useState<SyncResultState | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Content sync state
  const [syncingContent, setSyncingContent] = useState<string | null>(null);
  const [contentSyncResult, setContentSyncResult] = useState<{ type: string; added: number; skipped: number } | null>(null);
  const [syncStatus, setSyncStatus] = useState<Record<string, { status: string; totalSynced: number; lastSyncedAt: number | null }>>({});

  // LinkedIn connection state
  const [liState, setLiState] = useState<LinkedInConnectionState>({
    loading: true,
    connected: false,
    displayName: null,
    status: null,
    lastSyncedAt: null,
  });
  const [liConnecting, setLiConnecting] = useState(false);
  const [liSyncing, setLiSyncing] = useState(false);
  const [liDisconnecting, setLiDisconnecting] = useState(false);
  const [liSyncResult, setLiSyncResult] = useState<SyncResultState | null>(null);

  function fetchAuth() {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((data) => {
        setAuth({ status: "ready", source: data.source ?? "none", keyPrefix: data.keyPrefix ?? null });
      })
      .catch(() => setAuth({ status: "ready", source: "none", keyPrefix: null }));
  }

  function fetchXStatus() {
    fetch("/api/platforms/x")
      .then((r) => r.json())
      .then((data) => {
        setXState({
          loading: false,
          connected: data.connected,
          displayName: data.account?.displayName ?? null,
          status: data.account?.status ?? null,
          lastSyncedAt: data.account?.lastSyncedAt ?? null,
          syncCapable: data.account?.syncCapable ?? false,
          grantedScopes: data.account?.grantedScopes ?? "",
        });
      })
      .catch(() => {
        setXState((prev) => ({ ...prev, loading: false }));
      });
  }

  function fetchSyncStatus() {
    fetch("/api/platforms/x/sync")
      .then((r) => r.json())
      .then((data) => {
        if (data.cursors) {
          setSyncStatus(data.cursors);
        }
      })
      .catch(() => {});
  }

  function fetchLinkedInStatus() {
    fetch("/api/platforms/linkedin")
      .then((r) => r.json())
      .then((data) => {
        setLiState({
          loading: false,
          connected: data.connected,
          displayName: data.account?.displayName ?? null,
          status: data.account?.status ?? null,
          lastSyncedAt: data.account?.lastSyncedAt ?? null,
        });
      })
      .catch(() => {
        setLiState((prev) => ({ ...prev, loading: false }));
      });
  }

  useEffect(() => {
    fetchAuth();
    fetchXStatus();
    fetchSyncStatus();
    fetchLinkedInStatus();
  }, []);

  // Handle OAuth callback query params
  useEffect(() => {
    const connected = searchParams.get("connected");
    const oauthError = searchParams.get("error");

    if (connected === "x") {
      setSuccessMessage("X account connected successfully!");
      fetchXStatus();
      window.history.replaceState({}, "", "/dashboard/settings");
    } else if (connected === "linkedin") {
      setSuccessMessage("LinkedIn account connected successfully!");
      fetchLinkedInStatus();
      window.history.replaceState({}, "", "/dashboard/settings");
    } else if (oauthError) {
      setError(`OAuth error: ${oauthError}`);
      window.history.replaceState({}, "", "/dashboard/settings");
    }
  }, [searchParams]);

  async function handleSave() {
    if (!apiKey.trim()) return;
    setSaving(true);
    setError(null);

    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "save_key", apiKey: apiKey.trim() }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error);
      } else {
        setApiKey("");
        fetchAuth();
      }
    } catch {
      setError("Failed to save API key");
    } finally {
      setSaving(false);
    }
  }

  async function handleClear() {
    await fetch("/api/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "clear_key" }),
    });
    fetchAuth();
  }

  async function handleXConnect(extended = false) {
    setConnecting(true);
    setError(null);

    try {
      const url = extended ? "/api/platforms/x/auth?extended=true" : "/api/platforms/x/auth";
      const res = await fetch(url);
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to start OAuth flow");
        return;
      }

      // Redirect to X authorization page
      window.location.href = data.authUrl;
    } catch {
      setError("Failed to connect to X");
    } finally {
      setConnecting(false);
    }
  }

  async function handleXDisconnect() {
    setDisconnecting(true);
    setError(null);

    try {
      const res = await fetch("/api/platforms/x", { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to disconnect");
        return;
      }
      setXState({
        loading: false,
        connected: false,
        displayName: null,
        status: null,
        lastSyncedAt: null,
        syncCapable: false,
        grantedScopes: "",
      });
      setSyncResult(null);
    } catch {
      setError("Failed to disconnect");
    } finally {
      setDisconnecting(false);
    }
  }

  async function handleXSync() {
    setSyncing(true);
    setSyncResult(null);
    setError(null);

    try {
      const res = await fetch("/api/platforms/x/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "full" }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Sync failed");
        return;
      }

      setSyncResult(data.result);
      fetchXStatus(); // Refresh last synced time
    } catch {
      setError("Sync failed");
    } finally {
      setSyncing(false);
    }
  }

  async function handleContentSync(type: "tweets" | "mentions") {
    setSyncingContent(type);
    setContentSyncResult(null);
    setError(null);

    try {
      const res = await fetch("/api/platforms/x/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Content sync failed");
        return;
      }

      setContentSyncResult({ type, added: data.result.added, skipped: data.result.skipped });
      fetchSyncStatus();
    } catch {
      setError("Content sync failed");
    } finally {
      setSyncingContent(null);
    }
  }

  async function handleLinkedInConnect() {
    setLiConnecting(true);
    setError(null);

    try {
      const res = await fetch("/api/platforms/linkedin/auth");
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to start LinkedIn OAuth flow");
        return;
      }

      window.location.href = data.authUrl;
    } catch {
      setError("Failed to connect to LinkedIn");
    } finally {
      setLiConnecting(false);
    }
  }

  async function handleLinkedInDisconnect() {
    setLiDisconnecting(true);
    setError(null);

    try {
      const res = await fetch("/api/platforms/linkedin", { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to disconnect");
        return;
      }
      setLiState({
        loading: false,
        connected: false,
        displayName: null,
        status: null,
        lastSyncedAt: null,
      });
      setLiSyncResult(null);
    } catch {
      setError("Failed to disconnect");
    } finally {
      setLiDisconnecting(false);
    }
  }

  async function handleLinkedInSync() {
    setLiSyncing(true);
    setLiSyncResult(null);
    setError(null);

    try {
      const res = await fetch("/api/platforms/linkedin/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "contacts" }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "LinkedIn sync failed");
        return;
      }

      setLiSyncResult(data.result);
      fetchLinkedInStatus();
    } catch {
      setError("LinkedIn sync failed");
    } finally {
      setLiSyncing(false);
    }
  }

  function getLinkedInConnectionStatus(): "disconnected" | "connected" | "needs_reauth" {
    if (!liState.connected) return "disconnected";
    if (liState.status === "needs_reauth") return "needs_reauth";
    return "connected";
  }

  function formatSyncTime(unix: number | null | undefined): string {
    if (!unix) return "Never";
    return new Date(unix * 1000).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  }

  function getXConnectionStatus(): "disconnected" | "connected" | "needs_reauth" {
    if (!xState.connected) return "disconnected";
    if (xState.status === "needs_reauth") return "needs_reauth";
    return "connected";
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-heading-1">Settings</h1>
        <p className="text-muted-foreground mt-1">
          Configure API keys and platform connections.
        </p>
      </div>

      {/* Success message */}
      {successMessage && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-800 dark:border-green-800 dark:bg-green-950 dark:text-green-200">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4" />
            {successMessage}
          </div>
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200">
          {error}
        </div>
      )}

      {/* Claude / Anthropic API Key */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2">
                <Key className="h-5 w-5" />
                Anthropic API Key
              </CardTitle>
              <CardDescription>
                Required for Claude-powered agents and AI chat. Get a key at{" "}
                <a
                  href="https://console.anthropic.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline"
                >
                  console.anthropic.com
                </a>
              </CardDescription>
            </div>
            {auth.status === "loading" ? (
              <Badge variant="outline">
                <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                Checking
              </Badge>
            ) : auth.source === "env_var" ? (
              <Badge variant="default" className="bg-green-600">
                <Monitor className="mr-1 h-3 w-3" />
                Environment Variable
              </Badge>
            ) : auth.source === "config" ? (
              <Badge variant="default" className="bg-green-600">
                <CheckCircle className="mr-1 h-3 w-3" />
                Connected
              </Badge>
            ) : (
              <Badge variant="secondary">
                <XCircle className="mr-1 h-3 w-3" />
                Not configured
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {auth.status === "loading" ? null : auth.source === "env_var" ? (
            /* State A: Env var detected */
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                API key detected from environment variable <code className="rounded bg-muted px-1 py-0.5 text-xs">ANTHROPIC_API_KEY</code>
              </p>
              {auth.keyPrefix && (
                <p className="font-mono text-sm text-muted-foreground">
                  {auth.keyPrefix}
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                To change this key, update your <code className="rounded bg-muted px-1 py-0.5 text-xs">.env.local</code> file and restart the server.
              </p>
            </div>
          ) : auth.source === "config" ? (
            /* State B: Saved key in config */
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">
                    API key saved and encrypted on this machine.
                  </p>
                  {auth.keyPrefix && (
                    <p className="font-mono text-sm text-muted-foreground">
                      {auth.keyPrefix}
                    </p>
                  )}
                </div>
                <Button variant="destructive" size="sm" onClick={handleClear}>
                  Remove Key
                </Button>
              </div>
            </div>
          ) : (
            /* State C: No key configured */
            <>
              <div className="space-y-2">
                <Label htmlFor="api-key">API Key</Label>
                <Input
                  id="api-key"
                  type="password"
                  placeholder="sk-ant-..."
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSave()}
                />
              </div>
              <Button onClick={handleSave} disabled={saving || !apiKey.trim()}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save & Validate
              </Button>
              <p className="text-xs text-muted-foreground">
                Or set <code className="rounded bg-muted px-1 py-0.5 text-xs">ANTHROPIC_API_KEY</code> in <code className="rounded bg-muted px-1 py-0.5 text-xs">.env.local</code> and restart the server.
              </p>
            </>
          )}
        </CardContent>
      </Card>

      <Separator />

      {/* Platform Connections */}
      <Card>
        <CardHeader>
          <CardTitle>Platform Connections</CardTitle>
          <CardDescription>
            Connect your social media accounts for AI-powered engagement.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {xState.loading ? (
            <div className="flex items-center justify-center rounded-lg border p-4">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              <span className="text-sm text-muted-foreground">Loading connection status...</span>
            </div>
          ) : (
            <PlatformConnectionCard
              platform="x"
              displayName="X / Twitter"
              accountHandle={xState.displayName ?? undefined}
              lastSyncedAt={xState.lastSyncedAt}
              status={getXConnectionStatus()}
              syncCapable={xState.syncCapable}
              grantedScopes={xState.grantedScopes || undefined}
              onConnect={() => handleXConnect(false)}
              onDisconnect={handleXDisconnect}
              onSync={handleXSync}
              onEnableSync={() => handleXConnect(true)}
              connecting={connecting}
              syncing={syncing}
              disconnecting={disconnecting}
            />
          )}

          {/* Sync results */}
          {syncResult && (
            <div className="rounded-lg border bg-muted/50 p-4 text-sm">
              <p className="font-medium mb-1">Sync Complete</p>
              <div className="flex gap-4 text-muted-foreground">
                <span>Added: {syncResult.added}</span>
                <span>Updated: {syncResult.updated}</span>
                <span>Skipped: {syncResult.skipped}</span>
              </div>
              {syncResult.errors.length > 0 && (
                <div className="mt-2 text-destructive">
                  <p className="font-medium">Errors:</p>
                  <ul className="list-disc pl-4">
                    {syncResult.errors.map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Content Sync Status */}
          {xState.connected && (
            <>
              <Separator />
              <div className="space-y-3">
                <h3 className="text-sm font-medium">Content Sync</h3>
                <p className="text-xs text-muted-foreground">
                  Import your tweets and mentions from X. Available on Free tier.
                </p>

                <div className="grid gap-3 sm:grid-cols-2">
                  {/* Tweets sync */}
                  <div className="rounded-lg border p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium">Tweets</p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleContentSync("tweets")}
                        disabled={syncingContent !== null}
                      >
                        {syncingContent === "tweets" ? (
                          <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                        ) : (
                          <Download className="mr-1 h-3 w-3" />
                        )}
                        Sync
                      </Button>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      <p>Total synced: {syncStatus.tweets?.totalSynced ?? 0}</p>
                      <p>Last sync: {formatSyncTime(syncStatus.tweets?.lastSyncedAt)}</p>
                    </div>
                  </div>

                  {/* Mentions sync */}
                  <div className="rounded-lg border p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium">Mentions</p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleContentSync("mentions")}
                        disabled={syncingContent !== null}
                      >
                        {syncingContent === "mentions" ? (
                          <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                        ) : (
                          <Download className="mr-1 h-3 w-3" />
                        )}
                        Sync
                      </Button>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      <p>Total synced: {syncStatus.mentions?.totalSynced ?? 0}</p>
                      <p>Last sync: {formatSyncTime(syncStatus.mentions?.lastSyncedAt)}</p>
                    </div>
                  </div>
                </div>

                {/* Content sync result */}
                {contentSyncResult && (
                  <div className="rounded-lg border bg-muted/50 p-3 text-sm">
                    <p className="font-medium mb-1">
                      {contentSyncResult.type === "tweets" ? "Tweet" : "Mention"} sync complete
                    </p>
                    <div className="flex gap-4 text-muted-foreground text-xs">
                      <span>Added: {contentSyncResult.added}</span>
                      <span>Skipped: {contentSyncResult.skipped}</span>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          {/* LinkedIn Connection */}
          {liState.loading ? (
            <div className="flex items-center justify-center rounded-lg border p-4">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              <span className="text-sm text-muted-foreground">Loading LinkedIn status...</span>
            </div>
          ) : (
            <PlatformConnectionCard
              platform="linkedin"
              displayName="LinkedIn"
              accountHandle={liState.displayName ?? undefined}
              lastSyncedAt={liState.lastSyncedAt}
              status={getLinkedInConnectionStatus()}
              syncCapable={true}
              onConnect={handleLinkedInConnect}
              onDisconnect={handleLinkedInDisconnect}
              onSync={handleLinkedInSync}
              connecting={liConnecting}
              syncing={liSyncing}
              disconnecting={liDisconnecting}
            />
          )}

          {/* LinkedIn sync results */}
          {liSyncResult && (
            <div className="rounded-lg border bg-muted/50 p-4 text-sm">
              <p className="font-medium mb-1">LinkedIn Sync Complete</p>
              <div className="flex gap-4 text-muted-foreground">
                <span>Added: {liSyncResult.added}</span>
                <span>Updated: {liSyncResult.updated}</span>
                <span>Skipped: {liSyncResult.skipped}</span>
              </div>
              {liSyncResult.errors.length > 0 && (
                <div className="mt-2 text-destructive">
                  <p className="font-medium">Errors:</p>
                  <ul className="list-disc pl-4">
                    {liSyncResult.errors.map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
