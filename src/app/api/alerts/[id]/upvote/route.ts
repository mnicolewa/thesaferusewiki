import { NextResponse } from "next/server";
import { upvoteAlert } from "@/lib/alerts-store";

export async function POST(_: Request, context: { params: Promise<{ id: string }> }) {
  const params = await context.params;
  const updated = upvoteAlert(params.id);

  if (!updated) {
    return NextResponse.json({ error: "Alert not found" }, { status: 404 });
  }

  return NextResponse.json({ alert: updated });
}
