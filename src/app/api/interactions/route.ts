import { NextRequest, NextResponse } from "next/server";
import { citationMap } from "@/lib/citations";

const MAX_MEDS = 8;

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
  if (!response.ok) return null;
  const data = (await response.json()) as RxCuiResponse;
  return data.idGroup?.rxnormId?.[0] ?? null;
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;

  // Support both multi-drug (?meds[]=x&meds[]=y) and legacy (?medA=x&medB=y)
  const medsParam = params.getAll("meds[]").map((m) => m.trim()).filter(Boolean);
  const medA = params.get("medA")?.trim();
  const medB = params.get("medB")?.trim();

  const meds =
    medsParam.length >= 2
      ? medsParam
      : medA && medB
      ? [medA, medB]
      : [];

  if (meds.length < 2) {
    return NextResponse.json({ error: "At least two medications are required." }, { status: 400 });
  }

  if (meds.length > MAX_MEDS) {
    return NextResponse.json({ error: `Maximum ${MAX_MEDS} medications allowed.` }, { status: 400 });
  }

  const rxCuis = await Promise.all(meds.map(getRxCui));
  const failed = meds.filter((_, i) => !rxCuis[i]);

  if (failed.length > 0) {
    return NextResponse.json(
      {
        error: `Not recognized by RxNav: ${failed.join(", ")}. Try full generic names and avoid abbreviations.`,
      },
      { status: 404 }
    );
  }

  const cuiList = (rxCuis as string[]).join("+");
  const interactionUrl = `https://rxnav.nlm.nih.gov/REST/interaction/list.json?rxcuis=${cuiList}`;
  const interactionResponse = await fetch(interactionUrl, { next: { revalidate: 60 * 30 } });

  if (!interactionResponse.ok) {
    return NextResponse.json(
      { error: "Unable to reach interaction source right now." },
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
    queried: meds,
    matches,
    source: {
      name: "RxNav Interaction API",
      citation: citationMap.rxnav,
    },
  });
}
