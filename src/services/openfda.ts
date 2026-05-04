import { fetchJsonWithTimeout, pingUrl, toPlainLanguageError } from "@/services/http";

const OPENFDA_BASE = "https://api.fda.gov/drug";

export type AdverseEvent = {
  reaction: string;
  count: number;
};

export type DrugLabel = {
  warnings: string[];
  contraindications: string[];
  dosageForm: string | null;
};

export type DrugRecall = {
  reason: string;
  date: string;
  classification: string | null;
};

export type DrugInteractionProfile = {
  queriedName: string;
  knownNames: string[];
  interactionText: string[];
};

type EventCountResponse = {
  results?: Array<{
    term?: string;
    count?: number;
  }>;
};

type LabelResponse = {
  results?: Array<{
    warnings?: string[];
    boxed_warning?: string[];
    contraindications?: string[];
    drug_interactions?: string[];
    dosage_and_administration?: string[];
    dosage_forms_and_strengths?: string[];
    openfda?: Array<{
      generic_name?: string[];
      brand_name?: string[];
      substance_name?: string[];
      product_ndc?: string[];
    }>;
  }>;
};

type RecallResponse = {
  results?: Array<{
    reason_for_recall?: string;
    recall_initiation_date?: string;
    classification?: string;
  }>;
};

function withApiKey(url: URL) {
  const key = process.env.OPENFDA_API_KEY;
  if (key) {
    url.searchParams.set("api_key", key);
  }
  return url.toString();
}

/**
 * Returns the most common serious adverse reactions reported to openFDA for a drug name.
 */
export async function getAdverseEvents(drugName: string): Promise<AdverseEvent[]> {
  try {
    const url = new URL(`${OPENFDA_BASE}/event.json`);
    url.searchParams.set(
      "search",
      `patient.drug.medicinalproduct.exact:\"${drugName}\" AND serious:1`
    );
    url.searchParams.set("count", "patient.reaction.reactionmeddrapt.exact");
    url.searchParams.set("limit", "5");

    const data = await fetchJsonWithTimeout<EventCountResponse>(withApiKey(url));
    return (data.results ?? []).map((item) => ({
      reaction: item.term ?? "Unknown reaction",
      count: item.count ?? 0,
    }));
  } catch (error) {
    throw new Error(toPlainLanguageError(error, "Adverse event data is unavailable right now."));
  }
}

/**
 * Looks up drug label warnings, contraindications, and dosage details by NDC or name.
 */
export async function getDrugLabel(ndcOrName: string): Promise<DrugLabel | null> {
  try {
    const url = new URL(`${OPENFDA_BASE}/label.json`);
    const search = /^\d/.test(ndcOrName)
      ? `openfda.product_ndc:\"${ndcOrName}\"`
      : `openfda.generic_name:\"${ndcOrName}\" openfda.brand_name:\"${ndcOrName}\"`;
    url.searchParams.set("search", search);
    url.searchParams.set("limit", "1");

    const data = await fetchJsonWithTimeout<LabelResponse>(withApiKey(url));
    const label = data.results?.[0];
    if (!label) return null;

    return {
      warnings: [...(label.boxed_warning ?? []), ...(label.warnings ?? [])].slice(0, 3),
      contraindications: (label.contraindications ?? []).slice(0, 3),
      dosageForm:
        label.dosage_forms_and_strengths?.[0] ?? label.dosage_and_administration?.[0] ?? null,
    };
  } catch (error) {
    throw new Error(toPlainLanguageError(error, "Drug label details are unavailable right now."));
  }
}

/**
 * Returns normalized interaction narrative text and known aliases from openFDA labels.
 */
export async function getDrugInteractionProfile(name: string): Promise<DrugInteractionProfile | null> {
  const normalized = name.trim();
  if (!normalized) return null;

  try {
    const url = new URL(`${OPENFDA_BASE}/label.json`);
    url.searchParams.set(
      "search",
      `openfda.generic_name:\"${normalized}\" OR openfda.brand_name:\"${normalized}\" OR openfda.substance_name:\"${normalized}\"`
    );
    url.searchParams.set("limit", "5");

    const data = await fetchJsonWithTimeout<LabelResponse>(withApiKey(url));
    const labels = data.results ?? [];
    if (labels.length === 0) return null;

    const knownNames = new Set<string>([normalized.toLowerCase()]);
    const interactionText = new Set<string>();

    for (const label of labels) {
      const openfda = label.openfda?.[0];
      for (const value of openfda?.generic_name ?? []) knownNames.add(value.toLowerCase());
      for (const value of openfda?.brand_name ?? []) knownNames.add(value.toLowerCase());
      for (const value of openfda?.substance_name ?? []) knownNames.add(value.toLowerCase());

      for (const section of label.drug_interactions ?? []) {
        const compact = section.replace(/\s+/g, " ").trim();
        if (compact) interactionText.add(compact);
      }
    }

    return {
      queriedName: normalized,
      knownNames: Array.from(knownNames),
      interactionText: Array.from(interactionText),
    };
  } catch {
    return null;
  }
}

/**
 * Returns active recall information for a drug or product name.
 */
export async function getRecalls(drugName: string): Promise<DrugRecall[]> {
  try {
    const url = new URL(`${OPENFDA_BASE}/enforcement.json`);
    url.searchParams.set(
      "search",
      `product_description:\"${drugName}\" AND status:\"Ongoing\"`
    );
    url.searchParams.set("limit", "5");

    const data = await fetchJsonWithTimeout<RecallResponse>(withApiKey(url));
    return (data.results ?? []).map((item) => ({
      reason: item.reason_for_recall ?? "Reason unavailable",
      date: item.recall_initiation_date ?? "Date unavailable",
      classification: item.classification ?? null,
    }));
  } catch (error) {
    throw new Error(toPlainLanguageError(error, "Recall information is unavailable right now."));
  }
}

/**
 * Performs a basic health check against openFDA.
 */
export async function ping() {
  return pingUrl(withApiKey(new URL(`${OPENFDA_BASE}/ndc.json?limit=1`)));
}
