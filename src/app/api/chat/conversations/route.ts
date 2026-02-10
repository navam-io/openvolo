import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  listChatConversations,
  createChatConversation,
} from "@/lib/db/queries/chat-conversations";

const createSchema = z.object({
  title: z.string().min(1),
  messages: z.string().min(1), // JSON-serialized UIMessage[]
  messageCount: z.number().int().min(0),
});

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") ?? undefined;

  const results = listChatConversations({ search });
  return NextResponse.json(results);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = createSchema.parse(body);
    const conversation = createChatConversation(data);
    return NextResponse.json(conversation, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
