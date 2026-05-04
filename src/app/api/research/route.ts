import { NextRequest, NextResponse } from "next/server";
import { citationMap } from "@/lib/citations";
import { getCitationsForSubstance, searchPubMed } from "@/services/pubmed";

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("query")?.trim();
  const mode = request.nextUrl.searchParams.get("mode")?.trim();

  if (!query) {
    return NextResponse.json({ error: "A research topic is required." }, { status: 400 });
  }

  try {
    const citations =
      mode === "substance"
        ? await getCitationsForSubstance(query)
        : await searchPubMed(query, 5);

    return NextResponse.json({
      citations,
      source: citationMap.pubmed,
    });
  } catch {
    return NextResponse.json(
      {
        error: "Research citations are unavailable right now.",
        citations: [],
        source: citationMap.pubmed,
      },
      { status: 502 }
    );
  }
}
