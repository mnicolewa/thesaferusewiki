"use client";

import { Download, MapPin, ShieldCheck, Smartphone } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

type ApiStateOption = {
  code: string;
  name: string;
  status: "verified" | "general";
};

type GoodSamaritanNote = {
  stateCode: string;
  stateName: string;
  summary: string;
  caution: string;
  likelyCoverage: string[];
  whenCalling: string;
  officialResourceUrl: string;
  lastReviewed: string;
  status: "verified" | "general";
};

type GoodSamaritanResponse = {
  selectedStateInput: string | null;
  selectedStateCode: string | null;
  note: GoodSamaritanNote;
  availableStates: ApiStateOption[];
};

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
  const [stateCode, setStateCode] = useState<string>("");
  const [detectedState, setDetectedState] = useState<string | null>(null);
  const [status, setStatus] = useState<"detecting" | "ready" | "unavailable">("detecting");
  const [loading, setLoading] = useState(false);
  const [note, setNote] = useState<GoodSamaritanNote | null>(null);
  const [stateOptions, setStateOptions] = useState<ApiStateOption[]>([]);

  async function loadLawData(state?: string | null) {
    setLoading(true);
    try {
      const query = state ? `?state=${encodeURIComponent(state)}` : "";
      const response = await fetch(`/api/good-samaritan${query}`);
      if (!response.ok) return;
      const data = (await response.json()) as GoodSamaritanResponse;
      setNote(data.note);
      setStateOptions(data.availableStates);

      if (!stateCode && data.selectedStateCode) {
        setStateCode(data.selectedStateCode);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadLawData();
  }, []);

  useEffect(() => {
    let isActive = true;

    (async () => {
      try {
        const geoState = await detectStateFromLocation();
        if (isActive && geoState) {
          setDetectedState(geoState);
          setStatus("ready");
          await loadLawData(geoState);
          return;
        }
      } catch {
        // Fall back to coarse IP-based state detection.
      }

      try {
        const ipState = await detectStateFromIp();
        if (isActive && ipState) {
          setDetectedState(ipState);
          setStatus("ready");
          await loadLawData(ipState);
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

  const selectedStateLabel = useMemo(() => {
    if (!stateCode) return "United States";
    return stateOptions.find((option) => option.code === stateCode)?.name ?? stateCode;
  }, [stateCode, stateOptions]);

  const noteStatusLabel = note?.status === "verified" ? "Verified summary" : "General summary";
  const selectedForDownload = stateCode || detectedState || "";
  const pdfHref = `/api/good-samaritan/pdf${selectedForDownload ? `?state=${encodeURIComponent(selectedForDownload)}` : ""}`;

  return (
    <article className="overdose-card good-samaritan-card" aria-labelledby="good-samaritan-title">
      <div className="overdose-header">
        <div className="overdose-title-row">
          <h4 id="good-samaritan-title" className="overdose-substance good-samaritan-title">
            Good Samaritan Laws
          </h4>
          <span className="severity-badge good-samaritan-badge">{noteStatusLabel}</span>
        </div>
      </div>

      <div className="overdose-section">
        <p className="overdose-section-label">Your location:</p>
        <p className="good-samaritan-location" role="status" aria-live="polite">
          <MapPin size={15} aria-hidden="true" />
          {status === "detecting" ? "Detecting your state..." : null}
          {status === "ready" && detectedState ? `Detected state: ${detectedState}` : null}
          {status === "unavailable" ? "State unavailable (showing general U.S. guidance)." : null}
        </p>
      </div>

      <div className="overdose-section">
        <label className="overdose-section-label" htmlFor="good-samaritan-state-select">
          Choose state for your cheat sheet:
        </label>
        <div className="good-samaritan-controls">
          <select
            id="good-samaritan-state-select"
            className="good-samaritan-select"
            value={stateCode}
            onChange={(event) => {
              const code = event.target.value;
              setStateCode(code);
              void loadLawData(code || null);
            }}
          >
            <option value="">United States (General)</option>
            {stateOptions.map((option) => (
              <option key={option.code} value={option.code}>
                {option.name} ({option.status})
              </option>
            ))}
          </select>

          <a className="good-samaritan-link" href={pdfHref} target="_blank" rel="noreferrer">
            <Download size={15} aria-hidden="true" />
            Download PDF Cheat Sheet
          </a>
        </div>

        <div className="good-samaritan-wallet-row" role="group" aria-label="Wallet options">
          <button className="good-samaritan-wallet" type="button" disabled>
            <Smartphone size={14} aria-hidden="true" />
            Apple Wallet (setup required)
          </button>
          <button className="good-samaritan-wallet" type="button" disabled>
            <Smartphone size={14} aria-hidden="true" />
            Google Wallet (setup required)
          </button>
        </div>

        <p className="tiny-note">State selected: {selectedStateLabel}. Download works now; Apple/Google wallet pass install requires signing credentials and issuer setup.</p>
      </div>

      <div className="overdose-section">
        <p className="overdose-section-label">What this usually means:</p>
        <p className="good-samaritan-copy">{note?.summary ?? "Loading..."}</p>
        <p className="good-samaritan-copy">{note?.caution ?? ""}</p>
        <p className="overdose-section-label">Common protections to know:</p>
        <ul className="good-samaritan-list">
          {(note?.likelyCoverage ?? []).map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
        <p className="overdose-section-label">If you call 911:</p>
        <p className="good-samaritan-copy">{note?.whenCalling ?? ""}</p>
      </div>

      <div className="medlineplus-panel good-samaritan-actions">
        <a
          className="good-samaritan-link"
          href={note?.officialResourceUrl ?? "https://lawatlas.org/"}
          target="_blank"
          rel="noreferrer"
        >
          <ShieldCheck size={15} aria-hidden="true" />
          Open legal reference
        </a>
        <p className="tiny-note good-samaritan-meta">
          Last reviewed: {note?.lastReviewed ?? "-"}
          {loading ? " · Updating..." : ""}
        </p>
      </div>
    </article>
  );
}
