"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Search,
  Sparkles,
  Trash2,
  Bot,
  Loader2,
  Play,
  DollarSign,
  Clock,
  Hash,
} from "lucide-react";
import { ActivateDialog } from "./activate-dialog";

interface Template {
  id: string;
  name: string;
  description: string | null;
  templateType: string;
  status: string;
  systemPrompt: string | null;
  targetPersona: string | null;
  estimatedCost: number;
  totalRuns: number;
  lastRunAt: number | null;
  config: string;
}

const TYPE_ICONS: Record<string, typeof Search> = {
  prospecting: Search,
  enrichment: Sparkles,
  pruning: Trash2,
  outreach: Bot,
  engagement: Bot,
  content: Bot,
  nurture: Bot,
};

const TYPE_LABELS: Record<string, string> = {
  prospecting: "Search",
  enrichment: "Enrich",
  pruning: "Prune",
  outreach: "Sequence",
  engagement: "Agent",
  content: "Agent",
  nurture: "Agent",
};

const TYPE_COLORS: Record<string, string> = {
  prospecting: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  enrichment: "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300",
  pruning: "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300",
};

function formatRelativeTime(unixSeconds: number): string {
  const now = Math.floor(Date.now() / 1000);
  const diff = now - unixSeconds;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export function TemplateGallery() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTemplate, setActiveTemplate] = useState<Template | null>(null);
  const [filter, setFilter] = useState<string>("all");

  useEffect(() => {
    fetch("/api/workflows/templates?pageSize=50")
      .then((r) => r.json())
      .then((data) => {
        setTemplates(data.data ?? []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const filteredTemplates =
    filter === "all"
      ? templates
      : templates.filter((t) => {
          if (filter === "search") return t.templateType === "prospecting";
          if (filter === "enrich") return t.templateType === "enrichment";
          if (filter === "prune") return t.templateType === "pruning";
          return true;
        });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (templates.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Agent Templates</h2>
        <div className="flex items-center gap-1">
          {[
            { key: "all", label: "All" },
            { key: "search", label: "Search" },
            { key: "enrich", label: "Enrich" },
            { key: "prune", label: "Prune" },
          ].map((tab) => (
            <Button
              key={tab.key}
              variant={filter === tab.key ? "default" : "ghost"}
              size="sm"
              className="h-7 text-xs"
              onClick={() => setFilter(tab.key)}
            >
              {tab.label}
            </Button>
          ))}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {filteredTemplates.map((template) => {
          const Icon = TYPE_ICONS[template.templateType] ?? Bot;
          const typeLabel = TYPE_LABELS[template.templateType] ?? "Agent";
          const typeColor = TYPE_COLORS[template.templateType] ?? "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300";

          return (
            <Card
              key={template.id}
              className="hover:border-primary/50 transition-colors"
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="rounded-md bg-muted p-1.5">
                      <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                    </div>
                    <CardTitle className="text-sm">{template.name}</CardTitle>
                  </div>
                  <Badge
                    variant="outline"
                    className={`text-[10px] px-1.5 py-0 shrink-0 ${typeColor}`}
                  >
                    {typeLabel}
                  </Badge>
                </div>
                <CardDescription className="text-xs line-clamp-2 mt-1">
                  {template.description}
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0 space-y-3">
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <DollarSign className="h-3 w-3" />
                    ~${template.estimatedCost.toFixed(2)}
                  </span>
                  <span className="flex items-center gap-1">
                    <Hash className="h-3 w-3" />
                    {template.totalRuns} run{template.totalRuns !== 1 ? "s" : ""}
                  </span>
                  {template.lastRunAt && (
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatRelativeTime(template.lastRunAt)}
                    </span>
                  )}
                </div>
                <Button
                  size="sm"
                  className="w-full h-8"
                  onClick={() => setActiveTemplate(template)}
                >
                  <Play className="mr-1.5 h-3 w-3" />
                  Run
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {activeTemplate && (
        <ActivateDialog
          template={activeTemplate}
          open={!!activeTemplate}
          onClose={() => setActiveTemplate(null)}
        />
      )}
    </div>
  );
}
