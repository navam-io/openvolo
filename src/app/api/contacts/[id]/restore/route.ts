import { NextResponse } from "next/server";
import { restoreContact } from "@/lib/db/queries/contacts";

/**
 * POST /api/contacts/[id]/restore
 * Restore an archived contact.
 */
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const contact = restoreContact(id);

  if (!contact) {
    return NextResponse.json({ error: "Contact not found" }, { status: 404 });
  }

  return NextResponse.json(contact);
}
