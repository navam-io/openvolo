import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getGoal, updateGoal, deleteGoal } from "@/lib/db/queries/goals";

const updateGoalSchema = z.object({
  name: z.string().min(1).optional(),
  goalType: z.enum(["audience_growth", "lead_generation", "content_engagement", "pipeline_progression"]).optional(),
  targetValue: z.number().int().positive().optional(),
  currentValue: z.number().int().optional(),
  unit: z.string().min(1).optional(),
  platform: z.enum(["x", "linkedin"]).nullable().optional(),
  deadline: z.number().int().nullable().optional(),
  status: z.enum(["active", "achieved", "missed", "paused"]).optional(),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const goal = getGoal(id);
  if (!goal) {
    return NextResponse.json({ error: "Goal not found" }, { status: 404 });
  }
  return NextResponse.json(goal);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const body = await req.json();
    const data = updateGoalSchema.parse(body);

    const goal = updateGoal(id, data);
    if (!goal) {
      return NextResponse.json({ error: "Goal not found" }, { status: 404 });
    }
    return NextResponse.json(goal);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const deleted = deleteGoal(id);
  if (!deleted) {
    return NextResponse.json({ error: "Goal not found" }, { status: 404 });
  }
  return NextResponse.json({ success: true });
}
