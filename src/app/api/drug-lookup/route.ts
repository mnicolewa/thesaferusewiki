import { NextRequest, NextResponse } from "next/server";
import { getAdverseEvents, getDrugLabel, getRecalls } from "@/services/openfda";
import { citationMap } from "@/lib/citations";

type OpenFdaNdcResult = {
  proprietary_name?: string;
  generic_name?: string;
  labeler_name?: string;
  dosage_form?: string;
  route?: string[];
  active_ingredients?: Array<{ name?: string; strength?: string }>;
  package_ndc?: string[];
  product_ndc?: string;
};

async function searchByName(name: string, limit = 5) {
  // Try proprietary_name first, then generic_name
  const searches = [
    `proprietary_name:"${name}"`,
    `generic_name:"${name}"`,
    `generic_name:${name}*`,
  ];

  for (const search of searches) {
    const url = `https://api.fda.gov/drug/ndc.json?search=${encodeURIComponent(search)}&limit=${limit}`;
    const res = await fetch(url, { next: { revalidate: 3600 } });
    if (!res.ok) continue;
    const data = (await res.json()) as { results?: OpenFdaNdcResult[] };
    if (data.results?.length) return data.results;
  }

  return null;
}

/**
 * GET /api/drug-lookup?name=ibuprofen
 * Returns up to 5 matching drug entries from openFDA NDC database.
 */
export async function GET(req: NextRequest) {
  const name = req.nextUrl.searchParams.get("name")?.trim();

  if (!name || name.length < 2) {
    return NextResponse.json({ error: "Provide at least 2 characters for a drug name search." }, { status: 400 });
  }

  // Sanitise: only allow safe characters
  const safeName = name.replace(/[^a-zA-Z0-9\s\-']/g, "").slice(0, 80);

  const results = await searchByName(safeName);

  if (!results?.length) {
    return NextResponse.json(
      { error: `No medications found matching "${safeName}". Try a brand or generic name (e.g. "ibuprofen", "Advil").` },
      { status: 404 }
    );
  }

  // Enrich the first result with label, adverse events, and recalls
  const primary = results[0];
  const lookupName = primary.generic_name ?? primary.proprietary_name ?? "";

  const [adverseEvents, label, recalls] = await Promise.all([
    lookupName ? getAdverseEvents(lookupName).catch(() => []) : Promise.resolve([]),
    primary.product_ndc
      ? getDrugLabel(primary.product_ndc).catch(() => null)
      : Promise.resolve(null),
    lookupName ? getRecalls(lookupName).catch(() => []) : Promise.resolve([]),
  ]);

  return NextResponse.json({
    source: citationMap.openfda,
    resultType: "medication" as const,
    matches: results.map((r) => ({
      name: r.proprietary_name ?? r.generic_name ?? "Unknown",
      genericName: r.generic_name ?? null,
      labeler: r.labeler_name ?? null,
      dosageForm: r.dosage_form ?? null,
      route: r.route ?? [],
      activeIngredients: r.active_ingredients ?? [],
      productNdc: r.product_ndc ?? null,
    })),
    // Detailed data for the first (best) match
    item: {
      name: primary.proprietary_name ?? primary.generic_name ?? "Unknown medication",
      genericName: primary.generic_name ?? null,
      labeler: primary.labeler_name ?? null,
      dosageForm: primary.dosage_form ?? null,
      route: primary.route ?? [],
      activeIngredients: primary.active_ingredients ?? [],
      productNdc: primary.product_ndc ?? null,
    },
    adverseEvents,
    label,
    recalls,
  });
}
