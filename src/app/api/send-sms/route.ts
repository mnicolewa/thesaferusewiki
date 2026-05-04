import { NextRequest, NextResponse } from "next/server";
import { sendSms } from "@/services/twilio";

const WINDOW_MS = 60 * 60 * 1000;
const LIMIT = 3;
const messageCounts = new Map<string, number[]>();

function getIp(request: NextRequest) {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown"
  );
}

function isAllowed(ip: string) {
  const now = Date.now();
  const recent = (messageCounts.get(ip) ?? []).filter((time) => now - time < WINDOW_MS);
  if (recent.length >= LIMIT) {
    messageCounts.set(ip, recent);
    return false;
  }
  recent.push(now);
  messageCounts.set(ip, recent);
  return true;
}

function normalizeMessage(message: string) {
  const suffix = " https://knowyoursubstance.com";
  if (message.length <= 300) return message;
  return `${message.slice(0, 300 - suffix.length - 1)}…${suffix}`;
}

export async function POST(request: NextRequest) {
  const ip = getIp(request);
  if (!isAllowed(ip)) {
    return NextResponse.json(
      { success: false, error: "Text limit reached. Try again in about an hour." },
      { status: 429 }
    );
  }

  const body = (await request.json()) as { phone?: string; message?: string };
  const phone = body.phone?.trim() ?? "";
  const message = body.message?.trim() ?? "";

  if (!/^\+?[1-9]\d{9,14}$/.test(phone)) {
    return NextResponse.json(
      { success: false, error: "Enter a valid phone number with country code." },
      { status: 400 }
    );
  }

  if (!message) {
    return NextResponse.json(
      { success: false, error: "There is no message to send." },
      { status: 400 }
    );
  }

  const result = await sendSms(phone, normalizeMessage(message));
  return NextResponse.json(result, { status: result.success ? 200 : 502 });
}
