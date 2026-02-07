import { notFound } from "next/navigation";
import { getContactById } from "@/lib/db/queries/contacts";
import { getTasksByContact } from "@/lib/db/queries/tasks";
import { ContactDetailClient } from "./contact-detail-client";

export default async function ContactDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const contact = getContactById(id);

  if (!contact) {
    notFound();
  }

  const tasks = getTasksByContact(id);

  return <ContactDetailClient contact={contact} tasks={tasks} />;
}
