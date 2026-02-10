import { NextRequest, NextResponse } from "next/server";
import { generateText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { z } from "zod";

const generateSchema = z.object({
  templateType: z.enum([
    "outreach", "engagement", "content", "nurture", "prospecting", "enrichment", "pruning",
  ]),
  description: z.string().optional(),
  targetPersona: z.string().optional(),
  platform: z.enum(["x", "linkedin"]).optional(),
});

/**
 * POST /api/workflows/templates/generate-prompt
 * Generate a system prompt for a workflow template using AI.
 */
export async function POST(req: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY not configured" },
      { status: 503 }
    );
  }

  try {
    const body = await req.json();
    const { templateType, description, targetPersona, platform } = generateSchema.parse(body);

    const result = await generateText({
      model: anthropic("claude-haiku-4-5-20251001"),
      prompt: `Generate a system prompt for a ${templateType} workflow template.
${description ? `Description: ${description}` : ""}
${targetPersona ? `Target persona: ${targetPersona}` : ""}
${platform ? `Platform: ${platform}` : ""}

The system prompt should follow this format:
## Objective
[Clear goal statement]

## Process
[Numbered steps the agent should follow]

## Rules
[Important constraints and guidelines]

Keep it concise (under 500 words). Reference available tools:
- search_web: Search the internet
- fetch_url: Fetch web page content
- scrape_url: Browser scrape JS-rendered pages
- create_contact: Create a CRM contact
- enrich_contact: Update existing contact data
- archive_contact: Archive a contact with reason
- engage_post: Like, reply, or retweet posts on X/LinkedIn
- report_progress: Report progress during execution

Only reference tools relevant to the ${templateType} workflow type.`,
    });

    return NextResponse.json({ prompt: result.text });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
