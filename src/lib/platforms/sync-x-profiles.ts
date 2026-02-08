import { eq, and, asc, isNotNull, inArray } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { contacts, contactIdentities } from "@/lib/db/schema";
import { updateContact } from "@/lib/db/queries/contacts";
import { updateIdentity } from "@/lib/db/queries/identities";
import { updatePlatformAccount } from "@/lib/db/queries/platform-accounts";
import { getSyncCursor, updateSyncCursor } from "@/lib/db/queries/sync";
import { XScraper } from "@/lib/browser/platforms/x-scraper";
import { parseProfile } from "@/lib/browser/extractors/profile-parser";
import {
  mergeProfileData,
  buildPlatformDataUpdate,
} from "@/lib/browser/extractors/profile-merger";
import type { SyncResult } from "@/lib/platforms/adapter";

/** Contact with its X identity info, ready for enrichment. */
interface EnrichableContact {
  id: string;
  name: string;
  company: string | null;
  title: string | null;
  headline: string | null;
  email: string | null;
  phone: string | null;
  metadata: string | null;
  enrichmentScore: number;
  identityId: string;
  platformHandle: string;
  platformData: string | null;
}

/** Minimum days between re-scraping the same contact. */
const COOLDOWN_DAYS = 7;

/**
 * Enrich X contacts by scraping their profile pages and extracting
 * structured data via LLM. Follows the sync-gmail-metadata.ts pattern:
 * sync cursor lifecycle, per-contact error isolation, partial failure.
 */
export async function syncXProfiles(
  accountId: string,
  opts?: {
    maxProfiles?: number;
    contactIds?: string[];
  }
): Promise<SyncResult> {
  const maxProfiles = opts?.maxProfiles ?? 15;
  const result: SyncResult = { added: 0, updated: 0, skipped: 0, errors: [] };

  // 1. Get or create sync cursor
  const cursor = getSyncCursor(accountId, "x_profiles");
  updateSyncCursor(cursor.id, {
    syncStatus: "syncing",
    lastSyncStartedAt: Math.floor(Date.now() / 1000),
  });

  let scraper: XScraper | null = null;

  try {
    // 2. Select contacts to enrich
    const enrichable = selectContactsForEnrichment({
      maxProfiles,
      contactIds: opts?.contactIds,
    });

    if (enrichable.length === 0) {
      updateSyncCursor(cursor.id, {
        syncStatus: "completed",
        lastSyncCompletedAt: Math.floor(Date.now() / 1000),
      });
      return result;
    }

    // 3. Initialize scraper and validate session
    scraper = new XScraper();
    await scraper.init();

    if (!(await scraper.validateSession())) {
      throw new Error(
        "X browser session is invalid or expired. Please re-authenticate in Settings."
      );
    }

    let processed = 0;

    // 4. Per-contact enrichment loop
    for (const contact of enrichable) {
      if (scraper.batchLimitReached) {
        result.errors.push(
          `Batch limit reached after ${processed} profiles. Remaining contacts will be enriched in the next batch.`
        );
        break;
      }

      try {
        // 4a. Scrape profile page
        const raw = await scraper.scrapeProfile(contact.platformHandle);
        if (!raw) {
          result.skipped++;
          continue;
        }

        // 4b. LLM extraction
        const parsed = await parseProfile(raw);

        // 4c. Merge into contact (fill gaps, don't overwrite)
        // Build a minimal Contact-like object for the merger
        const contactForMerge = {
          id: contact.id,
          name: contact.name,
          company: contact.company,
          title: contact.title,
          headline: contact.headline,
          email: contact.email,
          phone: contact.phone,
          metadata: contact.metadata,
        };

        const updates = mergeProfileData(
          contactForMerge as Parameters<typeof mergeProfileData>[0],
          parsed,
          raw
        );

        if (Object.keys(updates).length > 0) {
          // updateContact auto-calls recalcEnrichment(contactId)
          updateContact(contact.id, updates);
          result.updated++;
        } else {
          result.skipped++;
        }

        // 4d. Update identity platformData for rich data scoring (+10 pts)
        const updatedPlatformData = buildPlatformDataUpdate(
          contact.platformData,
          parsed
        );
        updateIdentity(contact.identityId, {
          platformData: updatedPlatformData,
        });

        processed++;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : String(err);
        result.errors.push(
          `Failed to enrich @${contact.platformHandle}: ${message}`
        );

        // Stop batch on challenge/CAPTCHA detection
        if (message.includes("Challenge/CAPTCHA")) {
          result.errors.push("Stopping batch due to challenge detection.");
          break;
        }
      }
    }

    // 5. Mark sync completed
    const now = Math.floor(Date.now() / 1000);
    updateSyncCursor(cursor.id, {
      syncStatus: "completed",
      totalItemsSynced: (cursor.totalItemsSynced ?? 0) + processed,
      lastSyncCompletedAt: now,
    });
    updatePlatformAccount(accountId, { lastSyncedAt: now });
  } catch (err) {
    // Partial sync pattern: ALWAYS set lastSyncCompletedAt even on error
    result.errors.push(
      `Profile enrichment failed: ${err instanceof Error ? err.message : String(err)}`
    );
    updateSyncCursor(cursor.id, {
      syncStatus: "failed",
      lastSyncCompletedAt: Math.floor(Date.now() / 1000),
      lastError: err instanceof Error ? err.message : String(err),
    });
  } finally {
    await scraper?.close();
  }

  return result;
}

/**
 * Select contacts for browser enrichment.
 * Prioritizes low enrichment scores, skips recently scraped (7-day cooldown).
 */
function selectContactsForEnrichment(opts: {
  maxProfiles: number;
  contactIds?: string[];
}): EnrichableContact[] {
  const cooldownThreshold =
    Math.floor(Date.now() / 1000) - COOLDOWN_DAYS * 86400;

  // Base query: contacts with an X identity that has a handle
  let rows;
  if (opts.contactIds?.length) {
    // Specific contacts requested
    rows = db
      .select({
        id: contacts.id,
        name: contacts.name,
        company: contacts.company,
        title: contacts.title,
        headline: contacts.headline,
        email: contacts.email,
        phone: contacts.phone,
        metadata: contacts.metadata,
        enrichmentScore: contacts.enrichmentScore,
        identityId: contactIdentities.id,
        platformHandle: contactIdentities.platformHandle,
        platformData: contactIdentities.platformData,
      })
      .from(contacts)
      .innerJoin(
        contactIdentities,
        eq(contacts.id, contactIdentities.contactId)
      )
      .where(
        and(
          inArray(contacts.id, opts.contactIds),
          eq(contactIdentities.platform, "x"),
          isNotNull(contactIdentities.platformHandle)
        )
      )
      .all();
  } else {
    // Auto-select: lowest enrichment scores first
    // Fetch more than needed to account for cooldown filtering
    rows = db
      .select({
        id: contacts.id,
        name: contacts.name,
        company: contacts.company,
        title: contacts.title,
        headline: contacts.headline,
        email: contacts.email,
        phone: contacts.phone,
        metadata: contacts.metadata,
        enrichmentScore: contacts.enrichmentScore,
        identityId: contactIdentities.id,
        platformHandle: contactIdentities.platformHandle,
        platformData: contactIdentities.platformData,
      })
      .from(contacts)
      .innerJoin(
        contactIdentities,
        eq(contacts.id, contactIdentities.contactId)
      )
      .where(
        and(
          eq(contactIdentities.platform, "x"),
          isNotNull(contactIdentities.platformHandle)
        )
      )
      .orderBy(asc(contacts.enrichmentScore))
      .limit(opts.maxProfiles * 2) // over-fetch for cooldown filtering
      .all();
  }

  // Filter: skip recently scraped contacts (7-day cooldown)
  const filtered = rows.filter((row) => {
    if (!row.metadata) return true;
    try {
      const meta = JSON.parse(row.metadata);
      const scrapedAt = meta?.browserEnrichment?.scrapedAt;
      if (typeof scrapedAt === "number" && scrapedAt > cooldownThreshold) {
        return false; // too recent
      }
    } catch {
      // invalid metadata JSON — allow enrichment
    }
    return true;
  });

  // Cast platformHandle (Drizzle returns string | null from isNotNull)
  return filtered.slice(0, opts.maxProfiles).map((row) => ({
    ...row,
    platformHandle: row.platformHandle!,
  }));
}
