"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Key, CheckCircle, XCircle, Loader2 } from "lucide-react";

export default function SettingsPage() {
  const [apiKey, setApiKey] = useState("");
  const [authStatus, setAuthStatus] = useState<"loading" | "connected" | "none">("loading");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((data) => {
        setAuthStatus(data.hasKey ? "connected" : "none");
      })
      .catch(() => setAuthStatus("none"));
  }, []);

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
        setAuthStatus("connected");
        setApiKey("");
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
    setAuthStatus("none");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Configure API keys and platform connections.
        </p>
      </div>

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
            {authStatus === "loading" ? (
              <Badge variant="outline">
                <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                Checking
              </Badge>
            ) : authStatus === "connected" ? (
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
          {authStatus === "connected" ? (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                API key is saved and encrypted on this machine.
              </p>
              <Button variant="destructive" size="sm" onClick={handleClear}>
                Remove Key
              </Button>
            </div>
          ) : (
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
              {error && (
                <p className="text-sm text-destructive">{error}</p>
              )}
              <Button onClick={handleSave} disabled={saving || !apiKey.trim()}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save & Validate
              </Button>
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
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div>
              <p className="font-medium">X / Twitter</p>
              <p className="text-sm text-muted-foreground">
                Connect via OAuth 2.0 or API key
              </p>
            </div>
            <Badge variant="secondary">Coming in Phase 1</Badge>
          </div>
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div>
              <p className="font-medium">LinkedIn</p>
              <p className="text-sm text-muted-foreground">
                Connect via OAuth 2.0 or browser session
              </p>
            </div>
            <Badge variant="secondary">Coming in Phase 4</Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
