"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Contact } from "@/lib/db/types";

const funnelStages = ["prospect", "engaged", "qualified", "opportunity", "customer", "advocate"];
const platforms = ["x", "linkedin"];

interface ContactFormProps {
  defaultValues?: Partial<Contact>;
  onChange: (data: Record<string, string>) => void;
}

export function ContactForm({ defaultValues, onChange }: ContactFormProps) {
  function handleChange(field: string, value: string) {
    onChange({ [field]: value });
  }

  return (
    <div className="grid gap-4">
      <div className="grid gap-2">
        <Label htmlFor="name">Name *</Label>
        <Input
          id="name"
          defaultValue={defaultValues?.name ?? ""}
          onChange={(e) => handleChange("name", e.target.value)}
          placeholder="Full name"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="grid gap-2">
          <Label htmlFor="company">Company</Label>
          <Input
            id="company"
            defaultValue={defaultValues?.company ?? ""}
            onChange={(e) => handleChange("company", e.target.value)}
            placeholder="Company name"
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="title">Title</Label>
          <Input
            id="title"
            defaultValue={defaultValues?.title ?? ""}
            onChange={(e) => handleChange("title", e.target.value)}
            placeholder="Job title"
          />
        </div>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="headline">Headline</Label>
        <Input
          id="headline"
          defaultValue={defaultValues?.headline ?? ""}
          onChange={(e) => handleChange("headline", e.target.value)}
          placeholder="Professional headline"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="grid gap-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            defaultValue={defaultValues?.email ?? ""}
            onChange={(e) => handleChange("email", e.target.value)}
            placeholder="email@example.com"
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="phone">Phone</Label>
          <Input
            id="phone"
            defaultValue={defaultValues?.phone ?? ""}
            onChange={(e) => handleChange("phone", e.target.value)}
            placeholder="+1 (555) 000-0000"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="grid gap-2">
          <Label htmlFor="funnelStage">Funnel Stage</Label>
          <Select
            defaultValue={defaultValues?.funnelStage ?? "prospect"}
            onValueChange={(v) => handleChange("funnelStage", v)}
          >
            <SelectTrigger id="funnelStage">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {funnelStages.map((s) => (
                <SelectItem key={s} value={s}>
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="platform">Platform</Label>
          <Select
            defaultValue={defaultValues?.platform ?? ""}
            onValueChange={(v) => handleChange("platform", v)}
          >
            <SelectTrigger id="platform">
              <SelectValue placeholder="Select platform" />
            </SelectTrigger>
            <SelectContent>
              {platforms.map((p) => (
                <SelectItem key={p} value={p}>
                  {p === "x" ? "X / Twitter" : "LinkedIn"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="bio">Bio</Label>
        <Textarea
          id="bio"
          defaultValue={defaultValues?.bio ?? ""}
          onChange={(e) => handleChange("bio", e.target.value)}
          placeholder="Short bio..."
          rows={3}
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="tags">Tags</Label>
        <Input
          id="tags"
          defaultValue={
            defaultValues?.tags ? JSON.parse(defaultValues.tags).join(", ") : ""
          }
          onChange={(e) =>
            handleChange(
              "tags",
              JSON.stringify(
                e.target.value
                  .split(",")
                  .map((t) => t.trim())
                  .filter(Boolean)
              )
            )
          }
          placeholder="tag1, tag2, tag3"
        />
      </div>
    </div>
  );
}
