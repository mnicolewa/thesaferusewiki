"use client";

import { MapPin, ShieldCheck } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

type LawSummary = {
  summary: string;
  caution: string;
  likelyCoverage: string[];
  whenCalling: string;
};

const LAW_NOTES: Record<string, LawSummary> = {
  California: {
    summary:
      "California has an overdose Good Samaritan law that can provide limited protection from certain possession charges when someone seeks emergency help in good faith.",
    caution:
      "Protections are not blanket immunity and may not cover warrants, trafficking, or other non-covered offenses.",
    likelyCoverage: [
      "Calling 911 for a suspected overdose is typically a covered action.",
      "Staying with the person and cooperating with responders can matter.",
      "Some low-level possession exposure may be reduced in covered situations.",
    ],
    whenCalling:
      'Say: "Possible overdose, not breathing normally" and share exact location details.',
  },
  NewYork: {
    summary:
      "New York has overdose Good Samaritan protections that can limit some possession-related charges when calling 911 for an overdose emergency.",
    caution:
      "Scope depends on the situation and charge type; legal outcomes can vary.",
    likelyCoverage: [
      "Emergency overdose calls are generally the trigger for protection.",
      "Coverage usually focuses on possession-related exposure.",
      "Unrelated offenses are commonly outside scope.",
    ],
    whenCalling: 'Say: "Unresponsive person, possible overdose" and provide cross streets or landmarks.',
  },
  Washington: {
    summary:
      "Washington provides Good Samaritan overdose protections for people who seek medical help during a suspected overdose.",
    caution:
      "Protections are limited and do not apply to every possible offense.",
    likelyCoverage: [
      "Calling for help during an overdose emergency is generally central to coverage.",
      "Protection often focuses on possession-level offenses.",
      "More serious or unrelated charges are usually not included.",
    ],
    whenCalling:
      'Say: "Possible overdose, breathing is slow/absent" and keep the line open if asked.',
  },
  Illinois: {
    summary:
      "Illinois includes overdose Good Samaritan protections intended to encourage emergency calls when overdose is suspected.",
    caution:
      "The exact protection depends on facts and offense type.",
    likelyCoverage: [
      "Good-faith emergency calls are often part of protection criteria.",
      "Coverage can be narrower for non-possession offenses.",
      "Case facts and local practice can change outcomes.",
    ],
    whenCalling: 'Say: "Medical emergency, suspected overdose" and report known substances if safe to share.',
  },
  Massachusetts: {
    summary:
      "Massachusetts has Good Samaritan overdose protections, including for people seeking emergency aid during an overdose event.",
    caution:
      "Protections are limited and should not be treated as full legal immunity.",
    likelyCoverage: [
      "Requesting emergency aid is generally the key protected behavior.",
      "Some possession-related exposure may be treated differently.",
      "Outstanding warrants and unrelated crimes are typically not covered.",
    ],
    whenCalling: 'Say: "Possible opioid overdose" if naloxone was given, and report response to dispatcher.',
  },
  Pennsylvania: {
    summary:
      "Pennsylvania has an overdose response law that can provide limited legal protection for people who call for medical help.",
    caution:
      "Coverage can vary by case and may not cover unrelated or more serious offenses.",
    likelyCoverage: [
      "Seeking emergency care is usually the condition that activates protections.",
      "Limited possession-related protection may apply in some cases.",
      "Protection is not universal and depends on specific facts.",
    ],
    whenCalling: 'Say: "Person may be overdosing" and request EMS immediately.',
  },
  Florida: {
    summary:
      "Florida includes overdose Good Samaritan protections for people who seek emergency care during a suspected overdose.",
    caution:
      "Protections are limited and case-specific.",
    likelyCoverage: [
      "Calling for help quickly is usually part of safer legal posture.",
      "Protections often target possession-level scenarios.",
      "Coverage for other charges is commonly limited.",
    ],
    whenCalling: 'Say: "Suspected overdose emergency" and keep updates brief and factual.',
  },
  Texas: {
    summary:
      "Texas has an overdose Good Samaritan framework with specific conditions that can reduce certain legal exposure when emergency help is requested.",
    caution:
      "Eligibility conditions are strict; protections are not universal.",
    likelyCoverage: [
      "Protection may depend on meeting strict statutory conditions.",
      "Calling for emergency aid is typically a required element.",
      "Prior history and offense type may affect eligibility.",
    ],
    whenCalling: 'Say: "Possible overdose, urgent medical help needed" and stay available for responder questions.',
  },
};

const DEFAULT_NOTE: LawSummary = {
  summary:
    "Many U.S. states have overdose Good Samaritan laws that provide limited protection from some possession-related charges when someone calls 911 in good faith.",
  caution:
    "Details vary by state and situation. These protections are often limited and are not legal advice.",
  likelyCoverage: [
    "Calling 911 in good faith is commonly part of Good Samaritan protection.",
    "Protections often focus on possession-related exposure, not all charges.",
    "State law and case facts determine what applies.",
  ],
  whenCalling: 'Say: "Possible overdose" and clearly share your location and symptoms.',
};

function normalizeState(raw: string) {
  return raw.replace(/\s+/g, "");
}

async function detectStateFromLocation(): Promise<string | null> {
  if (!("geolocation" in navigator)) return null;

  const position = await new Promise<GeolocationPosition>((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: false,
      timeout: 6000,
      maximumAge: 60_000,
    });
  });

  const lat = position.coords.latitude;
  const lon = position.coords.longitude;
  const res = await fetch(
    `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`
  );
  if (!res.ok) return null;

  const data = (await res.json()) as { principalSubdivision?: string; countryCode?: string };
  if (data.countryCode !== "US") return null;
  return data.principalSubdivision ?? null;
}

async function detectStateFromIp(): Promise<string | null> {
  const res = await fetch("https://ipapi.co/json/");
  if (!res.ok) return null;
  const data = (await res.json()) as { country_code?: string; region?: string };
  if (data.country_code !== "US") return null;
  return data.region ?? null;
}

export function GoodSamaritanCard() {
  const [stateName, setStateName] = useState<string | null>(null);
  const [status, setStatus] = useState<"detecting" | "ready" | "unavailable">("detecting");

  useEffect(() => {
    let isActive = true;

    (async () => {
      try {
        const geoState = await detectStateFromLocation();
        if (isActive && geoState) {
          setStateName(geoState);
          setStatus("ready");
          return;
        }
      } catch {
        // Fall back to coarse IP-based state detection.
      }

      try {
        const ipState = await detectStateFromIp();
        if (isActive && ipState) {
          setStateName(ipState);
          setStatus("ready");
          return;
        }
      } catch {
        // Fall through to unavailable state.
      }

      if (isActive) setStatus("unavailable");
    })();

    return () => {
      isActive = false;
    };
  }, []);

  const note = useMemo(() => {
    if (!stateName) return DEFAULT_NOTE;
    return LAW_NOTES[normalizeState(stateName)] ?? DEFAULT_NOTE;
  }, [stateName]);

  return (
    <article className="overdose-card good-samaritan-card" aria-labelledby="good-samaritan-title">
      <div className="overdose-header">
        <div className="overdose-title-row">
          <h4 id="good-samaritan-title" className="overdose-substance good-samaritan-title">
            Good Samaritan Laws
          </h4>
          <span className="severity-badge good-samaritan-badge">Legal Safety Info</span>
        </div>
      </div>

      <div className="overdose-section">
        <p className="overdose-section-label">Your location:</p>
        <p className="good-samaritan-location" role="status" aria-live="polite">
          <MapPin size={15} aria-hidden="true" />
          {status === "detecting" ? "Detecting your state..." : null}
          {status === "ready" && stateName ? `Detected state: ${stateName}` : null}
          {status === "unavailable" ? "State unavailable (showing general U.S. guidance)." : null}
        </p>
      </div>

      <div className="overdose-section">
        <p className="overdose-section-label">What this usually means:</p>
        <p className="good-samaritan-copy">{note.summary}</p>
        <p className="good-samaritan-copy">{note.caution}</p>
        <p className="overdose-section-label">Common protections to know:</p>
        <ul className="good-samaritan-list">
          {note.likelyCoverage.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
        <p className="overdose-section-label">If you call 911:</p>
        <p className="good-samaritan-copy">{note.whenCalling}</p>
        <p className="tiny-note">Open LawAtlas and search for "overdose Good Samaritan" to view current state policy details.</p>
      </div>

      <div className="medlineplus-panel good-samaritan-actions">
        <a
          className="good-samaritan-link"
          href="https://lawatlas.org/"
          target="_blank"
          rel="noreferrer"
        >
          <ShieldCheck size={15} aria-hidden="true" />
          Learn more
        </a>
      </div>
    </article>
  );
}
