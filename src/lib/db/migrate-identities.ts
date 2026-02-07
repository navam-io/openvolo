import { eq, and, isNotNull, count } from "drizzle-orm";
import { nanoid } from "nanoid";
import { db } from "./client";
import { contacts, contactIdentities } from "./schema";
import { calculateEnrichmentScore } from "./enrichment";

/**
 * One-time migration: creates contactIdentities rows from legacy
 * platform columns on contacts, parses names, and computes enrichment scores.
 *
 * Safe to call repeatedly — only runs when contacts have platform data
 * but zero identity rows exist.
 */
export function migrateContactIdentities(): { migrated: number } {
  // Check if any contacts have platform data but no identity rows
  const contactsWithPlatform = db
    .select()
    .from(contacts)
    .where(and(isNotNull(contacts.platform), isNotNull(contacts.platformUserId)))
    .all();

  if (contactsWithPlatform.length === 0) {
    return { migrated: 0 };
  }

  // Check if identity rows already exist
  const identityCount = db
    .select({ value: count() })
    .from(contactIdentities)
    .get()?.value ?? 0;

  if (identityCount > 0) {
    // Identities already exist — migration has likely already run
    return { migrated: 0 };
  }

  let migrated = 0;

  db.transaction((tx) => {
    // Step 1: Create identity rows from legacy platform columns
    for (const contact of contactsWithPlatform) {
      if (contact.platform && contact.platformUserId) {
        tx.insert(contactIdentities)
          .values({
            id: nanoid(),
            contactId: contact.id,
            platform: contact.platform,
            platformUserId: contact.platformUserId,
            platformUrl: contact.profileUrl,
            isPrimary: 1,
            isActive: 1,
          })
          .run();
        migrated++;
      }
    }

    // Step 2: Parse names + compute enrichment for ALL contacts
    const allContacts = tx.select().from(contacts).all();
    for (const contact of allContacts) {
      const updates: Record<string, unknown> = {};

      // Parse name → firstName / lastName if not already set
      if (!contact.firstName && !contact.lastName && contact.name) {
        const idx = contact.name.indexOf(" ");
        if (idx === -1) {
          updates.firstName = contact.name;
          updates.lastName = "";
        } else {
          updates.firstName = contact.name.slice(0, idx);
          updates.lastName = contact.name.slice(idx + 1);
        }
      }

      // Compute enrichment score
      const identities = tx
        .select()
        .from(contactIdentities)
        .where(eq(contactIdentities.contactId, contact.id))
        .all();

      const enrichedContact = { ...contact, ...updates } as typeof contact;
      updates.enrichmentScore = calculateEnrichmentScore(enrichedContact, identities);

      if (Object.keys(updates).length > 0) {
        tx.update(contacts)
          .set(updates)
          .where(eq(contacts.id, contact.id))
          .run();
      }
    }
  });

  return { migrated };
}
