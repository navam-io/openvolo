import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { linkWorkflowToGoal, unlinkWorkflowFromGoal } from "@/lib/db/queries/goals";

const linkSchema = z.object({
  templateId: z.string().min(1),
  contribution: z.enum(["primary", "supporting"]).optional(),
});

const unlinkSchema = z.object({
  linkId: z.string().min(1),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const body = await req.json();
    const data = linkSchema.parse(body);

    const link = linkWorkflowToGoal(id, data.templateId, data.contribution);
    return NextResponse.json(link, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: _goalId } = await params;
  try {
    const body = await req.json();
    const data = unlinkSchema.parse(body);

    const deleted = unlinkWorkflowFromGoal(data.linkId);
    if (!deleted) {
      return NextResponse.json({ error: "Link not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
