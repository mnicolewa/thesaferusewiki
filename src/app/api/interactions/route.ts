import { NextRequest, NextResponse } from "next/server";
import { citationMap } from "@/lib/citations";

type RxCuiResponse = {
  idGroup?: {
    rxnormId?: string[];
  };
};

type InteractionResponse = {
  fullInteractionTypeGroup?: Array<{
    sourceDisclaimer?: string;
    sourceName?: string;
    fullInteractionType?: Array<{
      minConcept?: Array<{ name?: string }>;
      interactionPair?: Array<{
        description?: string;
        severity?: string;
      }>;
    }>;
  }>;
};

async function getRxCui(name: string): Promise<string | null> {
  const url = `https://rxnav.nlm.nih.gov/REST/rxcui.json?name=${encodeURIComponent(name)}`;
  const response = await fetch(url, { next: { revalidate: 60 * 60 } });
  if (!response.ok) {
    return null;
  }
  const data = (await response.json()) as RxCuiResponse;
  return data.idGroup?.rxnormId?.[0] ?? null;
}

export async function GET(request: NextRequest) {
  const medA = request.nextUrl.searchParams.get("medA")?.trim();
  const medB = request.nextUrl.searchParams.get("medB")?.trim();

  if (!medA || !medB) {
    return NextResponse.json({ error: "medA and medB are required" }, { status: 400 });
  }

  const [rxCuiA, rxCuiB] = await Promise.all([getRxCui(medA), getRxCui(medB)]);

  if (!rxCuiA || !rxCuiB) {
    return NextResponse.json(
      {
        error:
          "One or both medication names were not recognized by RxNav. Try generic names and avoid abbreviations.",
      },
      { status: 404 }
    );
  }

  const interactionUrl = `https://rxnav.nlm.nih.gov/REST/interaction/list.json?rxcuis=${rxCuiA}+${rxCuiB}`;
  const interactionResponse = await fetch(interactionUrl, { next: { revalidate: 60 * 30 } });

  if (!interactionResponse.ok) {
    return NextResponse.json(
      { error: "Unable to reach interaction source right now" },
      { status: 502 }
    );
  }

  const payload = (await interactionResponse.json()) as InteractionResponse;

  const matches =
    payload.fullInteractionTypeGroup
      ?.flatMap((group) => group.fullInteractionType ?? [])
      .flatMap((item) => item.interactionPair ?? [])
      .map((pair) => ({
        severity: pair.severity ?? "unknown",
        description: pair.description ?? "No description available.",
      })) ?? [];

  return NextResponse.json({
    queried: [medA, medB],
    matches,
    source: {
      name: "RxNav Interaction API",
      citation: citationMap.rxnav,
    },
  });
}
