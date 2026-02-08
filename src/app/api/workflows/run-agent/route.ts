import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { startAgentWorkflow } from "@/lib/agents/run-agent-workflow";

const runAgentSchema = z.object({
  templateId: z.string().optional(),
  workflowType: z.enum(["search", "enrich", "prune", "agent"]),
  systemPrompt: z.string().optional(),
  maxSteps: z.number().int().optional(),
  model: z.string().optional(),
  config: z.record(z.unknown()).optional(),
});

/**
 * POST /api/workflows/run-agent
 * Start an agentic workflow. Creates the run synchronously and returns
 * the run ID immediately. The agent executes in the background.
 * Poll GET /api/workflows/[id]/progress for updates.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = runAgentSchema.parse(body);

    // startAgentWorkflow creates the run synchronously and fires
    // the agent loop in the background
    const run = startAgentWorkflow({
      templateId: data.templateId,
      workflowType: data.workflowType,
      systemPrompt: data.systemPrompt,
      maxSteps: data.maxSteps,
      model: data.model,
      config: data.config,
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
