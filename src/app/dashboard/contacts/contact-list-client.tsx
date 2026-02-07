"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useCallback } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AddContactDialog } from "@/components/add-contact-dialog";
import { FunnelStageBadge } from "@/components/funnel-stage-badge";
import { Users } from "lucide-react";
import type { Contact } from "@/lib/db/types";

const funnelStages = ["all", "prospect", "engaged", "qualified", "opportunity", "customer", "advocate"];
const platformLabels: Record<string, string> = {
  x: "X / Twitter",
  linkedin: "LinkedIn",
  gmail: "Gmail",
  substack: "Substack",
};

interface ContactListClientProps {
  contacts: Contact[];
  currentSearch?: string;
  currentFunnelStage?: string;
}

export function ContactListClient({
  contacts,
  currentSearch,
  currentFunnelStage,
}: ContactListClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(currentSearch ?? "");

  const updateParams = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value && value !== "all") {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      router.push(`/dashboard/contacts?${params.toString()}`);
    },
    [router, searchParams]
  );

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    updateParams("search", search);
  }

  if (contacts.length === 0 && !currentSearch && !currentFunnelStage) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            No contacts yet
          </CardTitle>
          <CardDescription>
            Add your first contact to start building your CRM.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AddContactDialog />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <form onSubmit={handleSearchSubmit} className="flex-1">
          <Input
            placeholder="Search contacts..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-sm"
          />
        </form>
        <Select
          defaultValue={currentFunnelStage ?? "all"}
          onValueChange={(v) => updateParams("funnelStage", v)}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Funnel stage" />
          </SelectTrigger>
          <SelectContent>
            {funnelStages.map((s) => (
              <SelectItem key={s} value={s}>
                {s === "all" ? "All Stages" : s.charAt(0).toUpperCase() + s.slice(1)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <AddContactDialog />
      </div>

      {contacts.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground text-center">
              No contacts match your filters.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Platform</TableHead>
                <TableHead>Stage</TableHead>
                <TableHead>Score</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {contacts.map((contact) => (
                <TableRow key={contact.id} className="hover:bg-accent/30 transition-colors">
                  <TableCell>
                    <Link
                      href={`/dashboard/contacts/${contact.id}`}
                      className="font-medium hover:underline"
                    >
                      {contact.name}
                    </Link>
                    {contact.headline && (
                      <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                        {contact.headline}
                      </p>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {contact.company ?? "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {contact.platform ? (platformLabels[contact.platform] ?? contact.platform) : "—"}
                  </TableCell>
                  <TableCell>
                    <FunnelStageBadge stage={contact.funnelStage} />
                  </TableCell>
                  <TableCell className="text-muted-foreground">{contact.score}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
