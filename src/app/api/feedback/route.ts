import { NextRequest, NextResponse } from "next/server";

interface FeedbackEntry {
  id: string;
  type: "helpful" | "not-helpful" | "general";
  context: string;       // which section/feature
  rating: number | null; // 1-5 or null
  message: string;
  timestamp: string;
}

// In-memory store — persists for the lifetime of the server process.
// For persistent storage swap this with a DB write.
const feedbackLog: FeedbackEntry[] = [];

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { type, context, rating, message } = body as Record<string, unknown>;

  if (!type || !context) {
    return NextResponse.json({ error: "type and context are required" }, { status: 400 });
  }

  const allowedTypes = ["helpful", "not-helpful", "general"];
  if (!allowedTypes.includes(String(type))) {
    return NextResponse.json({ error: "Invalid type" }, { status: 400 });
  }

  // Sanitise: cap message at 1000 chars, strip any HTML
  const safeMessage = String(message ?? "")
    .replace(/<[^>]*>/g, "")
    .slice(0, 1000);

  const entry: FeedbackEntry = {
    id: crypto.randomUUID(),
    type: type as FeedbackEntry["type"],
    context: String(context).slice(0, 100),
    rating: typeof rating === "number" ? Math.min(5, Math.max(1, Math.round(rating))) : null,
    message: safeMessage,
    timestamp: new Date().toISOString(),
  };

  feedbackLog.push(entry);

  return NextResponse.json({ ok: true, id: entry.id }, { status: 201 });
}

export async function GET(req: NextRequest) {
  const token = process.env.FEEDBACK_ADMIN_TOKEN;
  const provided = req.nextUrl.searchParams.get("token");

  // If no token is configured, block access entirely
  if (!token || provided !== token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({
    count: feedbackLog.length,
    entries: feedbackLog,
  });
}
