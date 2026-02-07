import { eq, like, and, desc, count, SQL } from "drizzle-orm";
import { nanoid } from "nanoid";
import { db } from "@/lib/db/client";
import { contacts } from "@/lib/db/schema";
import type { Contact, NewContact } from "@/lib/db/types";

export function listContacts(opts?: {
  search?: string;
  funnelStage?: string;
  platform?: string;
}): Contact[] {
  const conditions: SQL[] = [];

  if (opts?.search) {
    conditions.push(like(contacts.name, `%${opts.search}%`));
  }
  if (opts?.funnelStage) {
    conditions.push(eq(contacts.funnelStage, opts.funnelStage as Contact["funnelStage"]));
  }
  if (opts?.platform) {
    conditions.push(eq(contacts.platform, opts.platform as "x" | "linkedin"));
  }

  const query = db.select().from(contacts);

  if (conditions.length > 0) {
    return query.where(and(...conditions)).orderBy(desc(contacts.createdAt)).all();
  }

  return query.orderBy(desc(contacts.createdAt)).all();
}

export function getContactById(id: string): Contact | undefined {
  return db.select().from(contacts).where(eq(contacts.id, id)).get();
}

export function createContact(data: Omit<NewContact, "id">): Contact {
  const id = nanoid();
  db.insert(contacts).values({ ...data, id }).run();
  return getContactById(id)!;
}

export function updateContact(id: string, data: Partial<NewContact>): Contact | undefined {
  const existing = getContactById(id);
  if (!existing) return undefined;

  db.update(contacts)
    .set({ ...data, updatedAt: Math.floor(Date.now() / 1000) })
    .where(eq(contacts.id, id))
    .run();

  return getContactById(id);
}

export function deleteContact(id: string): boolean {
  const existing = getContactById(id);
  if (!existing) return false;

  db.delete(contacts).where(eq(contacts.id, id)).run();
  return true;
}

export function countContacts(): number {
  const result = db.select({ value: count() }).from(contacts).get();
  return result?.value ?? 0;
}
