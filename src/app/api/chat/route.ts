import { streamText, convertToModelMessages, stepCountIs, type UIMessage } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { buildChatSystemPrompt } from "@/lib/chat/system-prompt";
import { chatTools } from "@/lib/chat/tools";
import type { PageContext } from "@/lib/chat/types";

export async function POST(req: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: "ANTHROPIC_API_KEY is not configured" }),
      { status: 401, headers: { "Content-Type": "application/json" } }
    );
  }

  const { messages, pageContext } = (await req.json()) as {
    messages: UIMessage[];
    pageContext?: PageContext;
  };

  const result = streamText({
    model: anthropic("claude-sonnet-4-5-20250929"),
    system: buildChatSystemPrompt(pageContext),
    messages: await convertToModelMessages(messages),
    tools: chatTools,
    stopWhen: stepCountIs(5),
  });

  return result.toUIMessageStreamResponse();
}
