import { listContentItems } from "@/lib/db/queries/content";
import { ContentListClient } from "./content-list-client";

export default async function ContentPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; origin?: string; status?: string }>;
}) {
  const params = await searchParams;
  const content = listContentItems({
    contentType: params.type,
    origin: params.origin,
    status: params.status,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-heading-1">Content</h1>
        <p className="text-muted-foreground mt-1">
          Browse, import, and manage content across platforms.
        </p>
      </div>
      <ContentListClient
        content={content}
        currentType={params.type}
        currentOrigin={params.origin}
      />
    </div>
  );
}
