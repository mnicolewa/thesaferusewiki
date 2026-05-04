"use client";

import { LocateFixed, MapPin, Syringe, Warehouse, Cross } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { ServiceMap, type ServiceMarker } from "./ServiceMap";

type ServiceType = "treatment" | "naloxone" | "syringe";

type TreatmentResult = {
  name: string;
  address: string;
  phone: string | null;
  services: string[];
  distance: number | null;
  lat: number | null;
  lng: number | null;
  type: ServiceType;
};

type TreatmentResponse = {
  results: TreatmentResult[];
  source: { title: string; url: string };
  error?: string;
};

const SERVICE_META = {
  treatment: { label: "Treatment centers", icon: Cross },
  naloxone: { label: "Naloxone locations", icon: LocateFixed },
  syringe: { label: "Syringe services", icon: Syringe },
} satisfies Record<ServiceType, { label: string; icon: typeof Cross }>;

async function detectZipFromLocation() {
  if (!("geolocation" in navigator)) return null;

  const position = await new Promise<GeolocationPosition>((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: false,
      timeout: 6000,
      maximumAge: 60_000,
    });
  });

  const response = await fetch(
    `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${position.coords.latitude}&longitude=${position.coords.longitude}&localityLanguage=en`
  );
  if (!response.ok) return null;
  const data = (await response.json()) as { postcode?: string };
  return data.postcode?.slice(0, 5) ?? null;
}

export function TreatmentLocator({ mapboxToken }: { mapboxToken: string | null }) {
  const [zip, setZip] = useState("");
  const [radius, setRadius] = useState(25);
  const [serviceType, setServiceType] = useState<ServiceType>("naloxone");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<TreatmentResult[]>([]);

  useEffect(() => {
    void (async () => {
      try {
        const detected = await detectZipFromLocation();
        if (detected) {
          setZip(detected);
        }
      } catch {
        // Leave ZIP blank if permission is denied or unavailable.
      }
    })();
  }, []);

  const markers = useMemo<ServiceMarker[]>(() => {
    return results
      .filter((item) => item.lat !== null && item.lng !== null)
      .map((item) => ({
        lat: item.lat as number,
        lng: item.lng as number,
        name: item.name,
        type: item.type,
        address: item.address,
        phone: item.phone,
      }));
  }, [results]);

  async function handleSearch() {
    setLoading(true);
    setError(null);
    setResults([]);

    try {
      const response = await fetch("/api/treatment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ zip, radius, serviceType }),
      });
      const data = (await response.json()) as TreatmentResponse;
      if (!response.ok) {
        setError(data.error ?? "Nearby service information is unavailable right now.");
      } else {
        setResults(data.results);
      }
    } catch {
      setError("Nearby service information is unavailable right now.");
    } finally {
      setLoading(false);
    }
  }

  const Icon = SERVICE_META[serviceType].icon;

  return (
    <section className="panel panel-tool" id="support" aria-labelledby="support-heading">
      <h2 id="support-heading">Find Naloxone, Treatment, and Syringe Services</h2>
      <p className="section-intro">
        Find nearby harm reduction and treatment resources by ZIP code. ZIP lookups stay in this session only and are not stored. This is a safety reference, not a substitute for clinical or emergency advice.
      </p>

      <div className="locator-controls">
        <label>
          ZIP code
          <input value={zip} onChange={(event) => setZip(event.target.value.replace(/\D/g, "").slice(0, 5))} placeholder="e.g. 10001" inputMode="numeric" />
        </label>
        <label>
          Radius (miles)
          <input value={radius} onChange={(event) => setRadius(Number(event.target.value) || 25)} type="number" min={1} max={100} />
        </label>
        <label>
          Service type
          <select value={serviceType} onChange={(event) => setServiceType(event.target.value as ServiceType)}>
            {Object.entries(SERVICE_META).map(([value, meta]) => (
              <option key={value} value={value}>
                {meta.label}
              </option>
            ))}
          </select>
        </label>
        <button type="button" onClick={handleSearch} disabled={loading || zip.length !== 5}>
          <Icon size={14} aria-hidden="true" />
          {loading ? "Searching..." : "Find nearby help"}
        </button>
      </div>

      {error ? <p className="feedback error">{error}</p> : null}

      {results.length > 0 ? (
        <>
          <ServiceMap markers={markers} token={mapboxToken} />
          <div className="locator-results">
            {results.map((item) => (
              <article key={`${item.name}-${item.address}`} className="mini-card locator-card">
                <h3>{item.name}</h3>
                <p className="locator-line"><MapPin size={14} aria-hidden="true" /> {item.address}</p>
                {item.phone ? <p className="locator-line"><Warehouse size={14} aria-hidden="true" /> {item.phone}</p> : null}
                <p className="tiny-note">Services: {item.services.join(", ") || "Service details unavailable"}</p>
                <p className="tiny-note">
                  Distance: {item.distance ? `${item.distance.toFixed(1)} miles` : "Unavailable"}
                </p>
                <a
                  className="good-samaritan-link"
                  href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(item.address)}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Get directions
                </a>
              </article>
            ))}
          </div>
          <p className="tiny-note">
            Data: <a href="https://findtreatment.gov/" target="_blank" rel="noreferrer">SAMHSA Treatment Locator</a>
          </p>
        </>
      ) : null}
    </section>
  );
}
