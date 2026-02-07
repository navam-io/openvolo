"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { ContactForm } from "@/components/contact-form";
import { AddTaskDialog } from "@/components/add-task-dialog";
import { FunnelStageBadge } from "@/components/funnel-stage-badge";
import { PriorityBadge } from "@/components/priority-badge";
import { ArrowLeft, Trash2, Save, CheckCircle2, Circle } from "lucide-react";
import Link from "next/link";
import type { Contact, Task } from "@/lib/db/types";

const platformLabels: Record<string, string> = {
  x: "X / Twitter",
  linkedin: "LinkedIn",
  gmail: "Gmail",
  substack: "Substack",
};

interface ContactDetailClientProps {
  contact: Contact;
  tasks: Task[];
}

export function ContactDetailClient({ contact, tasks }: ContactDetailClientProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const formChanges = useRef<Record<string, string>>({});

  async function handleSave() {
    const data = formChanges.current;
    if (Object.keys(data).length === 0) return;

    setSaving(true);
    try {
      const res = await fetch(`/api/contacts/${contact.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        formChanges.current = {};
        router.refresh();
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      const res = await fetch(`/api/contacts/${contact.id}`, { method: "DELETE" });
      if (res.ok) {
        router.push("/dashboard/contacts");
        router.refresh();
      }
    } finally {
      setDeleting(false);
    }
  }

  async function handleToggleTask(task: Task) {
    const newStatus = task.status === "done" ? "todo" : "done";
    await fetch(`/api/tasks/${task.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    router.refresh();
  }

  async function handleDeleteTask(taskId: string) {
    await fetch(`/api/tasks/${taskId}`, { method: "DELETE" });
    router.refresh();
  }

  let tags: string[] = [];
  if (contact.tags) {
    try { tags = JSON.parse(contact.tags); } catch { /* malformed JSON, ignore */ }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/contacts">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-heading-1">{contact.name}</h1>
            <div className="flex items-center gap-2 mt-1">
              {contact.company && (
                <span className="text-muted-foreground">{contact.company}</span>
              )}
              {contact.title && (
                <span className="text-muted-foreground">
                  {contact.company ? ` · ${contact.title}` : contact.title}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <FunnelStageBadge stage={contact.funnelStage} />
          <Badge variant="secondary">Score: {contact.score}</Badge>
        </div>
      </div>

      <Tabs defaultValue="details">
        <TabsList>
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="tasks">Tasks ({tasks.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Contact Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {contact.headline && (
                <p className="text-sm text-muted-foreground">{contact.headline}</p>
              )}
              {contact.bio && <p className="text-sm">{contact.bio}</p>}

              <div className="grid grid-cols-2 gap-4 text-sm">
                {contact.email && (
                  <div>
                    <span className="text-muted-foreground">Email: </span>
                    {contact.email}
                  </div>
                )}
                {contact.phone && (
                  <div>
                    <span className="text-muted-foreground">Phone: </span>
                    {contact.phone}
                  </div>
                )}
                {contact.platform && (
                  <div>
                    <span className="text-muted-foreground">Platform: </span>
                    {platformLabels[contact.platform] ?? contact.platform}
                  </div>
                )}
                {contact.profileUrl && (
                  <div>
                    <span className="text-muted-foreground">Profile: </span>
                    <a
                      href={contact.profileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      View Profile
                    </a>
                  </div>
                )}
              </div>

              {tags.length > 0 && (
                <div className="flex gap-1 flex-wrap">
                  {tags.map((tag) => (
                    <Badge key={tag} variant="secondary">
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Edit Contact</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <ContactForm
                defaultValues={contact}
                onChange={(partial) => {
                  formChanges.current = { ...formChanges.current, ...partial };
                }}
              />
              <div className="flex justify-between">
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" disabled={deleting}>
                      <Trash2 className="mr-2 h-4 w-4" />
                      {deleting ? "Deleting..." : "Delete Contact"}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete contact?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will permanently delete {contact.name} and all associated
                        tasks. This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleDelete}>
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
                <Button onClick={handleSave} disabled={saving}>
                  <Save className="mr-2 h-4 w-4" />
                  {saving ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tasks" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Tasks</h3>
            <AddTaskDialog relatedContactId={contact.id} />
          </div>

          {tasks.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground text-center">
                  No tasks for this contact yet.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {tasks.map((task) => (
                <Card key={task.id}>
                  <CardContent className="flex items-center justify-between py-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <button onClick={() => handleToggleTask(task)}>
                        {task.status === "done" ? (
                          <CheckCircle2 className="h-5 w-5 text-green-500" />
                        ) : (
                          <Circle className="h-5 w-5 text-muted-foreground" />
                        )}
                      </button>
                      <div className="min-w-0">
                        <p
                          className={`text-sm font-medium truncate ${
                            task.status === "done" ? "line-through text-muted-foreground" : ""
                          }`}
                        >
                          {task.title}
                        </p>
                        {task.description && (
                          <p className="text-xs text-muted-foreground truncate">
                            {task.description}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <PriorityBadge priority={task.priority} />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteTask(task.id)}
                      >
                        <Trash2 className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
