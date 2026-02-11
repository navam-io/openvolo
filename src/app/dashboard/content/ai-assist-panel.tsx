"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, X, Copy, ArrowRight, Lightbulb } from "lucide-react";

type Mode = "draft" | "suggest" | "refine";
type Tone = "professional" | "casual" | "thought-leader" | "promotional";

interface ContactOption {
  id: string;
  name: string;
  headline?: string | null;
}

interface DraftVariation {
  index: number;
  text: string;
}

interface SuggestIdea {
  index: number;
  title: string;
  angle: string;
  preview: string;
  raw: string;
}

interface AiAssistPanelProps {
  platform: "x" | "linkedin";
  currentContent: string;
  onInsert: (text: string) => void;
  onClose: () => void;
}

function parseDraftVariations(text: string): DraftVariation[] {
  const parts = text.split(/---VARIATION\s+\d+---/).filter((p) => p.trim());
  if (parts.length === 0) return [{ index: 1, text: text.trim() }];
  return parts.map((p, i) => ({ index: i + 1, text: p.trim() }));
}

function parseSuggestIdeas(text: string): SuggestIdea[] {
  const parts = text.split(/---IDEA\s+\d+---/).filter((p) => p.trim());
  if (parts.length === 0) {
    return [{ index: 1, title: "Idea", angle: "", preview: text.trim(), raw: text.trim() }];
  }
  return parts.map((p, i) => {
    const raw = p.trim();
    const titleMatch = raw.match(/Title:\s*(.+)/);
    const angleMatch = raw.match(/Angle:\s*(.+)/);
    const previewMatch = raw.match(/Preview:\s*([\s\S]+)/);
    return {
      index: i + 1,
      title: titleMatch?.[1]?.trim() || `Idea ${i + 1}`,
      angle: angleMatch?.[1]?.trim() || "",
      preview: previewMatch?.[1]?.trim() || raw,
      raw,
    };
  });
}

export function AiAssistPanel({
  platform,
  currentContent,
  onInsert,
  onClose,
}: AiAssistPanelProps) {
  const [mode, setMode] = useState<Mode>("draft");
  const [topic, setTopic] = useState("");
  const [instruction, setInstruction] = useState("");
  const [tone, setTone] = useState<Tone>("professional");
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rawResult, setRawResult] = useState<string | null>(null);

  // Contact search state
  const [contactSearch, setContactSearch] = useState("");
  const [contactResults, setContactResults] = useState<ContactOption[]>([]);
  const [selectedContacts, setSelectedContacts] = useState<ContactOption[]>([]);
  const [searchingContacts, setSearchingContacts] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Debounced contact search
  useEffect(() => {
    if (!contactSearch.trim()) {
      setContactResults([]);
      return;
    }
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setSearchingContacts(true);
      try {
        const res = await fetch(
          `/api/contacts?search=${encodeURIComponent(contactSearch)}&pageSize=8`,
        );
        const data = await res.json();
        const items = (data.items || []).map(
          (c: { id: string; name: string; headline?: string | null }) => ({
            id: c.id,
            name: c.name,
            headline: c.headline,
          }),
        );
        setContactResults(items);
      } catch {
        setContactResults([]);
      } finally {
        setSearchingContacts(false);
      }
    }, 300);
    return () => clearTimeout(debounceRef.current);
  }, [contactSearch]);

  const toggleContact = useCallback((contact: ContactOption) => {
    setSelectedContacts((prev) => {
      const exists = prev.find((c) => c.id === contact.id);
      if (exists) return prev.filter((c) => c.id !== contact.id);
      return [...prev, contact];
    });
  }, []);

  const removeContact = useCallback((id: string) => {
    setSelectedContacts((prev) => prev.filter((c) => c.id !== id));
  }, []);

  const handleGenerate = useCallback(async () => {
    setGenerating(true);
    setError(null);
    setRawResult(null);

    const body: Record<string, unknown> = {
      mode,
      platform,
      tone,
    };

    if (mode === "refine") {
      body.existingContent = currentContent;
      if (instruction.trim()) body.topic = instruction.trim();
    } else {
      body.topic = topic.trim();
    }

    if (selectedContacts.length > 0) {
      body.contactIds = selectedContacts.map((c) => c.id);
    }

    try {
      const res = await fetch("/api/content/ai-generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Generation failed");
        return;
      }

      setRawResult(data.result);
    } catch {
      setError("Failed to generate content");
    } finally {
      setGenerating(false);
    }
  }, [mode, platform, tone, topic, instruction, currentContent, selectedContacts]);

  const handleUseAsTopicFromIdea = useCallback((idea: SuggestIdea) => {
    setTopic(`${idea.title}: ${idea.angle}`);
    setMode("draft");
    setRawResult(null);
  }, []);

  const canGenerate =
    !generating &&
    ((mode === "refine" && currentContent.trim().length > 0) ||
      ((mode === "draft" || mode === "suggest") && topic.trim().length > 0));

  return (
    <div className="w-[320px] border-l pl-4 flex flex-col h-full min-h-0">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b mb-3">
        <h3 className="font-semibold text-sm">AI Assist</h3>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Mode tabs */}
      <Tabs value={mode} onValueChange={(v) => { setMode(v as Mode); setRawResult(null); setError(null); }}>
        <TabsList className="w-full mb-3">
          <TabsTrigger value="draft" className="flex-1 text-xs">Draft</TabsTrigger>
          <TabsTrigger value="suggest" className="flex-1 text-xs">Suggest</TabsTrigger>
          <TabsTrigger value="refine" className="flex-1 text-xs">Refine</TabsTrigger>
        </TabsList>

        {/* Draft / Suggest inputs */}
        <TabsContent value="draft" className="space-y-3 mt-0">
          <Textarea
            placeholder="What topic should the post be about?"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            rows={3}
            className="text-sm resize-none"
          />
          <ToneSelector tone={tone} onToneChange={setTone} />
          <ContactSelector
            search={contactSearch}
            onSearchChange={setContactSearch}
            results={contactResults}
            selected={selectedContacts}
            searching={searchingContacts}
            onToggle={toggleContact}
            onRemove={removeContact}
          />
        </TabsContent>

        <TabsContent value="suggest" className="space-y-3 mt-0">
          <Textarea
            placeholder="What topics or themes are you interested in?"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            rows={3}
            className="text-sm resize-none"
          />
          <ToneSelector tone={tone} onToneChange={setTone} />
          <ContactSelector
            search={contactSearch}
            onSearchChange={setContactSearch}
            results={contactResults}
            selected={selectedContacts}
            searching={searchingContacts}
            onToggle={toggleContact}
            onRemove={removeContact}
          />
        </TabsContent>

        {/* Refine input */}
        <TabsContent value="refine" className="space-y-3 mt-0">
          {currentContent.trim() ? (
            <div className="rounded-md border p-2 text-xs text-muted-foreground bg-muted/50 line-clamp-3">
              {currentContent}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              Write something in the compose area first, then use Refine to improve it.
            </p>
          )}
          <Textarea
            placeholder="How should it be improved? (optional)"
            value={instruction}
            onChange={(e) => setInstruction(e.target.value)}
            rows={2}
            className="text-sm resize-none"
          />
        </TabsContent>
      </Tabs>

      {/* Generate button */}
      <Button
        className="w-full mt-3"
        disabled={!canGenerate}
        onClick={handleGenerate}
      >
        {generating ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Generating...
          </>
        ) : (
          `Generate ${mode === "suggest" ? "Ideas" : mode === "refine" ? "Refinement" : "Drafts"}`
        )}
      </Button>

      {/* Error */}
      {error && (
        <p className="text-xs text-red-500 mt-2">{error}</p>
      )}

      {/* Results */}
      {rawResult && (
        <ScrollArea className="flex-1 mt-3 min-h-0">
          <div className="space-y-2 pr-2">
            {mode === "draft" && (
              <DraftResults
                variations={parseDraftVariations(rawResult)}
                onInsert={onInsert}
              />
            )}
            {mode === "suggest" && (
              <SuggestResults
                ideas={parseSuggestIdeas(rawResult)}
                onUseTopic={handleUseAsTopicFromIdea}
              />
            )}
            {mode === "refine" && (
              <RefineResult text={rawResult} onInsert={onInsert} />
            )}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}

// --- Sub-components ---

function ToneSelector({ tone, onToneChange }: { tone: Tone; onToneChange: (t: Tone) => void }) {
  return (
    <Select value={tone} onValueChange={(v) => onToneChange(v as Tone)}>
      <SelectTrigger className="text-xs h-8">
        <SelectValue placeholder="Tone" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="professional">Professional</SelectItem>
        <SelectItem value="casual">Casual</SelectItem>
        <SelectItem value="thought-leader">Thought Leader</SelectItem>
        <SelectItem value="promotional">Promotional</SelectItem>
      </SelectContent>
    </Select>
  );
}

function ContactSelector({
  search,
  onSearchChange,
  results,
  selected,
  searching,
  onToggle,
  onRemove,
}: {
  search: string;
  onSearchChange: (v: string) => void;
  results: ContactOption[];
  selected: ContactOption[];
  searching: boolean;
  onToggle: (c: ContactOption) => void;
  onRemove: (id: string) => void;
}) {
  return (
    <div className="space-y-2">
      <label className="text-xs text-muted-foreground">Target audience (optional)</label>

      {/* Selected contacts */}
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {selected.map((c) => (
            <Badge key={c.id} variant="secondary" className="text-xs pr-1">
              {c.name}
              <button
                className="ml-1 hover:text-foreground"
                onClick={() => onRemove(c.id)}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      {/* Search input */}
      <Input
        placeholder="Search contacts..."
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        className="text-xs h-8"
      />

      {/* Search results */}
      {(results.length > 0 || searching) && (
        <div className="border rounded-md max-h-28 overflow-y-auto">
          {searching && (
            <div className="flex items-center gap-2 p-2 text-xs text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" />
              Searching...
            </div>
          )}
          {results.map((c) => {
            const isSelected = selected.some((s) => s.id === c.id);
            return (
              <button
                key={c.id}
                className="flex items-center w-full text-left px-2 py-1.5 text-xs hover:bg-muted/50 gap-2"
                onClick={() => onToggle(c)}
              >
                <div
                  className={`h-3.5 w-3.5 rounded border flex items-center justify-center ${
                    isSelected ? "bg-primary border-primary text-primary-foreground" : "border-input"
                  }`}
                >
                  {isSelected && <span className="text-[9px]">✓</span>}
                </div>
                <span className="truncate">
                  {c.name}
                  {c.headline && (
                    <span className="text-muted-foreground ml-1">— {c.headline}</span>
                  )}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function DraftResults({
  variations,
  onInsert,
}: {
  variations: DraftVariation[];
  onInsert: (text: string) => void;
}) {
  return (
    <>
      <p className="text-xs text-muted-foreground font-medium">
        {variations.length} variation{variations.length !== 1 ? "s" : ""}
      </p>
      {variations.map((v) => (
        <div key={v.index} className="rounded-md border p-3 space-y-2">
          <p className="text-sm whitespace-pre-wrap">{v.text}</p>
          <div className="flex gap-1.5">
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs"
              onClick={() => onInsert(v.text)}
            >
              <Copy className="mr-1 h-3 w-3" />
              Insert
            </Button>
          </div>
        </div>
      ))}
    </>
  );
}

function SuggestResults({
  ideas,
  onUseTopic,
}: {
  ideas: SuggestIdea[];
  onUseTopic: (idea: SuggestIdea) => void;
}) {
  return (
    <>
      <p className="text-xs text-muted-foreground font-medium">
        {ideas.length} idea{ideas.length !== 1 ? "s" : ""}
      </p>
      {ideas.map((idea) => (
        <div key={idea.index} className="rounded-md border p-3 space-y-1.5">
          <div className="flex items-start gap-1.5">
            <Lightbulb className="h-3.5 w-3.5 mt-0.5 text-amber-500 shrink-0" />
            <p className="text-sm font-medium">{idea.title}</p>
          </div>
          {idea.angle && (
            <p className="text-xs text-muted-foreground">{idea.angle}</p>
          )}
          <p className="text-xs">{idea.preview}</p>
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs"
            onClick={() => onUseTopic(idea)}
          >
            <ArrowRight className="mr-1 h-3 w-3" />
            Use as Topic
          </Button>
        </div>
      ))}
    </>
  );
}

function RefineResult({
  text,
  onInsert,
}: {
  text: string;
  onInsert: (text: string) => void;
}) {
  return (
    <div className="rounded-md border p-3 space-y-2">
      <p className="text-xs text-muted-foreground font-medium">Refined version</p>
      <p className="text-sm whitespace-pre-wrap">{text}</p>
      <Button
        size="sm"
        variant="outline"
        className="h-7 text-xs"
        onClick={() => onInsert(text)}
      >
        <Copy className="mr-1 h-3 w-3" />
        Insert
      </Button>
    </div>
  );
}
