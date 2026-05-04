import { NextRequest, NextResponse } from "next/server";

type MedlineFeed = {
  feed?: {
    entry?: Array<{
      title?: { _value?: string };
      link?: Array<{ href?: string }>;
      summary?: { _value?: string };
    }>;
  };
};

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code")?.trim();

  if (!code) {
    return NextResponse.json({ error: "code is required" }, { status: 400 });
  }

  // ICD-10-CM code system OID
  const codeSystem = "2.16.840.1.113883.6.90";
  const url =
    `https://connect.medlineplus.gov/service` +
    `?mainSearchCriteria.v.cs=${encodeURIComponent(codeSystem)}` +
    `&mainSearchCriteria.v.c=${encodeURIComponent(code)}` +
    `&knowledgeResponseType=application/json` +
    `&informationRecipient.languageCode.c=en`;

  const response = await fetch(url, {
    next: { revalidate: 86400 }, // 24hr cache per NLM acceptable use policy
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    return NextResponse.json({ error: "MedlinePlus Connect unavailable" }, { status: 502 });
  }

  const data = (await response.json()) as MedlineFeed;
  const entry = data.feed?.entry?.[0];

  if (!entry) {
    return NextResponse.json({ error: "No MedlinePlus topic found for that code" }, { status: 404 });
  }

  const title = entry.title?._value ?? null;
  const link = entry.link?.[0]?.href ?? null;
  // summary contains HTML from NLM — we pass it through; no user data ever reaches this field
  const summary = entry.summary?._value ?? null;

  return NextResponse.json({ title, url: link, summary });
}
