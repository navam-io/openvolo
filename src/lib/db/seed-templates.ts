import { createTemplate, listTemplates } from "@/lib/db/queries/workflow-templates";

interface TemplateSeed {
  name: string;
  description: string;
  templateType: "prospecting" | "enrichment" | "pruning";
  systemPrompt: string;
  targetPersona: string;
  estimatedCost: number;
  config: Record<string, unknown>;
}

const SEED_TEMPLATES: TemplateSeed[] = [
  {
    name: "Top AI Influencers",
    description: "Find and catalog influential voices in AI/ML on X and LinkedIn. Searches for thought leaders, researchers, and founders building AI products.",
    templateType: "prospecting",
    targetPersona: "AI/ML researchers, founders, and thought leaders with 10K+ followers",
    estimatedCost: 0.50,
    systemPrompt: `You are a research agent finding top AI influencers.

## Objective
Search for influential people in the AI/ML space on X (Twitter) and LinkedIn. Focus on:
- AI researchers at top labs (OpenAI, Anthropic, Google DeepMind, Meta AI)
- Founders of AI startups
- Prominent AI thought leaders and educators
- People with significant followings who post about AI regularly

## Process
1. Search for "top AI influencers 2025" and similar queries
2. For each person found, fetch their profile pages for details
3. Create or enrich contact records with their information
4. Report progress after processing each batch

## Output
Aim to find 15-20 high-quality contacts with company, title, and social profiles.`,
    config: { maxResults: 20, targetDomains: ["x.com", "linkedin.com"] },
  },
  {
    name: "Fintech Leaders",
    description: "Discover leaders in fintech, crypto, and digital banking. Identifies founders, CTOs, and VPs at financial technology companies.",
    templateType: "prospecting",
    targetPersona: "Fintech founders, CTOs, and VPs at financial technology companies",
    estimatedCost: 0.40,
    systemPrompt: `You are a research agent finding fintech leaders.

## Objective
Search for leaders in fintech, crypto, and digital banking:
- Founders and C-suite at fintech startups
- VPs and Directors at digital banks (Chime, Revolut, Stripe, etc.)
- Prominent crypto/DeFi builders
- Fintech investors and analysts

## Process
1. Search for fintech leaders, startup founders, and notable executives
2. Fetch profile pages and company pages for context
3. Create or enrich contact records
4. Report progress regularly

## Output
Find 15-20 contacts with company, title, and at least one social profile.`,
    config: { maxResults: 20, targetDomains: ["x.com", "linkedin.com", "crunchbase.com"] },
  },
  {
    name: "Developer Advocates",
    description: "Find developer advocates, DevRel professionals, and technical community builders across major tech companies.",
    templateType: "prospecting",
    targetPersona: "Developer advocates, DevRel leaders, and technical community managers",
    estimatedCost: 0.35,
    systemPrompt: `You are a research agent finding developer advocates.

## Objective
Search for developer advocates and DevRel professionals:
- Developer Advocates at major tech companies (AWS, Google, Microsoft, etc.)
- DevRel managers and directors
- Technical community builders and educators
- Open source maintainers with advocacy roles

## Process
1. Search for "developer advocate" profiles and lists
2. Fetch their profiles for company, title, and bio
3. Create or enrich contact records
4. Focus on people actively posting technical content

## Output
Find 15-20 developer advocates with company, title, and social links.`,
    config: { maxResults: 20, targetDomains: ["x.com", "linkedin.com", "github.com"] },
  },
  {
    name: "Enrich Low-Score Contacts",
    description: "Automatically fill in missing data for contacts with low enrichment scores. Searches the web for company, title, email, and other details.",
    templateType: "enrichment",
    targetPersona: "Existing contacts with enrichment score below 50",
    estimatedCost: 0.30,
    systemPrompt: `You are an enrichment agent improving contact data quality.

## Objective
For each contact provided, search the web to find missing information:
- Company name and website
- Job title and headline
- Email address
- Location
- Bio and professional summary

## Process
1. Review each contact's current data to identify gaps
2. Search for the person by name + any known details (company, handle)
3. Fetch relevant profile pages (LinkedIn, company website, etc.)
4. Use enrich_contact to fill in missing fields
5. Report progress after each contact

## Rules
- Only fill empty fields — never overwrite existing data
- Verify information from multiple sources when possible
- Skip contacts you can't find reliable information for`,
    config: { maxContacts: 10, maxEnrichmentScore: 50 },
  },
  {
    name: "Fill Email Gaps",
    description: "Find email addresses for contacts that are missing them. Uses web search to locate professional email patterns.",
    templateType: "enrichment",
    targetPersona: "Contacts missing email addresses",
    estimatedCost: 0.25,
    systemPrompt: `You are an enrichment agent finding email addresses.

## Objective
Find email addresses for contacts that don't have one.

## Process
1. For each contact, search for their name + company + "email"
2. Look for email patterns on company websites (e.g., first.last@company.com)
3. Check professional profiles for contact information
4. Use enrich_contact to add found emails
5. Report progress after each batch

## Rules
- Only add emails you're confident are correct
- Prefer professional/work emails over personal ones
- Never guess or fabricate email addresses
- Skip contacts where email can't be reliably determined`,
    config: { maxContacts: 15, maxEnrichmentScore: 100 },
  },
  {
    name: "Prune Inactive Contacts",
    description: "Identify contacts that appear inactive (no social activity, invalid profiles) and recommend them for archival.",
    templateType: "pruning",
    targetPersona: "Contacts with stale data or no recent activity",
    estimatedCost: 0.10,
    systemPrompt: `You are a data quality agent identifying inactive contacts.

## Objective
Review contacts and archive those that meet the pruning criteria:
- Profiles that no longer exist or are deactivated
- People who haven't posted in over a year
- Contacts with minimal/no useful data

## Process
1. Review each contact's data and check their profiles
2. Determine if they appear active or inactive
3. Use \`archive_contact\` to archive contacts that meet the criteria, with a clear reason
4. Use \`report_progress\` after processing each batch

## Rules
- Use \`archive_contact\` for each contact you decide to prune — provide a clear reason
- When in doubt, keep the contact (err on the side of caution)
- Report progress after every few contacts processed`,
    config: { maxContacts: 20, inactivityDays: 365 },
  },
  {
    name: "Prune by Company",
    description: "Find and flag contacts from a specific company (e.g., after that company becomes irrelevant to your network).",
    templateType: "pruning",
    targetPersona: "Contacts at a specific company to review for removal",
    estimatedCost: 0.05,
    systemPrompt: `You are a data quality agent reviewing contacts by company.

## Objective
Review contacts associated with a specific company and archive
those that should be removed from the active list.

## Process
1. Review each contact's company, title, and relationship data
2. Check if they're still at the specified company
3. Use \`archive_contact\` for contacts that should be pruned, with a clear reason
4. Use \`report_progress\` after processing each batch

## Rules
- Use \`archive_contact\` for each contact you decide to prune
- Consider the contact's overall value (other connections, engagement history)
- People who left the company may still be valuable contacts — keep them if they're useful`,
    config: { companyName: "", maxContacts: 50 },
  },
];

/**
 * Seed the database with pre-defined workflow templates.
 * Idempotent — skips if templates already exist.
 */
export function seedTemplates(): { seeded: number; skipped: boolean } {
  const existing = listTemplates({ pageSize: 1 });
  if (existing.total > 0) {
    return { seeded: 0, skipped: true };
  }

  let seeded = 0;
  for (const seed of SEED_TEMPLATES) {
    createTemplate({
      name: seed.name,
      description: seed.description,
      templateType: seed.templateType,
      status: "active",
      systemPrompt: seed.systemPrompt,
      targetPersona: seed.targetPersona,
      estimatedCost: seed.estimatedCost,
      config: JSON.stringify(seed.config),
    });
    seeded++;
  }

  return { seeded, skipped: false };
}
