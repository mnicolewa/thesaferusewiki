export type HarmReductionCard = {
  title: string;
  summary: string;
  steps: string[];
  citationIds: string[];
};

export const harmReductionCards: HarmReductionCard[] = [
  {
    title: "Safer Use Basics",
    summary:
      "Start low, go slow, and avoid using alone. Potency varies heavily in unregulated supply chains.",
    steps: [
      "Test a very small amount first and wait before re-dosing.",
      "Avoid mixing depressants (opioids, benzos, alcohol) because respiratory risk compounds quickly.",
      "Use with a trusted person whenever possible and establish a check-in plan.",
    ],
    citationIds: ["who-harm-reduction", "nida-fentanyl"],
  },
  {
    title: "Fentanyl Contamination Risk",
    summary:
      "Counterfeit pills and non-opioid powders can contain fentanyl. Treat unknown supply as high risk.",
    steps: [
      "Use fentanyl test strips where legal and available.",
      "Keep naloxone accessible before any use event.",
      "If someone becomes very sleepy or breathing slows, treat it as a possible opioid overdose immediately.",
    ],
    citationIds: ["nida-fentanyl", "cdc-overdose-signs"],
  },
  {
    title: "When to Seek Help",
    summary:
      "If breathing is slow, stopped, or irregular, call emergency services right away and give naloxone if available.",
    steps: [
      "Call emergency services and stay with the person.",
      "Give naloxone and repeat per kit instructions if no response.",
      "Place in recovery position if breathing returns but they remain unconscious.",
    ],
    citationIds: ["cdc-overdose-signs", "samhsa-naloxone"],
  },
];

export type OverdoseEntry = {
  substance: string;
  substanceColor: "opioid" | "stimulant" | "depressant";
  icd10Code: string;
  severityLabel: string;
  acronym?: { label: string; expansion: string };
  signs: string[];
  signIcons: string[];
  response: string[];
  responseIcons: string[];
  citationIds: string[];
};

export const overdoseFirstAid: OverdoseEntry[] = [
  {
    substance: "Opioids",
    substanceColor: "opioid",
    icd10Code: "T40.2",
    severityLabel: "Life-Threatening Emergency",
    acronym: { label: "3Rs", expansion: "Recognize · Respond · Reverse" },
    signs: [
      "Slow or stopped breathing",
      "Blue or gray lips / fingertips",
      "Pinpoint pupils",
      "Unresponsive to voice or touch",
    ],
    signIcons: ["Wind", "CircleDot", "Eye", "UserX"],
    response: [
      "Call 911 immediately.",
      "Give naloxone — nasal spray or injection per kit instructions.",
      "Rescue breathe: 1 breath every 5 seconds.",
      "Repeat naloxone in 2–3 min if no response.",
    ],
    responseIcons: ["Phone", "Syringe", "Wind", "RefreshCw"],
    citationIds: ["cdc-overdose-signs", "samhsa-naloxone"],
  },
  {
    substance: "Stimulants",
    substanceColor: "stimulant",
    icd10Code: "T43.601A",
    severityLabel: "Medical Emergency",
    signs: [
      "Chest pain or racing heart",
      "Seizure",
      "Very high body temperature",
      "Severe agitation or confusion",
    ],
    signIcons: ["Heart", "Zap", "Thermometer", "AlertCircle"],
    response: [
      "Call 911 immediately.",
      "Move to a cool, quiet area — reduce stimulation.",
      "Do not restrain; protect from injury during seizure.",
    ],
    responseIcons: ["Phone", "Snowflake", "ShieldAlert"],
    citationIds: ["who-harm-reduction"],
  },
  {
    substance: "Alcohol / Benzos",
    substanceColor: "depressant",
    icd10Code: "T51.0X1A",
    severityLabel: "Life-Threatening Emergency",
    signs: [
      "Very slow or stopped breathing",
      "Vomiting while unconscious",
      "Cannot be woken",
      "Clammy or cold skin",
    ],
    signIcons: ["Wind", "AlertTriangle", "BedDouble", "Thermometer"],
    response: [
      "Call 911 immediately.",
      "Place in recovery position — on their side, chin forward.",
      "Never leave the person alone.",
    ],
    responseIcons: ["Phone", "RotateCcw", "Eye"],
    citationIds: ["who-harm-reduction", "cdc-overdose-signs"],
  },
];
