"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { usePathname, useParams } from "next/navigation";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import type { UIMessage, TextUIPart } from "ai";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChatMessage } from "@/components/chat/chat-message";
import { ChatInput } from "@/components/chat/chat-input";
import { ChatToolbar } from "@/components/chat/chat-toolbar";
import { ChatHistory } from "@/components/chat/chat-history";
import { Bot, ArrowRight } from "lucide-react";
import { getSmartPrompts, type SmartPrompt } from "@/lib/chat/smart-prompts";
import type { PageContext } from "@/lib/chat/types";

interface ChatPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function generateTitle(messages: UIMessage[]): string {
  const firstUser = messages.find((m) => m.role === "user");
  if (!firstUser) return "Untitled conversation";
  const textPart = firstUser.parts.find((p): p is TextUIPart => p.type === "text");
  if (!textPart) return "Untitled conversation";
  const text = textPart.text.trim();
  return text.length > 80 ? text.slice(0, 77) + "..." : text;
}

export function ChatPanel({ open, onOpenChange }: ChatPanelProps) {
  const pathname = usePathname();
  const params = useParams();
  const bottomRef = useRef<HTMLDivElement>(null);

  const [activeView, setActiveView] = useState<"chat" | "history">("chat");
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [historyRefreshKey, setHistoryRefreshKey] = useState(0);

  const pageContext = useMemo<PageContext>(() => {
    const ctx: PageContext = { path: pathname };
    if (typeof params?.id === "string") {
      if (pathname.includes("/contacts/")) ctx.contactId = params.id;
      else if (pathname.includes("/workflows/")) ctx.workflowId = params.id;
      else if (pathname.includes("/content/")) ctx.contentId = params.id;
    }
    return ctx;
  }, [pathname, params]);

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        body: { pageContext },
      }),
    [pageContext]
  );

  const { messages, setMessages, sendMessage, stop, status } = useChat({ transport });

  const smartPrompts = useMemo(
    () => getSmartPrompts(pageContext),
    [pageContext]
  );

  const handleSend = (text: string) => sendMessage({ text });

  const handleSave = async () => {
    if (messages.length === 0) return;
    setIsSaving(true);
    try {
      const title = generateTitle(messages);
      const payload = {
        title,
        messages: JSON.stringify(messages),
        messageCount: messages.length,
      };

      if (activeConversationId) {
        // Update existing
        const res = await fetch(`/api/chat/conversations/${activeConversationId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          setHistoryRefreshKey((k) => k + 1);
        }
      } else {
        // Create new
        const res = await fetch("/api/chat/conversations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          const created = await res.json();
          setActiveConversationId(created.id);
          setHistoryRefreshKey((k) => k + 1);
        }
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleClear = () => {
    setMessages([]);
    setActiveConversationId(null);
  };

  const handleContinue = async (id: string) => {
    const res = await fetch(`/api/chat/conversations/${id}`);
    if (!res.ok) return;
    const conversation = await res.json();
    try {
      const parsed = JSON.parse(conversation.messages) as UIMessage[];
      setMessages(parsed);
      setActiveConversationId(id);
      setActiveView("chat");
    } catch {
      // Invalid JSON — ignore
    }
  };

  // Auto-scroll when new messages arrive
  useEffect(() => {
    if (open && activeView === "chat") {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, open, activeView]);

  const isEmpty = messages.length === 0;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[420px] sm:max-w-[420px] p-0 flex flex-col" showCloseButton={false}>
        <SheetHeader className="px-4 py-3 border-b border-border/50">
          <SheetTitle className="flex items-center justify-between w-full text-sm">
            <span className="flex items-center gap-2">
              <Bot className="h-4 w-4" />
              {activeView === "history" ? "History" : "CRM Assistant"}
            </span>
            <ChatToolbar
              hasMessages={!isEmpty}
              isSaving={isSaving}
              onSave={handleSave}
              onClear={handleClear}
              onShowHistory={() => setActiveView("history")}
              onClose={() => onOpenChange(false)}
            />
          </SheetTitle>
        </SheetHeader>

        {activeView === "history" ? (
          <ChatHistory
            onContinue={handleContinue}
            onBack={() => setActiveView("chat")}
            refreshKey={historyRefreshKey}
          />
        ) : isEmpty ? (
          /* ── Centered empty state with smart prompts ── */
          <div className="flex-1 flex flex-col items-center justify-center px-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted mb-3">
              <Bot className="h-5 w-5 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium mb-1">CRM Assistant</p>
            <p className="text-xs text-muted-foreground max-w-[280px] text-center mb-6">
              Ask about your contacts, analytics, content, or workflows.
            </p>

            <SmartPromptChips prompts={smartPrompts} onSend={handleSend} />

            <div className="w-full mt-6 [&>div]:border-t-0">
              <ChatInput onSend={handleSend} onStop={stop} status={status} />
            </div>
          </div>
        ) : (
          /* ── Active chat with scroll + pinned input ── */
          <>
            <ScrollArea className="flex-1 min-h-0">
              <div className="py-2">
                {messages.map((message) => (
                  <ChatMessage key={message.id} message={message} />
                ))}
                <div ref={bottomRef} />
              </div>
            </ScrollArea>

            <ChatInput onSend={handleSend} onStop={stop} status={status} />
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

/* ── Smart Prompt Chips ── */

function SmartPromptChips({
  prompts,
  onSend,
}: {
  prompts: SmartPrompt[];
  onSend: (text: string) => void;
}) {
  return (
    <div className="flex flex-col gap-2 w-full max-w-[320px]">
      {prompts.map((prompt, i) => {
        const Icon = prompt.icon;
        return (
          <button
            key={prompt.text}
            onClick={() => onSend(prompt.text)}
            className="flex items-center gap-3 rounded-lg border border-border/60 bg-muted/30 px-3 py-2.5 text-left text-xs text-foreground/80 transition-colors hover:bg-accent/50 hover:text-foreground animate-[fadeSlideIn_0.5s_ease-out_forwards] opacity-0"
            style={{ animationDelay: `${i * 80}ms` }}
          >
            <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span className="flex-1">{prompt.text}</span>
            <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          </button>
        );
      })}
    </div>
  );
}
