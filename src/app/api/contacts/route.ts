import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { listContacts, createContact } from "@/lib/db/queries/contacts";

const createContactSchema = z.object({
  name: z.string().min(1, "Name is required"),
  headline: z.string().optional(),
  company: z.string().optional(),
  title: z.string().optional(),
  platform: z.enum(["x", "linkedin", "gmail", "substack"]).optional(),
  platformUserId: z.string().optional(),
  profileUrl: z.string().optional(),
  avatarUrl: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  bio: z.string().optional(),
  tags: z.string().optional(),
  funnelStage: z
    .enum(["prospect", "engaged", "qualified", "opportunity", "customer", "advocate"])
    .optional(),
  score: z.number().int().min(0).optional(),
});

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") ?? undefined;
  const funnelStage = searchParams.get("funnelStage") ?? undefined;
  const platform = searchParams.get("platform") ?? undefined;

  const results = listContacts({ search, funnelStage, platform });
  return NextResponse.json(results);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = createContactSchema.parse(body);
    const contact = createContact(data);
    return NextResponse.json(contact, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
