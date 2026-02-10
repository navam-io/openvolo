import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { CronExpressionParser } from "cron-parser";
import {
  listScheduledJobs,
  createScheduledJob,
} from "@/lib/db/queries/scheduled-jobs";

const createScheduleSchema = z.object({
  templateId: z.string().min(1, "templateId is required"),
  cronExpression: z.string().min(1, "cronExpression is required"),
  payload: z.record(z.unknown()).optional(),
  enabled: z.boolean().optional(),
});

/**
 * GET /api/workflows/schedule
 * List all scheduled jobs.
 */
export async function GET() {
  const jobs = listScheduledJobs();
  return NextResponse.json({ data: jobs });
}

/**
 * POST /api/workflows/schedule
 * Create a new scheduled job for a workflow template.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = createScheduleSchema.parse(body);

    // Validate cron expression
    try {
      CronExpressionParser.parse(data.cronExpression);
    } catch {
      return NextResponse.json(
        { error: "Invalid cron expression" },
        { status: 400 }
      );
    }

    const job = createScheduledJob({
      jobType: "workflow",
      templateId: data.templateId,
      cronExpression: data.cronExpression,
      payload: data.payload ? JSON.stringify(data.payload) : "{}",
      enabled: data.enabled !== false ? 1 : 0,
    });

    return NextResponse.json(job, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
