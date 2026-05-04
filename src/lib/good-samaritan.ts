export type LawStatus = "verified" | "general";

export type GoodSamaritanNote = {
  stateCode: string;
  stateName: string;
  summary: string;
  caution: string;
  likelyCoverage: string[];
  whenCalling: string;
  officialResourceUrl: string;
  lastReviewed: string;
  status: LawStatus;
};

export const US_STATES = [
  { code: "AL", name: "Alabama" },
  { code: "AK", name: "Alaska" },
  { code: "AZ", name: "Arizona" },
  { code: "AR", name: "Arkansas" },
  { code: "CA", name: "California" },
  { code: "CO", name: "Colorado" },
  { code: "CT", name: "Connecticut" },
  { code: "DE", name: "Delaware" },
  { code: "FL", name: "Florida" },
  { code: "GA", name: "Georgia" },
  { code: "HI", name: "Hawaii" },
  { code: "ID", name: "Idaho" },
  { code: "IL", name: "Illinois" },
  { code: "IN", name: "Indiana" },
  { code: "IA", name: "Iowa" },
  { code: "KS", name: "Kansas" },
  { code: "KY", name: "Kentucky" },
  { code: "LA", name: "Louisiana" },
  { code: "ME", name: "Maine" },
  { code: "MD", name: "Maryland" },
  { code: "MA", name: "Massachusetts" },
  { code: "MI", name: "Michigan" },
  { code: "MN", name: "Minnesota" },
  { code: "MS", name: "Mississippi" },
  { code: "MO", name: "Missouri" },
  { code: "MT", name: "Montana" },
  { code: "NE", name: "Nebraska" },
  { code: "NV", name: "Nevada" },
  { code: "NH", name: "New Hampshire" },
  { code: "NJ", name: "New Jersey" },
  { code: "NM", name: "New Mexico" },
  { code: "NY", name: "New York" },
  { code: "NC", name: "North Carolina" },
  { code: "ND", name: "North Dakota" },
  { code: "OH", name: "Ohio" },
  { code: "OK", name: "Oklahoma" },
  { code: "OR", name: "Oregon" },
  { code: "PA", name: "Pennsylvania" },
  { code: "RI", name: "Rhode Island" },
  { code: "SC", name: "South Carolina" },
  { code: "SD", name: "South Dakota" },
  { code: "TN", name: "Tennessee" },
  { code: "TX", name: "Texas" },
  { code: "UT", name: "Utah" },
  { code: "VT", name: "Vermont" },
  { code: "VA", name: "Virginia" },
  { code: "WA", name: "Washington" },
  { code: "WV", name: "West Virginia" },
  { code: "WI", name: "Wisconsin" },
  { code: "WY", name: "Wyoming" },
  { code: "DC", name: "District of Columbia" },
] as const;

const NAME_BY_CODE: Map<string, string> = new Map(
  US_STATES.map((item) => [item.code, item.name])
);

const normalize = (value: string) => value.toLowerCase().replace(/[^a-z]/g, "");

const CODE_BY_NAME: Map<string, string> = new Map(
  US_STATES.map((item) => [normalize(item.name), item.code])
);

const BASE_DEFAULT = {
  summary:
    "This state has overdose Good Samaritan protections in many real-world situations when someone seeks emergency medical help in good faith.",
  caution:
    "Coverage varies by circumstances and legal details. This is legal safety information, not legal advice.",
  likelyCoverage: [
    "Calling 911 in good faith for a suspected overdose.",
    "Remaining with the person and cooperating with emergency responders.",
    "Some possession-related exposure may be limited in covered scenarios.",
  ],
  whenCalling:
    'Say: "Possible overdose, medical emergency." Share exact location, breathing status, and whether naloxone was given.',
  officialResourceUrl: "https://lawatlas.org/",
  lastReviewed: "2026-05-04",
  status: "general" as const,
};

const VERIFIED_OVERRIDES: Record<string, Partial<GoodSamaritanNote>> = {
  CA: {
    summary:
      "California has overdose Good Samaritan protections that can reduce legal risk for certain possession-related situations when emergency help is requested.",
    caution:
      "Protections are not blanket immunity and typically do not cover trafficking, warrants, or unrelated offenses.",
    status: "verified",
  },
  NY: {
    summary:
      "New York provides Good Samaritan protections for overdose emergency calls, with common focus on possession-related legal exposure.",
    caution:
      "Exact scope depends on the facts, charge type, and local enforcement practices.",
    status: "verified",
  },
  WA: {
    summary:
      "Washington provides overdose Good Samaritan protections for people who seek medical assistance during a suspected overdose.",
    caution:
      "Coverage is limited and does not apply to every offense category.",
    status: "verified",
  },
  IL: {
    summary:
      "Illinois includes overdose Good Samaritan protections designed to encourage calling for emergency help.",
    caution:
      "Protection scope varies by facts and offense type.",
    status: "verified",
  },
  MA: {
    summary:
      "Massachusetts has overdose Good Samaritan protections for people seeking emergency aid in overdose events.",
    caution:
      "These protections are limited and should not be interpreted as full immunity.",
    status: "verified",
  },
  PA: {
    summary:
      "Pennsylvania includes legal protections for people who call for medical help during overdoses.",
    caution:
      "Coverage can vary by case details and may not include unrelated offenses.",
    status: "verified",
  },
  FL: {
    summary:
      "Florida has Good Samaritan overdose protections that can reduce legal risk when emergency care is requested.",
    caution:
      "Scope is case-specific and limited.",
    status: "verified",
  },
  TX: {
    summary:
      "Texas has a Good Samaritan framework with specific conditions that may reduce legal exposure when emergency overdose help is requested.",
    caution:
      "Eligibility conditions can be strict and protections are not universal.",
    status: "verified",
  },
};

const NOTES_BY_CODE: Record<string, GoodSamaritanNote> = Object.fromEntries(
  US_STATES.map((state) => {
    const override = VERIFIED_OVERRIDES[state.code] ?? {};
    const note: GoodSamaritanNote = {
      stateCode: state.code,
      stateName: state.name,
      ...BASE_DEFAULT,
      ...override,
    };
    return [state.code, note];
  })
);

export function resolveStateCode(rawState?: string | null): string | null {
  if (!rawState) return null;
  const trimmed = rawState.trim();
  if (!trimmed) return null;

  const byCode = trimmed.toUpperCase();
  if (NAME_BY_CODE.has(byCode)) return byCode;

  const byName = CODE_BY_NAME.get(normalize(trimmed));
  return byName ?? null;
}

export function getGoodSamaritanNote(rawState?: string | null): GoodSamaritanNote {
  const code = resolveStateCode(rawState) ?? "US";
  if (code === "US") {
    return {
      ...BASE_DEFAULT,
      stateCode: "US",
      stateName: "United States",
    };
  }
  return NOTES_BY_CODE[code] ?? {
    ...BASE_DEFAULT,
    stateCode: "US",
    stateName: "United States",
  };
}

export function getStateOptions() {
  return US_STATES.map((state) => ({
    code: state.code,
    name: state.name,
    status: NOTES_BY_CODE[state.code].status,
  }));
}
