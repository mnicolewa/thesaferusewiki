import { NextRequest, NextResponse } from "next/server";

type SpellingSuggestion = {
  suggestionGroup?: {
    suggestionList?: {
      suggestion?: string[];
    };
  };
};

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.trim();

  if (!q || q.length < 2) {
    return NextResponse.json({ suggestions: [] });
  }

  const url = `https://rxnav.nlm.nih.gov/REST/spellingsuggestions.json?name=${encodeURIComponent(q)}`;

  try {
    const res = await fetch(url, { next: { revalidate: 60 * 5 } });
    if (!res.ok) return NextResponse.json({ suggestions: [] });

    const data = (await res.json()) as SpellingSuggestion;
    const suggestions: string[] = data?.suggestionGroup?.suggestionList?.suggestion ?? [];

    return NextResponse.json({ suggestions: suggestions.slice(0, 8) });
  } catch {
    return NextResponse.json({ suggestions: [] });
  }
}
