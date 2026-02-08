import { NextRequest, NextResponse } from "next/server";
import { parseLinkedInCsv, importLinkedInCsv } from "@/lib/platforms/linkedin/csv-import";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!file.name.toLowerCase().endsWith(".csv")) {
      return NextResponse.json({ error: "File must be a .csv file" }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "File too large (max 5MB)" }, { status: 400 });
    }

    const text = await file.text();
    const rows = parseLinkedInCsv(text);

    if (rows.length === 0) {
      return NextResponse.json(
        { error: "No valid rows found in CSV. Make sure it's a LinkedIn Connections export." },
        { status: 400 }
      );
    }

    const result = importLinkedInCsv(rows);

    return NextResponse.json({ success: true, result, totalRows: rows.length });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Import failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
