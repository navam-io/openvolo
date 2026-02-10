import { eq, desc, like } from "drizzle-orm";
import { nanoid } from "nanoid";
import { db } from "@/lib/db/client";
import { chatConversations } from "@/lib/db/schema";
import type { ChatConversation, NewChatConversation } from "@/lib/db/types";

export function listChatConversations(opts?: {
  search?: string;
}): ChatConversation[] {
  const query = db.select().from(chatConversations);

  if (opts?.search) {
    return query
      .where(like(chatConversations.title, `%${opts.search}%`))
      .orderBy(desc(chatConversations.updatedAt))
      .limit(50)
      .all();
  }

  return query
    .orderBy(desc(chatConversations.updatedAt))
    .limit(50)
    .all();
}

export function getChatConversation(id: string): ChatConversation | undefined {
  return db
    .select()
    .from(chatConversations)
    .where(eq(chatConversations.id, id))
    .get();
}

export function createChatConversation(
  data: Omit<NewChatConversation, "id">
): ChatConversation {
  const id = nanoid();
  db.insert(chatConversations).values({ ...data, id }).run();
  return getChatConversation(id)!;
}

export function updateChatConversation(
  id: string,
  data: Partial<Pick<NewChatConversation, "title" | "messages" | "messageCount">>
): ChatConversation | undefined {
  const existing = getChatConversation(id);
  if (!existing) return undefined;

  db.update(chatConversations)
    .set({
      ...data,
      updatedAt: Math.floor(Date.now() / 1000),
    })
    .where(eq(chatConversations.id, id))
    .run();

  return getChatConversation(id);
}

export function deleteChatConversation(id: string): boolean {
  const existing = getChatConversation(id);
  if (!existing) return false;

  db.delete(chatConversations).where(eq(chatConversations.id, id)).run();
  return true;
}
