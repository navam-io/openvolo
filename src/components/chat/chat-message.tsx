"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Bot, User } from "lucide-react";
import { ChatToolResult } from "@/components/chat/chat-tool-result";
import { cn } from "@/lib/utils";
import type { UIMessage } from "ai";

interface ChatMessageProps {
  message: UIMessage;
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === "user";

  return (
    <div className={cn("flex gap-2.5 px-4 py-2", isUser ? "flex-row-reverse" : "")}>
      <div
        className={cn(
          "flex h-7 w-7 shrink-0 items-center justify-center rounded-full",
          isUser ? "bg-primary text-primary-foreground" : "bg-muted"
        )}
      >
        {isUser ? <User className="h-3.5 w-3.5" /> : <Bot className="h-3.5 w-3.5" />}
      </div>

      <div className={cn("min-w-0 max-w-[85%] space-y-1", isUser ? "items-end" : "")}>
        {message.parts.map((part, i) => {
          if (part.type === "text") {
            if (!part.text.trim()) return null;
            return (
              <div
                key={i}
                className={cn(
                  "rounded-lg px-3 py-2 text-sm prose prose-sm dark:prose-invert max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 [&_table]:text-xs [&_th]:px-2 [&_td]:px-2",
                  isUser
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted"
                )}
              >
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {part.text}
                </ReactMarkdown>
              </div>
            );
          }

          // Handle all tool-* part types
          if (part.type.startsWith("tool-")) {
            const toolPart = part as unknown as {
              type: string;
              toolCallId: string;
              state: string;
              input?: Record<string, unknown>;
              output?: unknown;
            };
            // Extract the tool name from the part type: "tool-query_contacts" -> "query_contacts"
            const toolName = toolPart.type.replace(/^tool-/, "");
            return (
              <ChatToolResult
                key={toolPart.toolCallId}
                toolName={toolName}
                state={toolPart.state}
                input={toolPart.input}
                output={toolPart.output}
              />
            );
          }

          // step-start parts — skip rendering
          if (part.type === "step-start") return null;

          return null;
        })}
      </div>
    </div>
  );
}
