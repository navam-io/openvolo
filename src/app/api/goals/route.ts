import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { listGoals, createGoal } from "@/lib/db/queries/goals";

const createGoalSchema = z.object({
  name: z.string().min(1),
  goalType: z.enum(["audience_growth", "lead_generation", "content_engagement", "pipeline_progression"]),
  targetValue: z.number().int().positive(),
  unit: z.string().min(1),
  platform: z.enum(["x", "linkedin"]).nullable().optional(),
  deadline: z.number().int().nullable().optional(),
});

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") ?? undefined;
  const goalType = searchParams.get("goalType") ?? undefined;
  const page = parseInt(searchParams.get("page") ?? "1", 10) || 1;
  const pageSize = parseInt(searchParams.get("pageSize") ?? "25", 10) || 25;

  const result = listGoals({ status, goalType, page, pageSize });
  return NextResponse.json({ data: result.data, total: result.total });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = createGoalSchema.parse(body);

    const goal = createGoal({
      name: data.name,
      goalType: data.goalType,
      targetValue: data.targetValue,
      unit: data.unit,
      platform: data.platform ?? null,
      deadline: data.deadline ?? null,
    });

    return NextResponse.json(goal, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
