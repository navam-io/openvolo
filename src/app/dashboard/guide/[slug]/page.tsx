import { notFound } from "next/navigation";
import { getGuideContent } from "@/lib/guide/loader";
import { getAllGuideMetas } from "@/lib/guide/registry";
import { GuideDetailClient } from "@/app/dashboard/guide/[slug]/guide-detail-client";

export default async function GuideDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const result = getGuideContent(slug);
  if (!result) notFound();

  const allGuides = getAllGuideMetas();

  return (
    <GuideDetailClient
      meta={result.meta}
      content={result.content}
      allGuides={allGuides}
    />
  );
}
