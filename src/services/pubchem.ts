import { fetchJsonWithTimeout, normalizeCacheKey, pingUrl, toPlainLanguageError } from "@/services/http";

const PUBCHEM_BASE = "https://pubchem.ncbi.nlm.nih.gov/rest/pug";
const PUBCHEM_VIEW_BASE = "https://pubchem.ncbi.nlm.nih.gov/rest/pug_view/data/compound";

type PubChemCidResponse = {
  IdentifierList?: {
    CID?: number[];
  };
};

type PubChemPropertyResponse = {
  PropertyTable?: {
    Properties?: Array<{
      CID?: number;
      MolecularFormula?: string;
      IUPACName?: string;
    }>;
  };
};

type PubChemDescriptionResponse = {
  InformationList?: {
    Information?: Array<{
      Description?: string;
      Title?: string;
    }>;
  };
};

type PubChemViewNode = {
  TOCHeading?: string;
  StringValue?: string;
  StringValueList?: string[];
  Information?: Array<{
    Value?: {
      StringWithMarkup?: Array<{ String?: string }>;
      String?: string;
      Number?: number[];
    };
    Name?: string;
  }>;
  Section?: PubChemViewNode[];
};

type PubChemViewResponse = {
  Record?: {
    Section?: PubChemViewNode[];
  };
};

export type PubChemCompound = {
  cid: number;
  iupacName: string | null;
  molecularFormula: string | null;
  pharmacologySummary: string | null;
};

export type PubChemSafety = {
  hazardCodes: string[];
  ld50: string | null;
  knownInteractions: string[];
};

function getSessionStorage() {
  if (typeof window === "undefined") return null;
  return window.sessionStorage;
}

function readCached<T>(key: string): T | null {
  const storage = getSessionStorage();
  if (!storage) return null;

  const raw = storage.getItem(key);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as T;
  } catch {
    storage.removeItem(key);
    return null;
  }
}

function writeCached<T>(key: string, value: T) {
  const storage = getSessionStorage();
  if (!storage) return;
  storage.setItem(key, JSON.stringify(value));
}

function extractSectionText(nodes: PubChemViewNode[] | undefined, heading: string): string[] {
  if (!nodes) return [];

  const out: string[] = [];

  for (const node of nodes) {
    if (node.TOCHeading?.toLowerCase().includes(heading.toLowerCase())) {
      for (const info of node.Information ?? []) {
        const parts = info.Value?.StringWithMarkup?.map((part) => part.String).filter(Boolean) ?? [];
        if (parts.length > 0) {
          out.push(parts.join(" "));
        } else if (info.Value?.String) {
          out.push(info.Value.String);
        } else if (info.Name) {
          out.push(info.Name);
        }
      }
    }

    out.push(...extractSectionText(node.Section, heading));
  }

  return out;
}

/**
 * Looks up a compound in PubChem and returns core identity and summary data.
 */
export async function searchCompound(name: string): Promise<PubChemCompound | null> {
  const normalized = normalizeCacheKey(name);
  const cacheKey = `pubchem:compound:${normalized}`;
  const cached = readCached<PubChemCompound>(cacheKey);
  if (cached) return cached;

  try {
    const cidData = await fetchJsonWithTimeout<PubChemCidResponse>(
      `${PUBCHEM_BASE}/compound/name/${encodeURIComponent(name)}/cids/JSON`
    );
    const cid = cidData.IdentifierList?.CID?.[0];
    if (!cid) return null;

    const [properties, descriptions] = await Promise.all([
      fetchJsonWithTimeout<PubChemPropertyResponse>(
        `${PUBCHEM_BASE}/compound/cid/${cid}/property/MolecularFormula,IUPACName/JSON`
      ),
      fetchJsonWithTimeout<PubChemDescriptionResponse>(
        `${PUBCHEM_BASE}/compound/cid/${cid}/description/JSON`
      ),
    ]);

    const row = properties.PropertyTable?.Properties?.[0];
    const result: PubChemCompound = {
      cid,
      iupacName: row?.IUPACName ?? null,
      molecularFormula: row?.MolecularFormula ?? null,
      pharmacologySummary: descriptions.InformationList?.Information?.[0]?.Description ?? null,
    };

    writeCached(cacheKey, result);
    return result;
  } catch (error) {
    throw new Error(toPlainLanguageError(error, "PubChem could not find that substance right now."));
  }
}

/**
 * Fetches hazard and toxicity details for a known PubChem compound CID.
 */
export async function getCompoundSafety(cid: number): Promise<PubChemSafety> {
  try {
    const payload = await fetchJsonWithTimeout<PubChemViewResponse>(
      `${PUBCHEM_VIEW_BASE}/${cid}/JSON`
    );

    const hazardCodes = extractSectionText(payload.Record?.Section, "Hazards Identification")
      .join(" ")
      .match(/H\d{3}/g) ?? [];

    const ld50 = extractSectionText(payload.Record?.Section, "Toxicity")[0] ?? null;
    const knownInteractions = extractSectionText(payload.Record?.Section, "Drug and Medication Information").slice(0, 3);

    return {
      hazardCodes,
      ld50,
      knownInteractions,
    };
  } catch (error) {
    throw new Error(toPlainLanguageError(error, "PubChem safety details are not available right now."));
  }
}

/**
 * Performs a basic health check against PubChem.
 */
export async function ping() {
  return pingUrl(`${PUBCHEM_BASE}/compound/name/caffeine/cids/JSON`);
}
