"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  Loader2,
  RefreshCw,
  Unplug,
} from "lucide-react";

type ConnectionStatus = "disconnected" | "connected" | "needs_reauth";

interface PlatformConnectionCardProps {
  platform: string;
  displayName: string;
  accountHandle?: string;
  lastSyncedAt?: number | null;
  status: ConnectionStatus;
  onConnect: () => void;
  onDisconnect: () => void;
  onSync: () => void;
  connecting?: boolean;
  syncing?: boolean;
  disconnecting?: boolean;
}

function formatRelativeTime(unixSeconds: number): string {
  const now = Math.floor(Date.now() / 1000);
  const diff = now - unixSeconds;

  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export function PlatformConnectionCard({
  displayName,
  accountHandle,
  lastSyncedAt,
  status,
  onConnect,
  onDisconnect,
  onSync,
  connecting,
  syncing,
  disconnecting,
}: PlatformConnectionCardProps) {
  return (
    <div className="flex items-center justify-between rounded-lg border p-4">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <p className="font-medium">{displayName}</p>
          {status === "connected" && (
            <Badge variant="default" className="bg-green-600">
              <CheckCircle className="mr-1 h-3 w-3" />
              Connected
            </Badge>
          )}
          {status === "needs_reauth" && (
            <Badge variant="destructive">
              <AlertTriangle className="mr-1 h-3 w-3" />
              Needs Re-auth
            </Badge>
          )}
          {status === "disconnected" && (
            <Badge variant="secondary">
              <XCircle className="mr-1 h-3 w-3" />
              Not connected
            </Badge>
          )}
        </div>

        {status === "connected" && accountHandle && (
          <p className="text-sm text-muted-foreground">
            Signed in as <span className="font-mono">{accountHandle}</span>
          </p>
        )}
        {status === "connected" && lastSyncedAt && (
          <p className="text-xs text-muted-foreground">
            Last synced {formatRelativeTime(lastSyncedAt)}
          </p>
        )}
        {status === "disconnected" && (
          <p className="text-sm text-muted-foreground">
            Connect via OAuth 2.0 to import contacts
          </p>
        )}
        {status === "needs_reauth" && (
          <p className="text-sm text-muted-foreground">
            Your session expired. Reconnect to continue syncing.
          </p>
        )}
      </div>

      <div className="flex items-center gap-2">
        {status === "disconnected" && (
          <Button onClick={onConnect} disabled={connecting}>
            {connecting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Connect
          </Button>
        )}

        {status === "needs_reauth" && (
          <Button onClick={onConnect} variant="outline" disabled={connecting}>
            {connecting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Reconnect
          </Button>
        )}

        {status === "connected" && (
          <>
            <Button
              onClick={onSync}
              variant="outline"
              size="sm"
              disabled={syncing}
            >
              {syncing ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}
              {syncing ? "Syncing..." : "Sync Now"}
            </Button>
            <Button
              onClick={onDisconnect}
              variant="ghost"
              size="sm"
              disabled={disconnecting}
              className="text-destructive hover:text-destructive"
            >
              {disconnecting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Unplug className="mr-2 h-4 w-4" />
              )}
              Disconnect
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
