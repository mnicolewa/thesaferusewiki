"use client";

import { ChevronDown, Microscope } from "lucide-react";
import { useState } from "react";

type Citation = {
  title: string;
  authors: string[];
  journal: string | null;
  year: string | null;
  pmid: string;
  url: string;
};

type ResearchResponse = {
  citations: Citation[];
  source: {
    title: string;
    url: string;
    publisher: string;
  };
  error?: string;
};

export function ResearchCitationsPanel({ query }: { query: string }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [citations, setCitations] = useState<Citation[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function handleToggle() {
    const next = !open;
    setOpen(next);
    if (!next || loading || citations.length > 0 || error) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/research?query=${encodeURIComponent(query)}&mode=substance`);
      const data = (await response.json()) as ResearchResponse;
      if (!response.ok) {
        setError(data.error ?? "Research citations are unavailable right now.");
      } else {
        setCitations(data.citations);
      }
    } catch {
      setError("Research citations are unavailable right now.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="research-panel">
      <button type="button" className="research-toggle" onClick={handleToggle} aria-expanded={open}>
        <Microscope size={14} aria-hidden="true" />
        Research citations
        <ChevronDown
          size={14}
          aria-hidden="true"
          style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform 200ms" }}
        />
      </button>
      {open ? (
        <div className="research-body">
          {loading ? <p className="tiny-note">Loading citations from PubMed…</p> : null}
          {error ? <p className="feedback error">{error}</p> : null}
          {!loading && !error && citations.length === 0 ? (
            <p className="tiny-note">No matching research citations were found for this topic.</p>
          ) : null}
          {citations.length > 0 ? (
            <ul className="stack-list">
              {citations.map((citation) => (
                <li key={citation.pmid}>
                  <a href={citation.url} target="_blank" rel="noreferrer">
                    {citation.title}
                  </a>
                  <p className="tiny-note">
                    {citation.authors.slice(0, 3).join(", ")}
                    {citation.authors.length > 3 ? " et al." : ""}
                    {citation.journal ? ` · ${citation.journal}` : ""}
                    {citation.year ? ` · ${citation.year}` : ""}
                  </p>
                </li>
              ))}
            </ul>
          ) : null}
          <p className="tiny-note">
            Data: <a href="https://pubmed.ncbi.nlm.nih.gov/" target="_blank" rel="noreferrer">PubMed / NIH</a>
          </p>
        </div>
      ) : null}
    </div>
  );
}
