import { NextResponse } from "next/server";
import { restoreContactsByWorkflowRun } from "@/lib/db/queries/contacts";

/**
 * POST /api/workflows/[id]/restore-all
 * Restore all contacts archived by a specific workflow run.
 */
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const count = restoreContactsByWorkflowRun(id);

  return NextResponse.json({ restored: count });
}
