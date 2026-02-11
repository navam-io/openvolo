"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
  CalendarClock,
  Copy,
  Pencil,
  Plus,
  Heart,
  UserPlus,
  MessageSquare,
} from "lucide-react";
import { ActivateDialog } from "./activate-dialog";
import { ScheduleDialog } from "./schedule-dialog";
import { TemplateBuilder } from "./template-builder";

interface Template {
  id: string;
  name: string;
  description: string | null;
  templateType: string;
  platform: string | null;
  status: string;
  systemPrompt: string | null;
  targetPersona: string | null;
  estimatedCost: number;
  totalRuns: number;
  lastRunAt: number | null;
  config: string;
  isSystem: number;
  sourceTemplateId: string | null;
}

const TYPE_ICONS: Record<string, typeof Search> = {
  prospecting: Search,
  enrichment: Sparkles,
  pruning: Trash2,
  outreach: UserPlus,
  engagement: Heart,
  content: MessageSquare,
  nurture: Bot,
};

const TYPE_LABELS: Record<string, string> = {
  prospecting: "Search",
  enrichment: "Enrich",
  pruning: "Prune",
  outreach: "Outreach",
  engagement: "Engage",
  content: "Content",
  nurture: "Nurture",
};

const TYPE_COLORS: Record<string, string> = {
  prospecting: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  enrichment: "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300",
  pruning: "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300",
  content: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300",
  engagement: "bg-pink-100 text-pink-700 dark:bg-pink-900 dark:text-pink-300",
  outreach: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900 dark:text-cyan-300",
};

const FILTER_TABS = [
  { key: "all", label: "All" },
  { key: "search", label: "Search" },
  { key: "enrich", label: "Enrich" },
  { key: "prune", label: "Prune" },
  { key: "content", label: "Content" },
  { key: "engagement", label: "Engage" },
  { key: "outreach", label: "Outreach" },
];

function formatRelativeTime(unixSeconds: number): string {
  const now = Math.floor(Date.now() / 1000);
  const diff = now - unixSeconds;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function filterByType(templates: Template[], filter: string): Template[] {
  if (filter === "all") return templates;
  const typeMap: Record<string, string> = {
    search: "prospecting",
    enrich: "enrichment",
    prune: "pruning",
    content: "content",
    engagement: "engagement",
    outreach: "outreach",
  };
  return templates.filter((t) => t.templateType === typeMap[filter]);
}

export function TemplateGallery() {
  const [systemTemplates, setSystemTemplates] = useState<Template[]>([]);
  const [userTemplates, setUserTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTemplate, setActiveTemplate] = useState<Template | null>(null);
  const [scheduleTemplate, setScheduleTemplate] = useState<Template | null>(null);
  const [editTemplate, setEditTemplate] = useState<Template | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Template | null>(null);
  const [builderOpen, setBuilderOpen] = useState(false);
  const [section, setSection] = useState<"system" | "user">("system");
  const [filter, setFilter] = useState<string>("all");
  const [cloning, setCloning] = useState<string | null>(null);

  const fetchTemplates = useCallback(() => {
    setLoading(true);
    Promise.all([
      fetch("/api/workflows/templates?isSystem=true&pageSize=50").then((r) => r.json()),
      fetch("/api/workflows/templates?isSystem=false&pageSize=50").then((r) => r.json()),
    ])
      .then(([sys, usr]) => {
        setSystemTemplates(sys.data ?? []);
        setUserTemplates(usr.data ?? []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const handleClone = async (templateId: string) => {
    setCloning(templateId);
    try {
      const res = await fetch(`/api/workflows/templates/${templateId}/clone`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (res.ok) {
        fetchTemplates();
        setSection("user");
      }
    } finally {
      setCloning(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const res = await fetch(`/api/workflows/templates/${deleteTarget.id}`, {
      method: "DELETE",
    });
    if (res.ok) {
      fetchTemplates();
    }
    setDeleteTarget(null);
  };

  const templates = section === "system" ? systemTemplates : userTemplates;
  const filtered = filterByType(templates, filter);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Section tabs */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          <Button
            variant={section === "system" ? "default" : "ghost"}
            size="sm"
            className="h-8"
            onClick={() => { setSection("system"); setFilter("all"); }}
          >
            System Agents
            <Badge variant="secondary" className="ml-1.5 h-4 px-1 text-[10px]">
              {systemTemplates.length}
            </Badge>
          </Button>
          <Button
            variant={section === "user" ? "default" : "ghost"}
            size="sm"
            className="h-8"
            onClick={() => { setSection("user"); setFilter("all"); }}
          >
            My Agents
            <Badge variant="secondary" className="ml-1.5 h-4 px-1 text-[10px]">
              {userTemplates.length}
            </Badge>
          </Button>
        </div>
        {section === "user" && (
          <Button size="sm" className="h-8" onClick={() => setBuilderOpen(true)}>
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            Create Agent
          </Button>
        )}
      </div>

      {/* Sub-filter tabs */}
      <div className="flex items-center gap-1">
        {FILTER_TABS.map((tab) => (
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

      {/* Template grid */}
      {filtered.length === 0 ? (
        <div className="py-8 text-center text-sm text-muted-foreground">
          {section === "user"
            ? "No custom agents yet. Create one or clone a system agent."
            : "No agents match the current filter."}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((template) => {
            const Icon = TYPE_ICONS[template.templateType] ?? Bot;
            const typeLabel = TYPE_LABELS[template.templateType] ?? "Agent";
            const typeColor =
              TYPE_COLORS[template.templateType] ??
              "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300";
            const isSystem = template.isSystem === 1;

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
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      className="flex-1 h-8"
                      onClick={() => setActiveTemplate(template)}
                    >
                      <Play className="mr-1.5 h-3 w-3" />
                      Run
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 px-2"
                      onClick={() => setScheduleTemplate(template)}
                      title="Schedule recurring run"
                    >
                      <CalendarClock className="h-3.5 w-3.5" />
                    </Button>
                    {isSystem ? (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 px-2"
                        onClick={() => handleClone(template.id)}
                        disabled={cloning === template.id}
                        title="Clone to My Agents"
                      >
                        {cloning === template.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                      </Button>
                    ) : (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 px-2"
                          onClick={() => setEditTemplate(template)}
                          title="Edit agent"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 px-2 text-destructive hover:text-destructive"
                          onClick={() => setDeleteTarget(template)}
                          title="Delete agent"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {activeTemplate && (
        <ActivateDialog
          template={activeTemplate}
          open={!!activeTemplate}
          onClose={() => setActiveTemplate(null)}
        />
      )}

      {scheduleTemplate && (
        <ScheduleDialog
          template={scheduleTemplate}
          open={!!scheduleTemplate}
          onClose={() => setScheduleTemplate(null)}
        />
      )}

      {(builderOpen || editTemplate) && (
        <TemplateBuilder
          open={builderOpen || !!editTemplate}
          onClose={() => {
            setBuilderOpen(false);
            setEditTemplate(null);
          }}
          onSaved={() => {
            setBuilderOpen(false);
            setEditTemplate(null);
            fetchTemplates();
          }}
          editTemplate={editTemplate ?? undefined}
        />
      )}

      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete agent?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete &quot;{deleteTarget?.name}&quot;. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
