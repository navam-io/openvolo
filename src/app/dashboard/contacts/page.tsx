import { listContacts } from "@/lib/db/queries/contacts";
import { ContactListClient } from "./contact-list-client";

export default async function ContactsPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; funnelStage?: string; platform?: string }>;
}) {
  const params = await searchParams;
  const contacts = listContacts({
    search: params.search,
    funnelStage: params.funnelStage,
    platform: params.platform,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Contacts</h1>
        <p className="text-muted-foreground">
          Manage your CRM contacts across platforms.
        </p>
      </div>
      <ContactListClient
        contacts={contacts}
        currentSearch={params.search}
        currentFunnelStage={params.funnelStage}
      />
    </div>
  );
}
