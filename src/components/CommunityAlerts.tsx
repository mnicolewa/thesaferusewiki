"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";

type Alert = {
  id: string;
  city: string;
  region: string;
  warning: string;
  substance: string;
  createdAt: string;
  upvotes: number;
  verification: "pending" | "verified" | "partner-verified";
  sourceNotes?: string;
};

type Position = {
  latitude: number;
  longitude: number;
};

export function CommunityAlerts() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [city, setCity] = useState("");
  const [region, setRegion] = useState("");
  const [substance, setSubstance] = useState("");
  const [warning, setWarning] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [position, setPosition] = useState<Position | null>(null);
  const [radiusKm, setRadiusKm] = useState(80);

  const verificationLabel = useMemo(
    () => ({
      pending: "Awaiting Verification",
      verified: "Community Verified",
      "partner-verified": "Public Health Partner Verified",
    }),
    []
  );

  const loadAlerts = useCallback(async (location?: Position) => {
    const query = location
      ? `?latitude=${location.latitude}&longitude=${location.longitude}&radiusKm=${radiusKm}`
      : "";
    const response = await fetch(`/api/alerts${query}`);
    const data = (await response.json()) as { alerts: Alert[] };
    return data.alerts;
  }, [radiusKm]);

  useEffect(() => {
    let isActive = true;

    void (async () => {
      const nextAlerts = await loadAlerts();
      if (isActive) {
        setAlerts(nextAlerts);
      }
    })();

    return () => {
      isActive = false;
    };
  }, [loadAlerts]);

  async function submitAlert(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage(null);

    const response = await fetch("/api/alerts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        city,
        region,
        substance,
        warning,
        latitude: position?.latitude,
        longitude: position?.longitude,
      }),
    });

    const data = (await response.json()) as { error?: string };

    if (!response.ok) {
      setMessage(data.error ?? "Could not submit alert.");
      setLoading(false);
      return;
    }

    setCity("");
    setRegion("");
    setSubstance("");
    setWarning("");
    setMessage("Alert posted. It is now in the moderation queue.");
    const nextAlerts = await loadAlerts(position ?? undefined);
    setAlerts(nextAlerts);
    setLoading(false);
  }

  async function upvote(id: string) {
    await fetch(`/api/alerts/${id}/upvote`, { method: "POST" });
    const nextAlerts = await loadAlerts(position ?? undefined);
    setAlerts(nextAlerts);
  }

  function enableNearby() {
    navigator.geolocation.getCurrentPosition(
      async (coords) => {
        const nextPosition = {
          latitude: coords.coords.latitude,
          longitude: coords.coords.longitude,
        };
        setPosition(nextPosition);
        const nextAlerts = await loadAlerts(nextPosition);
        setAlerts(nextAlerts);
      },
      () => {
        setMessage("Location permission denied. Showing all alerts instead.");
      }
    );
  }

  return (
    <section className="panel" id="alerts" aria-labelledby="alerts-heading">
      <h2 id="alerts-heading">Supply Warnings</h2>
      <p className="section-intro">
        Share and view local alerts about dangerous changes in the drug supply — like unexpected fentanyl presence, adulterated batches, or overdose clusters. Community reports are reviewed before being verified.
      </p>

      <div className="alert-controls">
        <button type="button" onClick={enableNearby}>
          Show Nearby Alerts
        </button>
        <label>
          Radius (km)
          <input
            type="number"
            min={10}
            max={300}
            value={radiusKm}
            onChange={(event) => setRadiusKm(Number(event.target.value))}
          />
        </label>
      </div>

      <form className="checker-form alert-form" onSubmit={submitAlert}>
        <label>
          City
          <input value={city} onChange={(event) => setCity(event.target.value)} required />
        </label>
        <label>
          Region/State
          <input value={region} onChange={(event) => setRegion(event.target.value)} required />
        </label>
        <label>
          Substance/Product
          <input value={substance} onChange={(event) => setSubstance(event.target.value)} required />
        </label>
        <label>
          Warning details
          <textarea
            value={warning}
            onChange={(event) => setWarning(event.target.value)}
            rows={3}
            required
          />
        </label>
        <button type="submit" disabled={loading}>
          {loading ? "Posting..." : "Post Alert"}
        </button>
      </form>

      {message ? (
        <p className="feedback ok" role="status" aria-live="polite">
          {message}
        </p>
      ) : null}

      <ul className="stack-list alerts-list">
        {alerts.map((alert) => (
          <li key={alert.id} className="alert-row">
            <div>
              <p>
                <strong>
                  {alert.city}, {alert.region}
                </strong>{" "}
                - {alert.substance}
              </p>
              <p>{alert.warning}</p>
              <p className="tiny-note">
                {verificationLabel[alert.verification]} | {new Date(alert.createdAt).toLocaleString()}
              </p>
              {alert.sourceNotes ? <p className="tiny-note">Notes: {alert.sourceNotes}</p> : null}
            </div>
            <button type="button" className="secondary" onClick={() => upvote(alert.id)}>
              Upvote ({alert.upvotes})
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
