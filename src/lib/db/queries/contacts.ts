import { eq, like, and, or, desc, count, inArray, SQL } from "drizzle-orm";
import { nanoid } from "nanoid";
import { db } from "@/lib/db/client";
import { contacts, contactIdentities } from "@/lib/db/schema";
import { calculateEnrichmentScore } from "@/lib/db/enrichment";
import type { Contact, NewContact, ContactWithIdentities, PaginatedResult } from "@/lib/db/types";

/** Split a full name into firstName/lastName on the first space. */
function parseName(fullName: string): { firstName: string; lastName: string } {
  const idx = fullName.indexOf(" ");
  if (idx === -1) return { firstName: fullName, lastName: "" };
  return { firstName: fullName.slice(0, idx), lastName: fullName.slice(idx + 1) };
}

/** Batch-fetch identities for a set of contacts, returning ContactWithIdentities[]. */
function attachIdentities(rows: Contact[]): ContactWithIdentities[] {
  if (rows.length === 0) return [];
  const ids = rows.map((r) => r.id);
  const allIdentities = db
    .select()
    .from(contactIdentities)
    .where(inArray(contactIdentities.contactId, ids))
    .all();

  const map = new Map<string, typeof allIdentities>();
  for (const identity of allIdentities) {
    const list = map.get(identity.contactId) ?? [];
    list.push(identity);
    map.set(identity.contactId, list);
  }

  return rows.map((row) => ({
    ...row,
    identities: map.get(row.id) ?? [],
  }));
}

/** Recalculate and persist enrichment score for a contact. */
function recalcEnrichment(contactId: string): void {
  const contact = db.select().from(contacts).where(eq(contacts.id, contactId)).get();
  if (!contact) return;
  const identities = db
    .select()
    .from(contactIdentities)
    .where(eq(contactIdentities.contactId, contactId))
    .all();
  const score = calculateEnrichmentScore(contact, identities);
  db.update(contacts)
    .set({ enrichmentScore: score, updatedAt: Math.floor(Date.now() / 1000) })
    .where(eq(contacts.id, contactId))
    .run();
}

export function listContacts(opts?: {
  search?: string;
  funnelStage?: string;
  platform?: string;
  page?: number;
  pageSize?: number;
}): PaginatedResult<ContactWithIdentities> {
  const conditions: SQL[] = [];

  if (opts?.search) {
    const pattern = `%${opts.search}%`;
    conditions.push(
      or(
        like(contacts.name, pattern),
        like(contacts.firstName, pattern),
        like(contacts.lastName, pattern),
        like(contacts.email, pattern),
      )!
    );
  }
  if (opts?.funnelStage) {
    conditions.push(eq(contacts.funnelStage, opts.funnelStage as Contact["funnelStage"]));
  }
  if (opts?.platform) {
    conditions.push(
      eq(contacts.platform, opts.platform as "x" | "linkedin" | "gmail" | "substack")
    );
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const total = db
    .select({ value: count() })
    .from(contacts)
    .where(whereClause)
    .get()?.value ?? 0;

  const page = opts?.page ?? 1;
  const pageSize = opts?.pageSize ?? 25;

  const rows = db
    .select()
    .from(contacts)
    .where(whereClause)
    .orderBy(desc(contacts.createdAt))
    .limit(pageSize)
    .offset((page - 1) * pageSize)
    .all();

  return { data: attachIdentities(rows), total };
}

export function getContactById(id: string): ContactWithIdentities | undefined {
  const row = db.select().from(contacts).where(eq(contacts.id, id)).get();
  if (!row) return undefined;
  return attachIdentities([row])[0];
}

export function createContact(data: Omit<NewContact, "id">): ContactWithIdentities {
  const id = nanoid();

  // Auto-parse name into firstName/lastName if not provided
  const nameFields =
    !data.firstName && !data.lastName && data.name
      ? parseName(data.name)
      : {};

  // Compute full name from firstName + lastName if name is not explicitly set
  const name =
    data.name ||
    [data.firstName, data.lastName].filter(Boolean).join(" ") ||
    "Unknown";

  db.insert(contacts).values({ ...data, ...nameFields, name, id }).run();
  recalcEnrichment(id);
  return getContactById(id)!;
}

export function updateContact(
  id: string,
  data: Partial<NewContact>
): ContactWithIdentities | undefined {
  const existing = getContactById(id);
  if (!existing) return undefined;

  // If firstName or lastName changed, recompute name
  const updates = { ...data };
  if (data.firstName !== undefined || data.lastName !== undefined) {
    const fn = data.firstName ?? existing.firstName ?? "";
    const ln = data.lastName ?? existing.lastName ?? "";
    updates.name = [fn, ln].filter(Boolean).join(" ") || existing.name;
  }

  db.update(contacts)
    .set({ ...updates, updatedAt: Math.floor(Date.now() / 1000) })
    .where(eq(contacts.id, id))
    .run();

  recalcEnrichment(id);
  return getContactById(id);
}

export function deleteContact(id: string): boolean {
  const existing = db.select().from(contacts).where(eq(contacts.id, id)).get();
  if (!existing) return false;

  db.delete(contacts).where(eq(contacts.id, id)).run();
  return true;
}

export function countContacts(): number {
  const result = db.select({ value: count() }).from(contacts).get();
  return result?.value ?? 0;
}

/** Exposed for data migration use. */
export { recalcEnrichment, parseName };
