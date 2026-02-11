import { generateText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { z } from "zod";
import { getContactById } from "@/lib/db/queries/contacts";

const requestSchema = z.object({
  mode: z.enum(["draft", "suggest", "refine"]),
  platform: z.enum(["x", "linkedin"]),
  topic: z.string().optional(),
  existingContent: z.string().optional(),
  tone: z.enum(["professional", "casual", "thought-leader", "promotional"]).default("professional"),
  contactIds: z.array(z.string()).optional(),
  // goalId: z.string().optional(), // Phase 6D dependency — uncomment when goals table exists
});

const PLATFORM_RULES: Record<string, string> = {
  x: `Platform: X (Twitter)
- Maximum 280 characters per post
- Be concise and punchy
- Use hashtags sparingly (1-2 max)
- Conversational tone works well
- Questions and hot takes drive engagement`,
  linkedin: `Platform: LinkedIn
- Maximum 3000 characters
- Start with a strong hook (first 2 lines visible before "see more")
- Use line breaks for readability
- Professional but personable
- End with a question or call to action
- Hashtags at the end (3-5)`,
};

const TONE_GUIDES: Record<string, string> = {
  professional: "Tone: Professional — authoritative, data-driven, polished language.",
  casual: "Tone: Casual — conversational, relatable, uses everyday language and light humor.",
  "thought-leader": "Tone: Thought Leader — bold opinions, contrarian takes, forward-looking insights.",
  promotional: "Tone: Promotional — highlights benefits, includes clear CTA, creates urgency.",
};

function buildSystemPrompt(platform: string, tone: string, mode: string): string {
  const parts = [
    "You are an expert social media content creator.",
    PLATFORM_RULES[platform],
    TONE_GUIDES[tone],
  ];

  if (mode === "draft") {
    parts.push(`Output format: Generate exactly 3 distinct variations of the post.
Separate each with a delimiter line:
---VARIATION 1---
[post text here]
---VARIATION 2---
[post text here]
---VARIATION 3---
[post text here]

Each variation should take a different angle or approach while staying on topic.`);
  } else if (mode === "suggest") {
    parts.push(`Output format: Generate exactly 5 content ideas.
Each idea should have a title, angle, and a short preview of what the post could say.
Separate each with a delimiter line:
---IDEA 1---
Title: [catchy title]
Angle: [what makes this unique]
Preview: [1-2 sentence preview of the post]
---IDEA 2---
...and so on through IDEA 5.`);
  } else if (mode === "refine") {
    parts.push(`Output format: Return a single improved version of the provided content.
Do NOT include delimiters or labels. Just output the refined text directly.
Preserve the author's voice while improving clarity, impact, and engagement.`);
  }

  return parts.join("\n\n");
}

function buildUserPrompt(
  mode: string,
  opts: { topic?: string; existingContent?: string; contactContext?: string },
): string {
  const parts: string[] = [];

  if (mode === "draft") {
    parts.push(`Write a social media post about: ${opts.topic}`);
  } else if (mode === "suggest") {
    parts.push(`Suggest content ideas related to: ${opts.topic}`);
  } else if (mode === "refine") {
    parts.push(`Improve this content:\n\n${opts.existingContent}`);
    if (opts.topic) {
      parts.push(`\nSpecific instructions: ${opts.topic}`);
    }
  }

  if (opts.contactContext) {
    parts.push(`\nTarget audience context:\n${opts.contactContext}`);
  }

  return parts.join("\n");
}

export async function POST(req: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return Response.json(
      { error: "ANTHROPIC_API_KEY is not configured" },
      { status: 401 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Invalid request", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { mode, platform, topic, existingContent, tone, contactIds } = parsed.data;

  // Validate mode-specific requirements
  if (mode === "refine" && !existingContent) {
    return Response.json(
      { error: "Refine mode requires existingContent" },
      { status: 400 },
    );
  }
  if ((mode === "draft" || mode === "suggest") && !topic) {
    return Response.json(
      { error: `${mode} mode requires a topic` },
      { status: 400 },
    );
  }

  // Build optional contact context
  let contactContext: string | undefined;
  if (contactIds && contactIds.length > 0) {
    const contactDetails = contactIds
      .map((id) => getContactById(id))
      .filter(Boolean)
      .map((c) => {
        const parts = [c!.name];
        if (c!.headline) parts.push(`— ${c!.headline}`);
        if (c!.company) parts.push(`at ${c!.company}`);
        if (c!.platform) parts.push(`(${c!.platform})`);
        return parts.join(" ");
      });

    if (contactDetails.length > 0) {
      contactContext = `Target audience includes: ${contactDetails.join("; ")}`;
    }
  }

  try {
    const { text } = await generateText({
      model: anthropic("claude-sonnet-4-5-20250929"),
      system: buildSystemPrompt(platform, tone, mode),
      prompt: buildUserPrompt(mode, { topic, existingContent, contactContext }),
    });

    return Response.json({ mode, platform, result: text });
  } catch (err) {
    const message = err instanceof Error ? err.message : "AI generation failed";
    return Response.json({ error: message }, { status: 500 });
  }
}
