import { fetchJsonWithTimeout, pingUrl, toPlainLanguageError } from "@/services/http";

const RXNAV_BASE = "https://rxnav.nlm.nih.gov/REST";

export type RxNavMatch = {
  severity: string;
  description: string;
};

type RxCuiResponse = {
  idGroup?: {
    rxnormId?: string[];
  };
};

type SuggestResponse = {
  suggestionGroup?: {
    suggestionList?: {
      suggestion?: string[];
    };
  };
};

type InteractionResponse = {
  fullInteractionTypeGroup?: Array<{
    fullInteractionType?: Array<{
      interactionPair?: Array<{
        description?: string;
        severity?: string;
      }>;
    }>;
  }>;
};

/**
 * Resolves a medication name to an RxNorm CUI.
 */
export async function getRxCui(name: string): Promise<string | null> {
  try {
    const data = await fetchJsonWithTimeout<RxCuiResponse>(
      `${RXNAV_BASE}/rxcui.json?name=${encodeURIComponent(name)}`
    );
    return data.idGroup?.rxnormId?.[0] ?? null;
  } catch (error) {
    throw new Error(toPlainLanguageError(error, "RxNav is unavailable right now."));
  }
}

/**
 * Returns medication autocomplete suggestions from RxNav.
 */
export async function getSuggestions(query: string): Promise<string[]> {
  try {
    const data = await fetchJsonWithTimeout<SuggestResponse>(
      `${RXNAV_BASE}/spellingsuggestions.json?name=${encodeURIComponent(query)}`
    );
    return data.suggestionGroup?.suggestionList?.suggestion?.slice(0, 8) ?? [];
  } catch {
    return [];
  }
}

/**
 * Returns RxNav interaction matches for a list of known RxNorm CUIs.
 */
export async function getInteractionsByCui(cuis: string[]): Promise<RxNavMatch[]> {
  try {
    const data = await fetchJsonWithTimeout<InteractionResponse>(
      `${RXNAV_BASE}/interaction/list.json?rxcuis=${encodeURIComponent(cuis.join("+"))}`
    );

    return (
      data.fullInteractionTypeGroup
        ?.flatMap((group) => group.fullInteractionType ?? [])
        .flatMap((item) => item.interactionPair ?? [])
        .map((pair) => ({
          severity: pair.severity ?? "unknown",
          description: pair.description ?? "No description available.",
        })) ?? []
    );
  } catch (error) {
    throw new Error(toPlainLanguageError(error, "Interaction data is unavailable right now."));
  }
}

/**
 * Performs a basic health check against RxNav.
 */
export async function ping() {
  return pingUrl(`${RXNAV_BASE}/rxcui.json?name=naloxone`);
}
