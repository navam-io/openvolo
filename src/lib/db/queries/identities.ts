import { eq, and } from "drizzle-orm";
import { nanoid } from "nanoid";
import { db } from "@/lib/db/client";
import { contactIdentities } from "@/lib/db/schema";
import type { ContactIdentity, NewContactIdentity } from "@/lib/db/types";

export function listIdentitiesByContact(contactId: string): ContactIdentity[] {
  return db
    .select()
    .from(contactIdentities)
    .where(eq(contactIdentities.contactId, contactId))
    .all();
}

export function getIdentityById(id: string): ContactIdentity | undefined {
  return db.select().from(contactIdentities).where(eq(contactIdentities.id, id)).get();
}

export function createIdentity(data: Omit<NewContactIdentity, "id">): ContactIdentity {
  const id = nanoid();
  db.insert(contactIdentities).values({ ...data, id }).run();
  return getIdentityById(id)!;
}

export function updateIdentity(
  id: string,
  data: Partial<Omit<NewContactIdentity, "id">>
): ContactIdentity | undefined {
  const existing = getIdentityById(id);
  if (!existing) return undefined;

  db.update(contactIdentities)
    .set({ ...data, updatedAt: Math.floor(Date.now() / 1000) })
    .where(eq(contactIdentities.id, id))
    .run();

  return getIdentityById(id);
}

export function deleteIdentityForContact(contactId: string, identityId: string): boolean {
  const existing = db
    .select()
    .from(contactIdentities)
    .where(and(eq(contactIdentities.id, identityId), eq(contactIdentities.contactId, contactId)))
    .get();

  if (!existing) return false;

  db.delete(contactIdentities).where(eq(contactIdentities.id, identityId)).run();
  return true;
}
