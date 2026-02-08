import { generateObject } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { z } from "zod";
import type { RawProfileData, ParsedProfileData } from "@/lib/browser/types";

/**
 * Zod schema for LLM-extracted profile data.
 * Field descriptions guide the model on extraction patterns.
 */
export const profileExtractionSchema = z.object({
  company: z
    .string()
    .nullable()
    .describe(
      "Current company or organization. Extract from patterns like 'CTO @Company', 'Working at Company', 'Company.com'. Null if not stated."
    ),
  title: z
    .string()
    .nullable()
    .describe(
      "Professional title or role. Extract from patterns like 'CTO', 'Software Engineer', 'Founder'. Null if not stated."
    ),
  headline: z
    .string()
    .nullable()
    .describe(
      "Professional headline synthesized from bio. A one-line summary of who this person is professionally. Null if bio is too vague."
    ),
  email: z
    .string()
    .email()
    .nullable()
    .describe(
      "Email address if explicitly present in bio or tweets. Null if not found. Must be a valid email format."
    ),
  phone: z
    .string()
    .nullable()
    .describe("Phone number if explicitly present. Null if not found."),
  skills: z
    .array(z.string())
    .describe(
      "Technical or professional skills mentioned. E.g., ['AI/ML', 'React', 'Product Management']. Empty array if none found."
    ),
  interests: z
    .array(z.string())
    .describe(
      "Professional interests or topics they engage with. E.g., ['Open Source', 'Startups', 'Climate Tech']. Empty array if none found."
    ),
  previousCompanies: z
    .array(z.string())
    .describe(
      "Past companies mentioned. Extract from patterns like 'ex-@Google', 'former VP at Meta'. Empty array if none found."
    ),
  industry: z
    .string()
    .nullable()
    .describe(
      "Primary industry. E.g., 'Technology', 'Finance', 'Healthcare'. Null if unclear."
    ),
  confidence: z
    .number()
    .describe(
      "Overall confidence in extractions (0.0 to 1.0). 1.0 = explicitly stated, 0.5 = strongly implied, 0.0 = guessing."
    ),
});

export type ProfileExtraction = z.infer<typeof profileExtractionSchema>;

const SYSTEM_PROMPT = `You extract structured professional information from social media profiles.

Rules:
- Only extract information that is explicitly stated or strongly implied
- Set fields to null when information is missing — never guess
- Email must be a valid format if present (check for @ and domain)
- The "headline" field should synthesize who this person is professionally
- Skills and interests should be concise tags, not sentences
- Previous companies should be company names only, not roles
- Confidence reflects how certain you are about ALL extractions combined`;

/** Build the user prompt from raw scraped profile data. */
function buildUserPrompt(raw: RawProfileData): string {
  const sections: string[] = [
    "Extract professional information from this X/Twitter profile.",
    "",
    `Display Name: ${raw.displayName ?? "(not available)"}`,
    `Bio: ${raw.bio ?? "(not available)"}`,
    `Location: ${raw.location ?? "(not available)"}`,
    `Website: ${raw.website ?? "(not available)"}`,
  ];

  if (raw.pinnedTweetText) {
    sections.push("", `Pinned Tweet: ${raw.pinnedTweetText}`);
  }

  if (raw.recentTweetTexts.length > 0) {
    sections.push(
      "",
      "Recent Tweets:",
      ...raw.recentTweetTexts.map((t) => `- ${t}`)
    );
  }

  return sections.join("\n");
}

/**
 * Parse raw scraped profile data into structured contact fields using LLM.
 * Uses Vercel AI SDK 6 generateObject() with a Zod schema for type-safe output.
 */
export async function parseProfile(
  raw: RawProfileData
): Promise<ParsedProfileData> {
  const { object } = await generateObject({
    model: anthropic("claude-sonnet-4-5-20250929"),
    schema: profileExtractionSchema,
    system: SYSTEM_PROMPT,
    prompt: buildUserPrompt(raw),
  });

  return {
    company: object.company,
    title: object.title,
    headline: object.headline,
    email: object.email,
    phone: object.phone,
    skills: object.skills,
    interests: object.interests,
    previousCompanies: object.previousCompanies,
    industry: object.industry,
    confidence: object.confidence,
  };
}
