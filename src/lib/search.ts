import { harmReductionCards, overdoseFirstAid } from "@/lib/content";

export type SearchEntry = {
  id: string;
  href: string;
  title: string;
  section: string;
  description: string;
  keywords: string[];
  priority?: number;
};

export type SearchResult = SearchEntry & {
  score: number;
  reason: string;
};

const BASE_ENTRIES: SearchEntry[] = [
  {
    id: "interactions-overview",
    href: "#interactions",
    title: "Drug Interaction Checker",
    section: "Tools",
    description: "Check up to 8 drugs or medications for known interactions and severity guidance.",
    keywords: [
      "interaction",
      "mixing",
      "combine",
      "safe to take together",
      "medication conflict",
      "drugbank",
      "rxnav",
      "contraindication",
    ],
    priority: 10,
  },
  {
    id: "barcode-overview",
    href: "#barcode",
    title: "Medication Lookup",
    section: "Tools",
    description: "Look up a medication by name, barcode, UPC, or NDC. Review active ingredients, dosage form, warnings, contraindications, and FDA recall status.",
    keywords: [
      "barcode",
      "ndc",
      "upc",
      "pill bottle",
      "recall",
      "warning",
      "label",
      "adverse events",
      "medication lookup",
      "drug name",
      "search by name",
      "ibuprofen",
      "naloxone",
      "generic name",
    ],
    priority: 9,
  },
  {
    id: "support-overview",
    href: "#support",
    title: "Find Help & Harm Reduction Resources",
    section: "Support",
    description: "Verified crisis lines, SAMHSA helpline, text-your-ZIP treatment locator, naloxone access, and syringe service directories.",
    keywords: [
      "naloxone near me",
      "find help",
      "treatment locator",
      "rehab",
      "zip code",
      "syringe service",
      "needle exchange",
      "treatment center",
      "samhsa",
      "crisis line",
      "988",
      "help4u",
      "narcan pharmacy",
    ],
    priority: 9,
  },
  {
    id: "good-samaritan",
    href: "#harm-reduction",
    title: "Good Samaritan Laws",
    section: "Overdose Response",
    description: "Review overdose Good Samaritan protections, choose your state, and download a wallet-size PDF cheat sheet.",
    keywords: [
      "good samaritan",
      "911 law",
      "arrest after overdose",
      "legal protection",
      "state law",
      "immunity",
      "cheat sheet",
      "download pdf",
      "wallet card",
    ],
    priority: 8,
  },
  {
    id: "sources",
    href: "#sources",
    title: "Sources and References",
    section: "Sources",
    description: "Review the public health and medical sources behind this site.",
    keywords: ["source", "reference", "citation", "evidence", "research", "pubmed"],
    priority: 6,
  },
];

const INTENT_EXPANSIONS: Record<string, string[]> = {
  overdose: ["opioid", "stimulant", "alcohol", "benzo", "naloxone", "911", "first aid"],
  fentanyl: ["opioid", "overdose", "naloxone", "test strips"],
  mixing: ["interaction", "combine", "safe to take together"],
  rehab: ["treatment", "support", "center", "locator"],
  legal: ["good samaritan", "state law", "911 law"],
  recall: ["barcode", "medication lookup", "warning", "label"],
  citation: ["research", "source", "pubmed"],
};

function tokenize(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

function buildEntries(): SearchEntry[] {
  const guideEntries = harmReductionCards.map((card) => ({
    id: `guide-${card.title}`,
    href: "#harm-reduction",
    title: card.title,
    section: "Safety Guides",
    description: `${card.summary} ${card.steps.join(" ")}`,
    keywords: [...card.steps, ...card.citationIds],
    priority: 7,
  }));

  const overdoseEntries = overdoseFirstAid.map((entry) => ({
    id: `overdose-${entry.substance}`,
    href: "#harm-reduction",
    title: `${entry.substance} overdose signs and first aid`,
    section: "Overdose Response",
    description: `${entry.severityLabel}. Signs: ${entry.signs.join(", ")}. First aid: ${entry.response.join(" ")}`,
    keywords: [...entry.signs, ...entry.response, entry.substance, entry.severityLabel],
    priority: 8,
  }));

  return [...BASE_ENTRIES, ...guideEntries, ...overdoseEntries];
}

const SEARCH_ENTRIES = buildEntries();

function expandTokens(tokens: string[]) {
  const expanded = new Set(tokens);
  for (const token of tokens) {
    for (const addition of INTENT_EXPANSIONS[token] ?? []) {
      expanded.add(addition.toLowerCase());
    }
  }
  return [...expanded];
}

/**
 * Returns ranked on-site search results using local content only.
 */
export function searchSiteContent(query: string, limit = 6): SearchResult[] {
  const trimmed = query.trim();
  if (!trimmed) {
    return [];
  }

  const rawTokens = tokenize(trimmed);
  const tokens = expandTokens(rawTokens);
  const phrase = trimmed.toLowerCase();

  return SEARCH_ENTRIES.map((entry) => {
    const haystack = `${entry.title} ${entry.section} ${entry.description} ${entry.keywords.join(" ")}`.toLowerCase();
    let score = entry.priority ?? 0;

    if (haystack.includes(phrase)) {
      score += 18;
    }

    for (const token of tokens) {
      if (entry.title.toLowerCase().includes(token)) score += 6;
      if (entry.section.toLowerCase().includes(token)) score += 4;
      if (entry.description.toLowerCase().includes(token)) score += 3;
      if (entry.keywords.some((keyword) => keyword.toLowerCase().includes(token))) score += 5;
    }

    const reason =
      entry.section === "Overdose Response" && tokens.some((token) => ["overdose", "911", "naloxone"].includes(token))
        ? "Best match for overdose and emergency help"
        : entry.section === "Tools" && tokens.some((token) => ["interaction", "mixing", "barcode", "recall"].includes(token))
          ? "Best match for medication and interaction questions"
          : `Relevant in ${entry.section}`;

    return { ...entry, score, reason };
  })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

/**
 * Returns a short, local-only suggestion line for the query intent.
 */
export function getSearchGuidance(query: string) {
  const tokens = expandTokens(tokenize(query));

  if (tokens.some((token) => ["overdose", "911", "naloxone", "unresponsive"].includes(token))) {
    return "Urgent safety queries are prioritized toward overdose first aid and nearby naloxone resources.";
  }

  if (tokens.some((token) => ["mixing", "interaction", "combine"].includes(token))) {
    return "Queries about mixing substances are prioritized toward the interaction checker first.";
  }

  if (tokens.some((token) => ["recall", "barcode", "label"].includes(token))) {
    return "Medication lookup queries are prioritized toward barcode, label, and recall information.";
  }

  return "Smart search uses only content available on this website and does not search the open web.";
}