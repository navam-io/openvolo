import { generateText, tool, stepCountIs } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { z } from "zod";
import {
  createWorkflowRun,
  updateWorkflowRun,
  createWorkflowStep,
  nextStepIndex,
  listWorkflowSteps,
} from "@/lib/db/queries/workflows";
import { getTemplate, updateTemplate } from "@/lib/db/queries/workflow-templates";
import { listContacts, createContact, findContactByNameOrEmail } from "@/lib/db/queries/contacts";
import { urlFetch } from "@/lib/agents/tools/url-fetch";
import { browserScrape } from "@/lib/agents/tools/browser-scrape";
import { searchWeb } from "@/lib/agents/tools/search-web";
import { enrichContact } from "@/lib/agents/tools/enrich-contact";
import { archiveContactTool } from "@/lib/agents/tools/archive-contact";
import { engagePost } from "@/lib/agents/tools/engage-post";
import { saveDraft } from "@/lib/agents/tools/save-draft";
import { publishContent } from "@/lib/agents/tools/publish-content";
import { updateProgress } from "@/lib/agents/tools/update-progress";
import { routeUrl, shouldEscalateToBrowser } from "@/lib/agents/router";
import { updateGoalProgressFromWorkflow } from "@/lib/db/queries/goals";
import type { AgentRunConfig } from "@/lib/agents/types";
import type { WorkflowRun } from "@/lib/db/types";
import type { WorkflowType } from "@/lib/workflows/types";

const DEFAULT_MODEL = "claude-sonnet-4-5-20250929";
const MAX_STEPS_DEFAULT = 20;

/** Cost rates per 1M tokens. */
const COST_RATES: Record<string, { input: number; output: number }> = {
  "claude-sonnet-4-5-20250929": { input: 3.0, output: 15.0 },
  "claude-haiku-4-5-20251001": { input: 0.80, output: 4.0 },
};

function calculateCost(
  model: string,
  inputTokens: number,
  outputTokens: number
): number {
  const rates = COST_RATES[model] ?? COST_RATES[DEFAULT_MODEL];
  return (inputTokens * rates.input + outputTokens * rates.output) / 1_000_000;
}

/**
 * Build the system prompt for an agent workflow.
 * Includes template system prompt and context about available contacts.
 */
function buildSystemPrompt(
  templatePrompt: string | null | undefined,
  overridePrompt: string | null | undefined,
  workflowType: WorkflowType
): string {
  const base = overridePrompt || templatePrompt || getDefaultPrompt(workflowType);

  return `${base}

## Execution Context
You are running as an AUTONOMOUS background agent. There is NO human in the loop.
- Do NOT ask questions or request clarification — make reasonable assumptions and proceed.
- Do NOT wait for user input — you will not receive any.
- If information is missing, use your best judgment or search for it.
- Act decisively and complete as much as possible within your tool budget.

## Tools Available
- **search_web**: Search the internet (auto-routes between Serper and Tavily for optimal results). Pass \`count\` to control how many results are returned.
- **fetch_url**: Fetch and extract content from a web page URL
- **scrape_url**: Use a headless browser to scrape JS-rendered pages
- **create_contact**: Create a new contact in the CRM (use for each person you discover)
- **enrich_contact**: Update an existing contact with new data (fill gaps only)
- **archive_contact**: Archive a contact with a reason (used during prune workflows)
- **engage_post**: Engage with a post on X or LinkedIn (like, reply, or retweet) via browser automation
- **save_draft**: Save a content draft (post, article, thread, etc.) to the CRM content library
- **publish_content**: Publish a post to X or LinkedIn via browser automation (auto mode, returns published URL)
- **report_progress**: Report progress during execution

## Guidelines
- Always search first, then fetch relevant URLs for details
- When you discover a person, ALWAYS use \`create_contact\` to save them to the CRM
- When enriching contacts, use the "fill gaps, don't overwrite" strategy
- Make multiple search queries with different angles to maximize result count
- Report progress after completing each major step
- Return a summary of what you accomplished when done`;
}

function getDefaultPrompt(workflowType: WorkflowType): string {
  switch (workflowType) {
    case "search":
      return "You are an AI research agent. Your goal is to find people from the web and save each one as a contact in the CRM. For each person you discover, use `create_contact` to save them immediately. Make multiple search queries with different keywords and angles to reach the target result count. Pass the `count` parameter to `search_web` to get more results per query.";
    case "enrich":
      return "You are an AI enrichment agent. Your goal is to fill in missing information for existing contacts. Look up their profiles online, find their company, title, bio, and other details, then update the contact records.";
    case "prune":
      return "You are an AI data quality agent. Your goal is to identify contacts that should be archived based on specific criteria (inactive, duplicate, invalid). Review each contact, determine if they meet the pruning criteria, and use `archive_contact` to archive those that do. Provide a clear reason for each archive action.";
    case "agent":
      return "You are a general-purpose AI agent. Follow the instructions provided to complete your task using the available tools.";
    default:
      return "You are an AI agent. Complete the task using the available tools.";
  }
}

/**
 * Build a context-aware prompt that includes relevant data.
 */
function buildUserPrompt(
  config: AgentRunConfig,
  templateDescription?: string | null
): string {
  const parts: string[] = [];

  if (templateDescription) {
    parts.push(`## Task\n${templateDescription}`);
  }

  // Include contact context for enrich/prune workflows
  if (config.workflowType === "enrich" || config.workflowType === "prune") {
    const maxContacts = (config.config?.maxContacts as number) ?? 10;
    const maxScore = (config.config?.maxEnrichmentScore as number) ?? 50;
    const contacts = listContacts({ pageSize: maxContacts });

    if (contacts.data.length > 0) {
      const contactList = contacts.data
        .filter((c) => config.workflowType !== "enrich" || c.enrichmentScore <= maxScore)
        .slice(0, maxContacts)
        .map(
          (c) =>
            `- **${c.name}** (ID: ${c.id}) — Score: ${c.enrichmentScore}, Company: ${c.company || "unknown"}, Email: ${c.email || "none"}, Title: ${c.title || "none"}`
        )
        .join("\n");
      parts.push(`## Contacts to Process\n${contactList}`);
    }
  }

  // Include search-specific config
  if (config.workflowType === "search") {
    const maxResults = (config.config?.maxResults as number) ?? 20;
    parts.push(`## Search Instructions
- **Target: Find ${maxResults} people** and save each one using \`create_contact\`
- Use \`count: ${maxResults}\` when calling \`search_web\` to request enough results per query
- Make multiple varied search queries (different keywords, angles, sources) if the first search doesn't yield ${maxResults} people
- For each person you find, call \`create_contact\` with their name and any available details (company, title, email, bio, etc.)
- Report progress after every batch of contacts created`);

    const targetDomains = config.config?.targetDomains as string[] | undefined;
    if (targetDomains && targetDomains.length > 0) {
      parts.push(`- Focus on these domains: ${targetDomains.join(", ")}`);
    }

    // Include existing contacts so the agent skips known people
    const existingContacts = listContacts({ pageSize: 200 });
    if (existingContacts.data.length > 0) {
      const names = existingContacts.data.map((c) => c.name).join(", ");
      parts.push(`## Existing Contacts (skip these — already in CRM)\n${names}\n\nDo NOT call \`create_contact\` for anyone in this list. Focus on finding net-new people.`);
    }
  }

  // Include prune-specific config
  if (config.workflowType === "prune") {
    const criteria = config.config?.criteria as string | undefined;
    if (criteria) {
      parts.push(`## Pruning Criteria\n${criteria}`);
    }

    const companyName = config.config?.companyName as string | undefined;
    if (companyName) {
      parts.push(`- Filter by company: ${companyName}`);
    }
  }

  // Include agent-type config (content, engagement, outreach templates)
  if (config.workflowType === "agent" || config.workflowType === "sequence") {
    const configFields: string[] = [];

    const topics = config.config?.topics as string[] | undefined;
    if (topics && topics.length > 0) {
      configFields.push(`- **Topics/Industries**: ${topics.join(", ")}`);
    }

    const tone = config.config?.tone as string | undefined;
    if (tone) {
      configFields.push(`- **Tone**: ${tone}`);
    }

    const frequency = config.config?.frequency as string | undefined;
    if (frequency) {
      configFields.push(`- **Frequency**: ${frequency}`);
    }

    const maxReplies = config.config?.maxReplies as number | undefined;
    if (maxReplies) {
      configFields.push(`- **Max Replies**: ${maxReplies}`);
    }

    const maxEngagements = config.config?.maxEngagements as number | undefined;
    if (maxEngagements) {
      configFields.push(`- **Max Engagements**: ${maxEngagements}`);
    }

    const platforms = config.config?.platforms as string[] | undefined;
    if (platforms && platforms.length > 0) {
      configFields.push(`- **Platforms**: ${platforms.join(", ")}`);
    }

    if (configFields.length > 0) {
      parts.push(`## Configuration\n${configFields.join("\n")}`);
    }

    if (!topics || topics.length === 0) {
      parts.push("Note: No specific topics configured. Research broadly trending topics in technology and business.");
    }
  }

  if (parts.length === 0) {
    parts.push("Complete the workflow task using the available tools.");
  }

  return parts.join("\n\n");
}

/**
 * Run an agentic workflow using Vercel AI SDK 6 generateText() with tools.
 *
 * Creates a workflowRun, executes the agentic loop, maps steps to
 * workflowSteps, tracks token usage and cost, and returns the final run.
 */
export async function runAgentWorkflow(
  config: AgentRunConfig
): Promise<WorkflowRun> {
  const now = Math.floor(Date.now() / 1000);
  const modelId = config.model ?? DEFAULT_MODEL;
  const maxSteps = config.maxSteps ?? MAX_STEPS_DEFAULT;

  // Load template if provided
  const template = config.templateId ? getTemplate(config.templateId) : null;

  // Create the workflow run — inject templateName + templateCategory for display
  const runConfig = {
    ...config.config,
    ...(template ? { templateName: template.name, templateCategory: template.templateType } : {}),
  };
  const run = createWorkflowRun({
    workflowType: config.workflowType,
    templateId: config.templateId,
    status: "running",
    config: JSON.stringify(runConfig),
    trigger: config.templateId ? "template" : "user",
    model: modelId,
    startedAt: now,
  });

  const runId = run.id;

  // Build prompts
  const systemPrompt = buildSystemPrompt(
    template?.systemPrompt,
    config.systemPrompt,
    config.workflowType
  );
  const userPrompt = buildUserPrompt(config, template?.description);

  try {
    const result = await generateText({
      model: anthropic(modelId),
      system: systemPrompt,
      prompt: userPrompt,
      maxOutputTokens: 16000,
      stopWhen: stepCountIs(maxSteps),
      tools: {
        search_web: tool({
          description:
            "Search the web for information. Returns a list of results with title, URL, and snippet.",
          inputSchema: z.object({
            query: z.string().describe("The search query"),
            count: z.number().optional().describe("Number of results (default 10)"),
          }),
          execute: async ({ query, count }) => {
            return searchWeb(query, runId, { count, workflowType: config.workflowType });
          },
        }),

        fetch_url: tool({
          description:
            "Fetch and extract readable content from a web page URL. Best for static HTML pages. Returns title, description, and main text content.",
          inputSchema: z.object({
            url: z.string().describe("The URL to fetch"),
          }),
          execute: async ({ url }) => {
            // Use routing to decide strategy
            const routing = routeUrl(url);

            // Log routing decision
            createWorkflowStep({
              workflowRunId: runId,
              stepIndex: nextStepIndex(runId),
              stepType: "routing_decision",
              status: "completed",
              url,
              tool: "router",
              output: JSON.stringify(routing),
            });

            if (routing.strategy === "browser_scrape") {
              // Route directly to browser scrape
              return browserScrape(url, runId);
            }

            // Try url_fetch first
            const fetchResult = await urlFetch(url, runId);

            // Escalate to browser if content is insufficient
            if (
              fetchResult.needsBrowser &&
              shouldEscalateToBrowser(fetchResult.content, fetchResult.contentLength)
            ) {
              createWorkflowStep({
                workflowRunId: runId,
                stepIndex: nextStepIndex(runId),
                stepType: "routing_decision",
                status: "completed",
                url,
                tool: "router",
                output: JSON.stringify({
                  escalation: true,
                  reason: "url_fetch returned insufficient content, escalating to browser",
                }),
              });

              return browserScrape(url, runId);
            }

            return fetchResult;
          },
        }),

        scrape_url: tool({
          description:
            "Scrape a web page using a headless browser. Use this for JavaScript-rendered pages (SPAs). Slower but handles dynamic content.",
          inputSchema: z.object({
            url: z.string().describe("The URL to scrape"),
            selector: z
              .string()
              .optional()
              .describe("CSS selector to extract specific content"),
          }),
          execute: async ({ url, selector }) => {
            return browserScrape(url, runId, { selector });
          },
        }),

        enrich_contact: tool({
          description:
            'Update an existing contact with new data. Uses "fill gaps, don\'t overwrite" — only empty fields are updated. Provide the contact ID and any data to add.',
          inputSchema: z.object({
            contactId: z.string().describe("The contact ID to enrich"),
            company: z.string().optional().describe("Company name"),
            title: z.string().optional().describe("Job title"),
            headline: z.string().optional().describe("Professional headline"),
            email: z.string().optional().describe("Email address"),
            location: z.string().optional().describe("Location"),
            website: z.string().optional().describe("Website URL"),
            bio: z.string().optional().describe("Bio or summary"),
            tags: z
              .array(z.string())
              .optional()
              .describe("Tags to add"),
          }),
          execute: async (params) => {
            const { contactId, ...data } = params;
            return enrichContact(contactId, data, runId);
          },
        }),

        archive_contact: tool({
          description:
            "Archive a contact with a reason. Use this during prune workflows to mark contacts for removal from the active list.",
          inputSchema: z.object({
            contactId: z.string().describe("The contact ID to archive"),
            reason: z.string().describe("Why this contact is being archived"),
          }),
          execute: async ({ contactId, reason }) => {
            return archiveContactTool(contactId, reason, runId);
          },
        }),

        create_contact: tool({
          description:
            "Create a new contact record in the CRM. Use this for each person you discover during search workflows. At minimum a name is required.",
          inputSchema: z.object({
            name: z.string().describe("Full name of the contact"),
            email: z.string().optional().describe("Email address"),
            company: z.string().optional().describe("Company name"),
            title: z.string().optional().describe("Job title"),
            headline: z.string().optional().describe("Professional headline"),
            location: z.string().optional().describe("Location"),
            website: z.string().optional().describe("Website URL"),
            bio: z.string().optional().describe("Bio or summary"),
            platform: z
              .enum(["x", "linkedin", "gmail", "substack"])
              .optional()
              .describe("Primary platform"),
            funnelStage: z
              .enum(["prospect", "engaged", "qualified", "opportunity", "customer", "advocate"])
              .optional()
              .describe("Funnel stage (defaults to prospect)"),
            tags: z
              .array(z.string())
              .optional()
              .describe("Tags to categorize the contact"),
          }),
          execute: async ({ name, email, company, title, headline, location, website, bio, platform, funnelStage, tags }) => {
            // Dedup: check if contact already exists by email or name
            const existing = findContactByNameOrEmail(name, email);
            if (existing) {
              const matchedBy = email && existing.email === email ? "email" : "name";
              createWorkflowStep({
                workflowRunId: runId,
                stepIndex: nextStepIndex(runId),
                stepType: "contact_create",
                status: "skipped",
                tool: "create_contact",
                output: JSON.stringify({
                  contactId: existing.id,
                  name: existing.name,
                  matchedBy,
                  reason: "duplicate",
                }),
              });
              return {
                id: existing.id,
                name: existing.name,
                enrichmentScore: existing.enrichmentScore,
                message: `Contact already exists (matched by ${matchedBy}). Skipped creation.`,
              };
            }

            const contact = createContact({
              name,
              email: email ?? null,
              company: company ?? null,
              title: title ?? null,
              headline: headline ?? null,
              location: location ?? null,
              website: website ?? null,
              bio: bio ?? null,
              platform: platform ?? "x",
              funnelStage: funnelStage ?? "prospect",
              tags: tags ? JSON.stringify(tags) : null,
            });

            createWorkflowStep({
              workflowRunId: runId,
              stepIndex: nextStepIndex(runId),
              stepType: "contact_create",
              status: "completed",
              tool: "create_contact",
              output: JSON.stringify({
                contactId: contact.id,
                name: contact.name,
                enrichmentScore: contact.enrichmentScore,
              }),
            });

            return {
              id: contact.id,
              name: contact.name,
              enrichmentScore: contact.enrichmentScore,
              message: `Contact "${contact.name}" created successfully.`,
            };
          },
        }),

        engage_post: tool({
          description:
            "Engage with a post on X or LinkedIn via browser automation. Supports like, reply, and retweet actions. Requires a browser session to be set up.",
          inputSchema: z.object({
            platform: z.enum(["x", "linkedin"]).describe("Social media platform"),
            postUrl: z.string().describe("Full URL of the post to engage with"),
            action: z.enum(["like", "reply", "retweet"]).describe("Engagement action"),
            replyText: z.string().optional().describe("Text for reply action (required if action is reply)"),
          }),
          execute: async ({ platform, postUrl, action, replyText }) => {
            return engagePost(platform, postUrl, action, runId, { replyText });
          },
        }),

        save_draft: tool({
          description:
            "Save a content draft to the CRM content library. Use this to persist generated posts, articles, or other content as drafts that will appear in Content > Drafts.",
          inputSchema: z.object({
            title: z.string().optional().describe("Title for the content item"),
            body: z.string().describe("The full content/post text"),
            contentType: z.string().optional().describe("Content type: post, article, thread, reply (default: post)"),
            platformTarget: z.string().optional().describe("Target platform: x, linkedin, etc."),
            generationPrompt: z.string().optional().describe("The prompt that generated this content"),
          }),
          execute: async (params) => {
            return saveDraft(params, runId);
          },
        }),

        publish_content: tool({
          description:
            "Publish content to X or LinkedIn via browser automation. Returns the published post URL. Requires a browser session to be set up.",
          inputSchema: z.object({
            platform: z.enum(["x", "linkedin"]).describe("Target platform"),
            text: z.string().describe("The post content text"),
            mediaAssetIds: z.array(z.string()).optional().describe("Media asset IDs to attach"),
            threadTexts: z.array(z.string()).optional().describe("Additional thread texts (X only)"),
          }),
          execute: async ({ platform, text, mediaAssetIds, threadTexts }) => {
            return publishContent({ platform, text, mediaAssetIds, threadTexts }, runId);
          },
        }),

        report_progress: tool({
          description:
            "Report your current progress. Use this after completing major steps to keep the user informed.",
          inputSchema: z.object({
            message: z
              .string()
              .describe("A brief progress update message"),
            processedItems: z
              .number()
              .optional()
              .describe("Total items processed so far"),
            successItems: z
              .number()
              .optional()
              .describe("Total successful items so far"),
          }),
          execute: async (params) => {
            return updateProgress(runId, params);
          },
        }),
      },
    });

    // Map response steps to workflow steps for observability
    for (const step of result.steps) {
      // Log text output as thinking steps
      if (step.text && step.text.trim().length > 0) {
        createWorkflowStep({
          workflowRunId: runId,
          stepIndex: nextStepIndex(runId),
          stepType: "thinking",
          status: "completed",
          tool: "llm",
          output: JSON.stringify({ text: step.text.slice(0, 4000) }),
        });
      }

      // Tool calls are already logged by the individual tool execute functions,
      // but we log the LLM's decision to call each tool
      for (const tc of step.toolCalls) {
        createWorkflowStep({
          workflowRunId: runId,
          stepIndex: nextStepIndex(runId),
          stepType: "tool_call",
          status: "completed",
          tool: tc.toolName,
          input: JSON.stringify(tc.input),
        });
      }
    }

    // Extract usage
    const inputTokens = result.usage?.inputTokens ?? 0;
    const outputTokens = result.usage?.outputTokens ?? 0;
    const costUsd = calculateCost(modelId, inputTokens, outputTokens);

    // Build result summary
    const resultData: Record<string, unknown> = {
      finalText: result.text?.slice(0, 8000) ?? "",
      stepsCount: result.steps.length,
    };

    // Add prune-specific result summary
    if (config.workflowType === "prune") {
      resultData.pruneResult = buildPruneResult(runId);
    }

    // Update the run with final results
    const finalRun = updateWorkflowRun(runId, {
      status: "completed",
      completedAt: Math.floor(Date.now() / 1000),
      model: modelId,
      inputTokens,
      outputTokens,
      costUsd,
      result: JSON.stringify(resultData),
    });

    // Update template stats if applicable
    if (config.templateId && template) {
      updateTemplate(config.templateId, {
        totalRuns: (template.totalRuns ?? 0) + 1,
        lastRunAt: Math.floor(Date.now() / 1000),
      });
    }

    // Auto-update goal progress from workflow completion
    if (config.templateId) {
      try {
        updateGoalProgressFromWorkflow(config.templateId, runId, config.workflowType, resultData);
      } catch {
        // Goal progress tracking is non-critical — don't fail the run
      }
    }

    return finalRun ?? run;
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);

    // Log the error
    createWorkflowStep({
      workflowRunId: runId,
      stepIndex: nextStepIndex(runId),
      stepType: "error",
      status: "failed",
      tool: "agent_runner",
      error: errorMessage,
      durationMs: (Math.floor(Date.now() / 1000) - now) * 1000,
    });

    // Update run as failed
    const failedRun = updateWorkflowRun(runId, {
      status: "failed",
      completedAt: Math.floor(Date.now() / 1000),
      errors: JSON.stringify([errorMessage]),
      errorItems: 1,
    });

    return failedRun ?? run;
  }
}

/**
 * Start an agent workflow in the background.
 * Creates the run synchronously and returns the run ID immediately.
 * The agent continues executing asynchronously.
 */
export function startAgentWorkflow(config: AgentRunConfig): WorkflowRun {
  const now = Math.floor(Date.now() / 1000);
  const modelId = config.model ?? DEFAULT_MODEL;

  // Load template early so we can inject templateName into config
  const template = config.templateId ? getTemplate(config.templateId) : null;

  // Create the run synchronously so we can return the ID immediately
  const runConfig = {
    ...config.config,
    ...(template ? { templateName: template.name, templateCategory: template.templateType } : {}),
  };
  const run = createWorkflowRun({
    workflowType: config.workflowType,
    templateId: config.templateId,
    status: "running",
    config: JSON.stringify(runConfig),
    trigger: config.templateId ? "template" : "user",
    model: modelId,
    startedAt: now,
  });

  // Fire-and-forget: execute the agent in the background
  // Pass pre-loaded template to avoid double fetch
  executeAgentLoop(run.id, config, template ?? undefined).catch((err) => {
    console.error(`[agent-runner] Run ${run.id} failed:`, err);
  });

  return run;
}

/**
 * Internal: execute the agent loop for an existing run.
 * Used by startAgentWorkflow for fire-and-forget execution.
 */
async function executeAgentLoop(
  runId: string,
  config: AgentRunConfig,
  preloadedTemplate?: ReturnType<typeof getTemplate>
): Promise<void> {
  const now = Math.floor(Date.now() / 1000);
  const modelId = config.model ?? DEFAULT_MODEL;
  const maxSteps = config.maxSteps ?? MAX_STEPS_DEFAULT;

  const template = preloadedTemplate ?? (config.templateId ? getTemplate(config.templateId) : null);

  const systemPrompt = buildSystemPrompt(
    template?.systemPrompt,
    config.systemPrompt,
    config.workflowType
  );
  const userPrompt = buildUserPrompt(config, template?.description);

  try {
    const result = await generateText({
      model: anthropic(modelId),
      system: systemPrompt,
      prompt: userPrompt,
      maxOutputTokens: 16000,
      stopWhen: stepCountIs(maxSteps),
      tools: {
        search_web: tool({
          description:
            "Search the web for information. Returns a list of results with title, URL, and snippet.",
          inputSchema: z.object({
            query: z.string().describe("The search query"),
            count: z.number().optional().describe("Number of results (default 10)"),
          }),
          execute: async ({ query, count }) => {
            return searchWeb(query, runId, { count, workflowType: config.workflowType });
          },
        }),

        fetch_url: tool({
          description:
            "Fetch and extract readable content from a web page URL. Best for static HTML pages.",
          inputSchema: z.object({
            url: z.string().describe("The URL to fetch"),
          }),
          execute: async ({ url }) => {
            const routing = routeUrl(url);
            createWorkflowStep({
              workflowRunId: runId,
              stepIndex: nextStepIndex(runId),
              stepType: "routing_decision",
              status: "completed",
              url,
              tool: "router",
              output: JSON.stringify(routing),
            });

            if (routing.strategy === "browser_scrape") {
              return browserScrape(url, runId);
            }

            const fetchResult = await urlFetch(url, runId);
            if (
              fetchResult.needsBrowser &&
              shouldEscalateToBrowser(fetchResult.content, fetchResult.contentLength)
            ) {
              return browserScrape(url, runId);
            }
            return fetchResult;
          },
        }),

        scrape_url: tool({
          description:
            "Scrape a web page using a headless browser for JS-rendered pages.",
          inputSchema: z.object({
            url: z.string().describe("The URL to scrape"),
            selector: z.string().optional().describe("CSS selector"),
          }),
          execute: async ({ url, selector }) => {
            return browserScrape(url, runId, { selector });
          },
        }),

        enrich_contact: tool({
          description:
            'Update an existing contact with new data using "fill gaps, don\'t overwrite".',
          inputSchema: z.object({
            contactId: z.string().describe("The contact ID to enrich"),
            company: z.string().optional(),
            title: z.string().optional(),
            headline: z.string().optional(),
            email: z.string().optional(),
            location: z.string().optional(),
            website: z.string().optional(),
            bio: z.string().optional(),
            tags: z.array(z.string()).optional(),
          }),
          execute: async (params) => {
            const { contactId, ...data } = params;
            return enrichContact(contactId, data, runId);
          },
        }),

        archive_contact: tool({
          description:
            "Archive a contact with a reason. Use this during prune workflows to mark contacts for removal.",
          inputSchema: z.object({
            contactId: z.string().describe("The contact ID to archive"),
            reason: z.string().describe("Why this contact is being archived"),
          }),
          execute: async ({ contactId, reason }) => {
            return archiveContactTool(contactId, reason, runId);
          },
        }),

        create_contact: tool({
          description:
            "Create a new contact record in the CRM. Use this for each person you discover during search workflows.",
          inputSchema: z.object({
            name: z.string().describe("Full name of the contact"),
            email: z.string().optional().describe("Email address"),
            company: z.string().optional().describe("Company name"),
            title: z.string().optional().describe("Job title"),
            headline: z.string().optional().describe("Professional headline"),
            location: z.string().optional().describe("Location"),
            website: z.string().optional().describe("Website URL"),
            bio: z.string().optional().describe("Bio or summary"),
            platform: z
              .enum(["x", "linkedin", "gmail", "substack"])
              .optional()
              .describe("Primary platform"),
            funnelStage: z
              .enum(["prospect", "engaged", "qualified", "opportunity", "customer", "advocate"])
              .optional()
              .describe("Funnel stage (defaults to prospect)"),
            tags: z.array(z.string()).optional().describe("Tags to categorize the contact"),
          }),
          execute: async ({ name, email, company, title, headline, location, website, bio, platform, funnelStage, tags }) => {
            // Dedup: check if contact already exists by email or name
            const existing = findContactByNameOrEmail(name, email);
            if (existing) {
              const matchedBy = email && existing.email === email ? "email" : "name";
              createWorkflowStep({
                workflowRunId: runId,
                stepIndex: nextStepIndex(runId),
                stepType: "contact_create",
                status: "skipped",
                tool: "create_contact",
                output: JSON.stringify({
                  contactId: existing.id,
                  name: existing.name,
                  matchedBy,
                  reason: "duplicate",
                }),
              });
              return {
                id: existing.id,
                name: existing.name,
                enrichmentScore: existing.enrichmentScore,
                message: `Contact already exists (matched by ${matchedBy}). Skipped creation.`,
              };
            }

            const contact = createContact({
              name,
              email: email ?? null,
              company: company ?? null,
              title: title ?? null,
              headline: headline ?? null,
              location: location ?? null,
              website: website ?? null,
              bio: bio ?? null,
              platform: platform ?? "x",
              funnelStage: funnelStage ?? "prospect",
              tags: tags ? JSON.stringify(tags) : null,
            });

            createWorkflowStep({
              workflowRunId: runId,
              stepIndex: nextStepIndex(runId),
              stepType: "contact_create",
              status: "completed",
              tool: "create_contact",
              output: JSON.stringify({
                contactId: contact.id,
                name: contact.name,
                enrichmentScore: contact.enrichmentScore,
              }),
            });

            return {
              id: contact.id,
              name: contact.name,
              enrichmentScore: contact.enrichmentScore,
              message: `Contact "${contact.name}" created successfully.`,
            };
          },
        }),

        engage_post: tool({
          description:
            "Engage with a post on X or LinkedIn via browser automation (like, reply, retweet).",
          inputSchema: z.object({
            platform: z.enum(["x", "linkedin"]).describe("Social media platform"),
            postUrl: z.string().describe("Full URL of the post"),
            action: z.enum(["like", "reply", "retweet"]).describe("Engagement action"),
            replyText: z.string().optional().describe("Text for reply action"),
          }),
          execute: async ({ platform, postUrl, action, replyText }) => {
            return engagePost(platform, postUrl, action, runId, { replyText });
          },
        }),

        save_draft: tool({
          description:
            "Save a content draft to the CRM content library. Persists posts, articles, or threads as drafts.",
          inputSchema: z.object({
            title: z.string().optional().describe("Title for the content item"),
            body: z.string().describe("The full content/post text"),
            contentType: z.string().optional().describe("Content type: post, article, thread, reply (default: post)"),
            platformTarget: z.string().optional().describe("Target platform: x, linkedin, etc."),
            generationPrompt: z.string().optional().describe("The prompt that generated this content"),
          }),
          execute: async (params) => {
            return saveDraft(params, runId);
          },
        }),

        publish_content: tool({
          description:
            "Publish content to X or LinkedIn via browser automation (auto mode, returns published URL).",
          inputSchema: z.object({
            platform: z.enum(["x", "linkedin"]).describe("Target platform"),
            text: z.string().describe("The post content text"),
            mediaAssetIds: z.array(z.string()).optional().describe("Media asset IDs to attach"),
            threadTexts: z.array(z.string()).optional().describe("Additional thread texts (X only)"),
          }),
          execute: async ({ platform, text, mediaAssetIds, threadTexts }) => {
            return publishContent({ platform, text, mediaAssetIds, threadTexts }, runId);
          },
        }),

        report_progress: tool({
          description: "Report your current progress.",
          inputSchema: z.object({
            message: z.string().describe("Progress update message"),
            processedItems: z.number().optional(),
            successItems: z.number().optional(),
          }),
          execute: async (params) => {
            return updateProgress(runId, params);
          },
        }),
      },
    });

    // Map response steps to workflow steps
    for (const step of result.steps) {
      if (step.text && step.text.trim().length > 0) {
        createWorkflowStep({
          workflowRunId: runId,
          stepIndex: nextStepIndex(runId),
          stepType: "thinking",
          status: "completed",
          tool: "llm",
          output: JSON.stringify({ text: step.text.slice(0, 4000) }),
        });
      }
    }

    const inputTokens = result.usage?.inputTokens ?? 0;
    const outputTokens = result.usage?.outputTokens ?? 0;
    const costUsd = calculateCost(modelId, inputTokens, outputTokens);

    // Build result summary
    const resultData: Record<string, unknown> = {
      finalText: result.text?.slice(0, 8000) ?? "",
      stepsCount: result.steps.length,
    };

    if (config.workflowType === "prune") {
      resultData.pruneResult = buildPruneResult(runId);
    }

    updateWorkflowRun(runId, {
      status: "completed",
      completedAt: Math.floor(Date.now() / 1000),
      model: modelId,
      inputTokens,
      outputTokens,
      costUsd,
      result: JSON.stringify(resultData),
    });

    if (config.templateId && template) {
      updateTemplate(config.templateId, {
        totalRuns: (template.totalRuns ?? 0) + 1,
        lastRunAt: Math.floor(Date.now() / 1000),
      });
    }

    // Auto-update goal progress from workflow completion
    if (config.templateId) {
      try {
        updateGoalProgressFromWorkflow(config.templateId, runId, config.workflowType, resultData);
      } catch {
        // Goal progress tracking is non-critical — don't fail the run
      }
    }
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);

    createWorkflowStep({
      workflowRunId: runId,
      stepIndex: nextStepIndex(runId),
      stepType: "error",
      status: "failed",
      tool: "agent_runner",
      error: errorMessage,
      durationMs: (Math.floor(Date.now() / 1000) - now) * 1000,
    });

    updateWorkflowRun(runId, {
      status: "failed",
      completedAt: Math.floor(Date.now() / 1000),
      errors: JSON.stringify([errorMessage]),
      errorItems: 1,
    });
  }
}

/**
 * Build a prune result summary from the workflow steps.
 * Counts archived contacts and extracts their details.
 */
function buildPruneResult(runId: string) {
  const steps = listWorkflowSteps(runId);
  const archiveSteps = steps.filter(
    (s) => s.stepType === "contact_archive" && s.status === "completed"
  );

  const archivedContacts = archiveSteps.map((s) => {
    const output = JSON.parse(s.output ?? "{}");
    return {
      contactId: output.contactId ?? s.contactId,
      contactName: output.contactName ?? "Unknown",
      reason: output.reason ?? "",
    };
  });

  // Count total contacts evaluated (all contacts passed to the agent)
  const evaluateSteps = steps.filter(
    (s) => s.stepType === "contact_archive"
  );

  return {
    evaluated: evaluateSteps.length,
    archived: archivedContacts.length,
    kept: evaluateSteps.length - archivedContacts.length,
    archivedContacts,
  };
}
