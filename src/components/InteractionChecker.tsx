"use client";

import { FormEvent, useState } from "react";

type Match = {
  severity: string;
  description: string;
};

type InteractionPayload = {
  queried: string[];
  matches: Match[];
  source: {
    name: string;
    citation: {
      title: string;
      url: string;
    };
  };
};

export function InteractionChecker() {
  const [medA, setMedA] = useState("");
  const [medB, setMedB] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<InteractionPayload | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch(
        `/api/interactions?medA=${encodeURIComponent(medA)}&medB=${encodeURIComponent(medB)}`
      );
      const data = await response.json();

      if (!response.ok) {
        setError(data.error ?? "Could not check interactions right now.");
        return;
      }

      setResult(data as InteractionPayload);
    } catch {
      setError("Network issue while checking interactions.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="panel" id="interactions" aria-labelledby="interactions-heading">
      <h2 id="interactions-heading">Drug Interaction Checker</h2>
      <p className="section-intro">
        Enter two drugs or medications to see known interactions, sourced from RxNav. This is a safety reference — not a substitute for clinical advice.
      </p>

      <form className="checker-form" onSubmit={handleSubmit}>
        <label>
          Medication A
          <input
            value={medA}
            onChange={(event) => setMedA(event.target.value)}
            placeholder="Example: methadone"
            required
          />
        </label>
        <label>
          Medication B
          <input
            value={medB}
            onChange={(event) => setMedB(event.target.value)}
            placeholder="Example: alprazolam"
            required
          />
        </label>
        <button type="submit" disabled={loading}>
          {loading ? "Checking..." : "Check Interactions"}
        </button>
      </form>

      {error ? <p className="feedback error">{error}</p> : null}

      {result ? (
        <div className="result-card">
          <p>
            Checked: <strong>{result.queried.join(" + ")}</strong>
          </p>
          {result.matches.length === 0 ? (
            <p className="feedback ok">No direct interaction entries were returned for this pair.</p>
          ) : (
            <ul className="stack-list">
              {result.matches.slice(0, 5).map((match, index) => (
                <li key={`${match.severity}-${index}`}>
                  <strong>{match.severity.toUpperCase()}</strong>: {match.description}
                </li>
              ))}
            </ul>
          )}
          <p className="tiny-note">
            Source: {" "}
            <a href={result.source.citation.url} target="_blank" rel="noreferrer">
              {result.source.citation.title}
            </a>
          </p>
        </div>
      ) : null}
    </section>
  );
}
