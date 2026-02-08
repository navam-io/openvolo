import type { Contact, NewContact } from "@/lib/db/types";
import type { ParsedProfileData, RawProfileData } from "@/lib/browser/types";

/**
 * Merge LLM-extracted profile data into an existing contact.
 *
 * Strategy: "fill gaps, don't overwrite"
 * - Empty contact fields are filled with parsed values
 * - Existing non-empty fields are never overwritten (API is canonical)
 * - metadata gets an additive merge under the `browserEnrichment` key
 */
export function mergeProfileData(
  contact: Contact,
  parsed: ParsedProfileData,
  raw: RawProfileData
): Partial<NewContact> {
  const updates: Partial<NewContact> = {};

  // Fill gaps — only set if the contact field is currently empty
  if (!contact.company && parsed.company) updates.company = parsed.company;
  if (!contact.title && parsed.title) updates.title = parsed.title;
  if (!contact.headline && parsed.headline) updates.headline = parsed.headline;
  if (!contact.email && parsed.email) updates.email = parsed.email;
  if (!contact.phone && parsed.phone) updates.phone = parsed.phone;

  // Additive metadata merge (same pattern as sync-gmail-metadata.ts)
  const existingMetadata: Record<string, unknown> = contact.metadata
    ? JSON.parse(contact.metadata)
    : {};

  const updatedMetadata = {
    ...existingMetadata,
    browserEnrichment: {
      source: raw.platform,
      scrapedAt: raw.scrapedAt,
      confidence: parsed.confidence,
      skills: parsed.skills,
      interests: parsed.interests,
      previousCompanies: parsed.previousCompanies,
      industry: parsed.industry,
    },
  };

  updates.metadata = JSON.stringify(updatedMetadata);

  return updates;
}

/**
 * Build updated platformData JSON for a contact identity.
 * Adds LLM-extracted fields to the identity's existing platformData.
 * This triggers the "rich platformData" bonus in enrichment scoring
 * (+10 pts when the identity has >3 fields).
 */
export function buildPlatformDataUpdate(
  existingPlatformData: string | null,
  parsed: ParsedProfileData
): string {
  const existing: Record<string, unknown> = existingPlatformData
    ? JSON.parse(existingPlatformData)
    : {};

  return JSON.stringify({
    ...existing,
    skills: parsed.skills,
    interests: parsed.interests,
    previousCompanies: parsed.previousCompanies,
    industry: parsed.industry,
    enrichedAt: Math.floor(Date.now() / 1000),
  });
}
