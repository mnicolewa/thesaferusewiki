import { NextRequest, NextResponse } from "next/server";
import { citationMap } from "@/lib/citations";
import { getDrugInfo, getDrugInteractions } from "@/services/drugbank";
import { getCompoundSafety, searchCompound } from "@/services/pubchem";
import { getInteractionsByCui, getRxCui } from "@/services/rxnav";

const MAX_MEDS = 8;

async function buildPubChemFallback(names: string[]) {
  const fallbackSubstances = await Promise.all(
    names.map(async (name) => {
      const compound = await searchCompound(name);
      if (!compound) return null;
      const safety = await getCompoundSafety(compound.cid);
      return {
        name,
        compound,
        safety,
      };
    })
  );

  return fallbackSubstances.filter(Boolean);
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

  if (process.env.DRUGBANK_API_KEY) {
    try {
      const [anchor, ...others] = meds;
      const interactions = await getDrugInteractions(anchor);
      const matched = interactions.filter((item) =>
        others.some((name) => item.drug.toLowerCase().includes(name.toLowerCase()))
      );
      const drugInfo = await Promise.all(meds.map((name) => getDrugInfo(name)));

      if (matched.length > 0) {
        return NextResponse.json({
          queried: meds,
          matches: matched.map((item) => ({
            severity: item.severity,
            description: `${item.drug}: ${item.clinicalSignificance} Mechanism: ${item.mechanism}`,
          })),
          supportingInfo: drugInfo,
          source: {
            name: "DrugBank API",
            citation: citationMap.drugbank,
          },
        });
      }
    } catch {
      // Fall back silently to RxNav when DrugBank is unavailable.
    }
  }

  let rxCuis: Array<string | null>;
  try {
    rxCuis = await Promise.all(meds.map((name) => getRxCui(name)));
  } catch {
    const fallbackSubstances = await buildPubChemFallback(meds);
    return NextResponse.json({
      queried: meds,
      matches: [],
      fallbackSubstances,
      source: {
        name: "PubChem fallback",
        citation: citationMap.pubchem,
      },
      warning:
        "Medication interaction feed is temporarily unavailable. Showing PubChem substance safety details where available.",
    });
  }

  const failed = meds.filter((_, i) => !rxCuis[i]);

  if (failed.length > 0) {
    try {
      const fallbackSubstances = await buildPubChemFallback(failed);

      return NextResponse.json(
        {
          queried: meds,
          matches: [],
          fallbackSubstances: fallbackSubstances.filter(Boolean),
          source: {
            name: "PubChem fallback",
            citation: citationMap.pubchem,
          },
          warning:
            "Some substances were not recognized in medication databases. Showing PubChem safety information where available.",
        },
        { status: 200 }
      );
    } catch {
      return NextResponse.json(
        {
          error: `Not recognized by our medication databases: ${failed.join(", ")}. Try full generic names and avoid abbreviations.`,
        },
        { status: 404 }
      );
    }
  }

  try {
    const matches = await getInteractionsByCui(rxCuis as string[]);

    return NextResponse.json({
      queried: meds,
      matches,
      source: {
        name: "RxNav Interaction API",
        citation: citationMap.rxnav,
      },
    });
  } catch {
    const fallbackSubstances = await buildPubChemFallback(meds);
    return NextResponse.json({
      queried: meds,
      matches: [],
      fallbackSubstances,
      source: {
        name: "PubChem fallback",
        citation: citationMap.pubchem,
      },
      warning:
        "Medication interaction feed is temporarily unavailable. Showing PubChem substance safety details where available.",
    });
  }
}
