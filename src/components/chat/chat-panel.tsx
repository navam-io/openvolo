"use client";

import { useEffect, useRef, useMemo } from "react";
import { usePathname, useParams } from "next/navigation";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChatMessage } from "@/components/chat/chat-message";
import { ChatInput } from "@/components/chat/chat-input";
import { Bot } from "lucide-react";
import type { PageContext } from "@/lib/chat/types";

interface ChatPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ChatPanel({ open, onOpenChange }: ChatPanelProps) {
  const pathname = usePathname();
  const params = useParams();
  const bottomRef = useRef<HTMLDivElement>(null);

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

  const { messages, sendMessage, stop, status } = useChat({ transport });

  // Auto-scroll when new messages arrive
  useEffect(() => {
    if (open) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, open]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[420px] sm:max-w-[420px] p-0 flex flex-col">
        <SheetHeader className="px-4 py-3 border-b border-border/50">
          <SheetTitle className="flex items-center gap-2 text-sm">
            <Bot className="h-4 w-4" />
            CRM Assistant
          </SheetTitle>
        </SheetHeader>

        <ScrollArea className="flex-1 min-h-0">
          <div className="py-2">
            {messages.length === 0 ? (
              <EmptyState />
            ) : (
              messages.map((message) => (
                <ChatMessage key={message.id} message={message} />
              ))
            )}
            <div ref={bottomRef} />
          </div>
        </ScrollArea>

        <ChatInput
          onSend={(text) => sendMessage({ text })}
          onStop={stop}
          status={status}
        />
      </SheetContent>
    </Sheet>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted mb-3">
        <Bot className="h-5 w-5 text-muted-foreground" />
      </div>
      <p className="text-sm font-medium mb-1">CRM Assistant</p>
      <p className="text-xs text-muted-foreground max-w-[280px]">
        Ask about your contacts, analytics, content, or workflows. I can also create contacts, tasks, and start workflows.
      </p>
    </div>
  );
}
