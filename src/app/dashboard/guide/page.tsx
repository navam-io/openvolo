import { getAllGuideMetas } from "@/lib/guide/registry";
import { GuideIndexClient } from "@/app/dashboard/guide/guide-index-client";

export default function GuidePage() {
  const guides = getAllGuideMetas();
  return <GuideIndexClient guides={guides} />;
}
