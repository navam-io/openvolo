"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { Archive, RotateCcw, Users, ShieldCheck, ShieldX } from "lucide-react";

interface PruneResultData {
  evaluated: number;
  archived: number;
  kept: number;
  archivedContacts: {
    contactId: string;
    contactName: string;
    reason: string;
  }[];
}

export function PruneResults({
  runId,
  resultJson,
}: {
  runId: string;
  resultJson: string;
}) {
  const router = useRouter();
  const [restoringAll, setRestoringAll] = useState(false);
  const [restoredIds, setRestoredIds] = useState<Set<string>>(new Set());
  const [restoredAll, setRestoredAll] = useState(false);

  let pruneResult: PruneResultData | null = null;
  try {
    const parsed = JSON.parse(resultJson);
    pruneResult = parsed.pruneResult ?? null;
  } catch {
    return null;
  }

  if (!pruneResult || pruneResult.archived === 0) return null;

  const visibleContacts = restoredAll
    ? []
    : pruneResult.archivedContacts.filter((c) => !restoredIds.has(c.contactId));

  async function handleRestore(contactId: string) {
    const res = await fetch(`/api/contacts/${contactId}/restore`, { method: "POST" });
    if (res.ok) {
      setRestoredIds((prev) => new Set([...prev, contactId]));
      router.refresh();
    }
  }

  async function handleRestoreAll() {
    setRestoringAll(true);
    const res = await fetch(`/api/workflows/${runId}/restore-all`, { method: "POST" });
    if (res.ok) {
      setRestoredAll(true);
      router.refresh();
    }
    setRestoringAll(false);
  }

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium flex items-center gap-2">
          <Archive className="h-4 w-4" />
          Prune Results
        </h2>
        {visibleContacts.length > 0 && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="sm" disabled={restoringAll}>
                <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
                Restore All
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Restore all archived contacts?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will restore {visibleContacts.length} contact{visibleContacts.length !== 1 ? "s" : ""} that were
                  archived by this prune workflow. They will reappear in your contacts list.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleRestoreAll}>
                  Restore All
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>

      {/* Summary stat cards */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="p-3 text-center">
          <p className="text-2xl font-semibold tabular-nums flex items-center justify-center gap-1.5">
            <Users className="h-4 w-4 text-muted-foreground" />
            {pruneResult.evaluated}
          </p>
          <p className="text-xs text-muted-foreground">Evaluated</p>
        </Card>
        <Card className="p-3 text-center">
          <p className="text-2xl font-semibold tabular-nums flex items-center justify-center gap-1.5">
            <ShieldX className="h-4 w-4 text-destructive" />
            <span className="text-destructive">
              {restoredAll ? 0 : pruneResult.archived - restoredIds.size}
            </span>
          </p>
          <p className="text-xs text-muted-foreground">Archived</p>
        </Card>
        <Card className="p-3 text-center">
          <p className="text-2xl font-semibold tabular-nums flex items-center justify-center gap-1.5">
            <ShieldCheck className="h-4 w-4 text-green-500" />
            <span className="text-green-500">{pruneResult.kept}</span>
          </p>
          <p className="text-xs text-muted-foreground">Kept</p>
        </Card>
      </div>

      {/* Archived contacts table */}
      {visibleContacts.length > 0 && (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Contact</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead className="w-24" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {visibleContacts.map((c) => (
                <TableRow key={c.contactId}>
                  <TableCell className="font-medium">{c.contactName}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {c.reason}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRestore(c.contactId)}
                    >
                      <RotateCcw className="h-3.5 w-3.5 mr-1" />
                      Restore
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {restoredAll && (
        <Card className="p-4">
          <p className="text-sm text-muted-foreground text-center">
            All contacts from this prune run have been restored.
          </p>
        </Card>
      )}
    </section>
  );
}
