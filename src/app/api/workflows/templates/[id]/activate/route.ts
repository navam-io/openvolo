import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getTemplate } from "@/lib/db/queries/workflow-templates";
import { startAgentWorkflow } from "@/lib/agents/run-agent-workflow";
import type { WorkflowType } from "@/lib/workflows/types";

/** Map templateType to workflowType. */
const TEMPLATE_TO_WORKFLOW_TYPE: Record<string, WorkflowType> = {
  prospecting: "search",
  enrichment: "enrich",
  pruning: "prune",
  outreach: "sequence",
  engagement: "agent",
  content: "agent",
  nurture: "agent",
};

const activateSchema = z.object({
  config: z.record(z.unknown()).optional(),
  systemPrompt: z.string().optional(),
});

/**
 * POST /api/workflows/templates/[id]/activate
 * Create and start a workflow run from a template.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const template = getTemplate(id);
  if (!template) {
    return NextResponse.json({ error: "Template not found" }, { status: 404 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const data = activateSchema.parse(body);

    // Merge user config with template defaults
    const templateConfig = JSON.parse(template.config ?? "{}");
    const mergedConfig = { ...templateConfig, ...data.config };

    // Determine workflow type from template type
    const workflowType = TEMPLATE_TO_WORKFLOW_TYPE[template.templateType] ?? "agent";

    const run = startAgentWorkflow({
      templateId: id,
      workflowType,
      systemPrompt: data.systemPrompt || template.systemPrompt || undefined,
      config: mergedConfig,
    });

    return NextResponse.json({ workflowRun: run }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
