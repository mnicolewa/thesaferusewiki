import { NextRequest, NextResponse } from "next/server";
import { citationMap } from "@/lib/citations";
import { getDrugInfo, getDrugInteractions } from "@/services/drugbank";
import { getDrugInteractionProfile } from "@/services/openfda";
import { getCompoundSafety, searchCompound } from "@/services/pubchem";

const MAX_MEDS = 8;

type OpenFdaMatch = {
  severity: string;
  description: string;
};

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function classifySeverity(text: string): string {
  const input = text.toLowerCase();
  if (/(contraindicat|fatal|life[-\s]?threat|serious|avoid concomitant|do not use)/.test(input)) {
    return "major";
  }
  if (/(monitor|dose adjustment|adjust dose|increase|decrease|caution|closely observe)/.test(input)) {
    return "moderate";
  }
  return "minor";
}

function summarizeInteraction(text: string, counterpart: string) {
  const normalized = text.replace(/\s+/g, " ").trim();
  const rx = new RegExp(`[^.]*\\b${escapeRegex(counterpart)}\\b[^.]*\\.?`, "i");
  const sentence = normalized.match(rx)?.[0]?.trim();
  if (sentence) return sentence.slice(0, 280);
  return normalized.slice(0, 280);
}

function buildOpenFdaMatches(
  meds: string[],
  profiles: Array<{ queriedName: string; knownNames: string[]; interactionText: string[] } | null>
): OpenFdaMatch[] {
  const matches: OpenFdaMatch[] = [];
  const seen = new Set<string>();

  for (let i = 0; i < meds.length; i += 1) {
    const profile = profiles[i];
    if (!profile) continue;

    const textPool = profile.interactionText.join(" ");
    if (!textPool) continue;

    for (let j = 0; j < meds.length; j += 1) {
      if (i === j) continue;
      const counterpart = meds[j].trim();
      if (!counterpart) continue;

      const aliases = [counterpart.toLowerCase(), counterpart];
      const counterpartProfile = profiles[j];
      if (counterpartProfile) {
        aliases.push(...counterpartProfile.knownNames);
      }

      const aliasMatch = aliases.find((alias) =>
        new RegExp(`\\b${escapeRegex(alias)}\\b`, "i").test(textPool)
      );
      if (!aliasMatch) continue;

      const summary = summarizeInteraction(textPool, aliasMatch);
      const severity = classifySeverity(summary);
      const key = `${profile.queriedName.toLowerCase()}|${counterpart.toLowerCase()}|${summary.toLowerCase()}`;

      if (!seen.has(key)) {
        seen.add(key);
        matches.push({
          severity,
          description: `${profile.queriedName} + ${counterpart}: ${summary}`,
        });
      }
    }
  }

  return matches;
}

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

  const profiles = await Promise.all(meds.map((name) => getDrugInteractionProfile(name)));
  const matches = buildOpenFdaMatches(meds, profiles);
  const unrecognized = meds.filter((_, index) => !profiles[index]);

  if (matches.length > 0) {
    return NextResponse.json({
      queried: meds,
      matches,
      source: {
        name: "openFDA Drug Labels",
        citation: citationMap.openfda,
      },
      warning:
        unrecognized.length > 0
          ? `Some names were not found in FDA labels: ${unrecognized.join(", ")}.`
          : undefined,
    });
  }

  if (profiles.some(Boolean)) {
    return NextResponse.json({
      queried: meds,
      matches: [],
      source: {
        name: "openFDA Drug Labels",
        citation: citationMap.openfda,
      },
      warning:
        unrecognized.length > 0
          ? `No explicit interaction statements were found for this combination. Also not found in FDA labels: ${unrecognized.join(", ")}.`
          : "No explicit interaction statements were found for this combination in current FDA label sections.",
    });
  }

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
      "Medication interaction labels were not available for this input. Showing PubChem substance safety details where available.",
  });
}
