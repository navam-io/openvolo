import { NextRequest, NextResponse } from "next/server";
import { getContactById, recalcEnrichment } from "@/lib/db/queries/contacts";
import { deleteIdentityForContact } from "@/lib/db/queries/identities";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; identityId: string }> }
) {
  const { id, identityId } = await params;

  const contact = getContactById(id);
  if (!contact) {
    return NextResponse.json({ error: "Contact not found" }, { status: 404 });
  }

  const deleted = deleteIdentityForContact(id, identityId);
  if (!deleted) {
    return NextResponse.json({ error: "Identity not found" }, { status: 404 });
  }

  recalcEnrichment(id);

  return new NextResponse(null, { status: 204 });
}
