import { fetchJsonWithTimeout, pingUrl, toPlainLanguageError } from "@/services/http";

const EUTILS_BASE = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils";

type ESearchResponse = {
  esearchresult?: {
    idlist?: string[];
  };
};

type ESummaryItem = {
  uid?: string;
  title?: string;
  fulljournalname?: string;
  pubdate?: string;
  authors?: Array<{ name?: string }>;
};

type ESummaryResponse = {
  result?: Record<string, ESummaryItem | string[] | undefined> & { uids?: string[] };
};

export type PubMedCitation = {
  title: string;
  authors: string[];
  journal: string | null;
  year: string | null;
  pmid: string;
  url: string;
};

/**
 * Searches PubMed and returns citation metadata for the requested query.
 */
export async function searchPubMed(query: string, maxResults = 5): Promise<PubMedCitation[]> {
  try {
    const searchUrl = new URL(`${EUTILS_BASE}/esearch.fcgi`);
    searchUrl.searchParams.set("db", "pubmed");
    searchUrl.searchParams.set("term", query);
    searchUrl.searchParams.set("retmax", String(maxResults));
    searchUrl.searchParams.set("retmode", "json");

    const search = await fetchJsonWithTimeout<ESearchResponse>(searchUrl.toString());
    const ids = search.esearchresult?.idlist ?? [];
    if (ids.length === 0) return [];

    const summaryUrl = new URL(`${EUTILS_BASE}/esummary.fcgi`);
    summaryUrl.searchParams.set("db", "pubmed");
    summaryUrl.searchParams.set("id", ids.join(","));
    summaryUrl.searchParams.set("retmode", "json");

    const summary = await fetchJsonWithTimeout<ESummaryResponse>(summaryUrl.toString());
    return ids.map((id) => {
      const item = summary.result?.[id] as ESummaryItem | undefined;
      return {
        title: item?.title ?? "Untitled citation",
        authors: (item?.authors ?? []).map((author) => author.name ?? "Unknown author"),
        journal: item?.fulljournalname ?? null,
        year: item?.pubdate?.slice(0, 4) ?? null,
        pmid: id,
        url: `https://pubmed.ncbi.nlm.nih.gov/${id}/`,
      };
    });
  } catch (error) {
    throw new Error(toPlainLanguageError(error, "Research citations are unavailable right now."));
  }
}

/**
 * Searches PubMed using harm-reduction-focused query terms for a substance or topic.
 */
export async function getCitationsForSubstance(name: string) {
  return searchPubMed(`${name} AND harm reduction`, 5);
}

/**
 * Performs a basic health check against NCBI E-utilities.
 */
export async function ping() {
  return pingUrl(`${EUTILS_BASE}/esearch.fcgi?db=pubmed&term=naloxone&retmax=1&retmode=json`);
}
