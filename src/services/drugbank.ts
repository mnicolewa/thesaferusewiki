import { fetchJsonWithTimeout, toPlainLanguageError } from "@/services/http";

const DRUGBANK_BASE = "https://api.drugbankplus.com/v1";

export type DrugBankInteraction = {
  drug: string;
  severity: "major" | "moderate" | "minor" | "unknown";
  mechanism: string;
  clinicalSignificance: string;
};

export type DrugBankInfo = {
  drugClass: string | null;
  halfLife: string | null;
  routes: string[];
};

type DrugBankSearchResponse = {
  data?: Array<{
    name?: string;
    drug_class?: string;
    half_life?: string;
    routes_of_administration?: string[];
    interactions?: Array<{
      drug_name?: string;
      severity?: string;
      mechanism?: string;
      description?: string;
    }>;
  }>;
};

function getHeaders() {
  const key = process.env.DRUGBANK_API_KEY;
  if (!key) return null;

  return {
    Authorization: `Bearer ${key}`,
  };
}

/**
 * Returns DrugBank interaction data for a single drug when an API key is configured.
 */
export async function getDrugInteractions(drugName: string): Promise<DrugBankInteraction[]> {
  const headers = getHeaders();
  if (!headers) return [];

  try {
    const url = `${DRUGBANK_BASE}/us/drugs/search?query=${encodeURIComponent(drugName)}`;
    const data = await fetchJsonWithTimeout<DrugBankSearchResponse>(url, { headers });
    return (data.data?.[0]?.interactions ?? []).map((item) => ({
      drug: item.drug_name ?? "Unknown drug",
      severity: ((item.severity ?? "unknown").toLowerCase() as DrugBankInteraction["severity"]),
      mechanism: item.mechanism ?? "Mechanism unavailable",
      clinicalSignificance: item.description ?? "Clinical significance unavailable",
    }));
  } catch (error) {
    throw new Error(toPlainLanguageError(error, "DrugBank interaction data is unavailable right now."));
  }
}

/**
 * Returns DrugBank class, half-life, and route information for a drug when an API key is configured.
 */
export async function getDrugInfo(name: string): Promise<DrugBankInfo | null> {
  const headers = getHeaders();
  if (!headers) return null;

  try {
    const url = `${DRUGBANK_BASE}/us/drugs/search?query=${encodeURIComponent(name)}`;
    const data = await fetchJsonWithTimeout<DrugBankSearchResponse>(url, { headers });
    const row = data.data?.[0];
    if (!row) return null;

    return {
      drugClass: row.drug_class ?? null,
      halfLife: row.half_life ?? null,
      routes: row.routes_of_administration ?? [],
    };
  } catch (error) {
    throw new Error(toPlainLanguageError(error, "DrugBank drug details are unavailable right now."));
  }
}

/**
 * Runs a best-effort health check against DrugBank when a key is configured.
 */
export async function ping() {
  const headers = getHeaders();
  if (!headers) return false;

  try {
    await fetchJsonWithTimeout<DrugBankSearchResponse>(
      `${DRUGBANK_BASE}/us/drugs/search?query=naloxone`,
      { headers }
    );
    return true;
  } catch {
    return false;
  }
}
