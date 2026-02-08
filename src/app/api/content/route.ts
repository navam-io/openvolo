import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { listContentItems, createContentItem } from "@/lib/db/queries/content";

const createContentSchema = z.object({
  title: z.string().optional(),
  body: z.string().optional(),
  contentType: z.enum(["post", "article", "thread", "reply", "image", "video", "email", "dm", "newsletter"]),
  platformTarget: z.string().optional(),
  status: z.enum(["draft", "review", "approved", "scheduled", "published", "imported"]).optional(),
  origin: z.enum(["authored", "received", "imported"]).optional(),
  direction: z.enum(["inbound", "outbound"]).optional(),
  platformAccountId: z.string().optional(),
  contactId: z.string().optional(),
  threadId: z.string().optional(),
  parentItemId: z.string().optional(),
  platformData: z.string().optional(),
});

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const contentType = searchParams.get("type") ?? undefined;
  const origin = searchParams.get("origin") ?? undefined;
  const platform = searchParams.get("platform") ?? undefined;
  const status = searchParams.get("status") ?? undefined;
  const platformAccountId = searchParams.get("platformAccountId") ?? undefined;

  const results = listContentItems({ contentType, origin, platform, status, platformAccountId });
  return NextResponse.json(results);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = createContentSchema.parse(body);

    const item = createContentItem(data);
    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
