"use client";

import React, { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { Plus, Search, X } from "lucide-react";

const MAX_DRUGS = 8;
const MIN_DRUGS = 2;

type Match = {
  severity: string;
  description: string;
};

type InteractionPayload = {
  queried: string[];
  matches: Match[];
  warning?: string;
  fallbackSubstances?: Array<{
    name: string;
    compound: {
      cid: number;
      iupacName: string | null;
      molecularFormula: string | null;
      pharmacologySummary: string | null;
    };
    safety: {
      hazardCodes: string[];
      ld50: string | null;
      knownInteractions: string[];
    };
  }>;
  source: {
    name: string;
    citation: { title: string; url: string };
  };
};

function DrugInput({
  value,
  index,
  onChange,
  onRemove,
  canRemove,
}: {
  value: string;
  index: number;
  onChange: (val: string) => void;
  onRemove: () => void;
  canRemove: boolean;
}) {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const fetchSuggestions = useCallback(async (q: string) => {
    if (q.length < 2) {
      setSuggestions([]);
      setOpen(false);
      return;
    }
    try {
      const res = await fetch(`/api/rxnav-suggest?q=${encodeURIComponent(q)}`);
      const data = (await res.json()) as { suggestions: string[] };
      const list = data.suggestions ?? [];
      setSuggestions(list);
      setOpen(list.length > 0);
    } catch {
      setSuggestions([]);
      setOpen(false);
    }
  }, []);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    onChange(val);
    setActiveIdx(-1);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchSuggestions(val), 250);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open || suggestions.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, -1));
    } else if (e.key === "Enter" && activeIdx >= 0) {
      e.preventDefault();
      select(suggestions[activeIdx]);
    } else if (e.key === "Escape") {
      setOpen(false);
      setActiveIdx(-1);
    }
  }

  function select(name: string) {
    onChange(name);
    setSuggestions([]);
    setOpen(false);
    setActiveIdx(-1);
  }

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const placeholder =
    index === 0 ? "e.g. methadone" : index === 1 ? "e.g. alprazolam" : "Add drug…";

  return (
    <div className="drug-input-wrap" ref={wrapperRef}>
      <div className="drug-input-row">
        <span className="drug-index-badge">{index + 1}</span>
        <input
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (suggestions.length > 0) setOpen(true);
          }}
          placeholder={placeholder}
          aria-label={`Drug ${index + 1}`}
          aria-autocomplete="list"
          aria-expanded={open}
          aria-haspopup="listbox"
          autoComplete="off"
          spellCheck={false}
        />
        {canRemove && (
          <button
            type="button"
            className="drug-remove-btn"
            onClick={onRemove}
            aria-label={`Remove drug ${index + 1}`}
          >
            <X size={14} />
          </button>
        )}
      </div>
      {open && suggestions.length > 0 && (
        <ul className="suggestions-dropdown" role="listbox" aria-label="Drug suggestions">
          {suggestions.map((s, i) => (
            <li
              key={s}
              role="option"
              aria-selected={i === activeIdx}
              className={i === activeIdx ? "suggestion-item active" : "suggestion-item"}
              onMouseDown={(e) => {
                e.preventDefault();
                select(s);
              }}
            >
              {s}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function InteractionChecker() {
  const [drugs, setDrugs] = useState<string[]>(["", ""]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<InteractionPayload | null>(null);

  function updateDrug(index: number, value: string) {
    setDrugs((prev) => prev.map((d, i) => (i === index ? value : d)));
  }

  function addDrug() {
    if (drugs.length < MAX_DRUGS) setDrugs((prev) => [...prev, ""]);
  }

  function removeDrug(index: number) {
    if (drugs.length <= MIN_DRUGS) return;
    setDrugs((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const filled = drugs.filter((d) => d.trim());
    if (filled.length < 2) {
      setError("Please enter at least two medications.");
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const params = new URLSearchParams();
      filled.forEach((d) => params.append("meds[]", d.trim()));
      const response = await fetch(`/api/interactions?${params.toString()}`);
      const data = await response.json();

      if (!response.ok) {
        setError((data as { error?: string }).error ?? "Could not check interactions right now.");
        return;
      }

      setResult(data as InteractionPayload);
    } catch {
      setError("Network issue while checking interactions.");
    } finally {
      setLoading(false);
    }
  }

  const filledCount = drugs.filter((d) => d.trim()).length;

  return (
    <section className="panel panel-tool" id="interactions" aria-labelledby="interactions-heading">
      <h2 id="interactions-heading">Drug Interaction Checker</h2>
      <p className="section-intro">
        Enter up to 8 drugs or medications to check known interaction statements from FDA labels.
        Start typing to see RxNorm name suggestions. This is a safety reference, not a substitute
        for clinical advice.
      </p>

      <form className="checker-form" onSubmit={handleSubmit}>
        <div className="drug-list">
          {drugs.map((drug, i) => (
            <DrugInput
              key={i}
              value={drug}
              index={i}
              onChange={(val) => updateDrug(i, val)}
              onRemove={() => removeDrug(i)}
              canRemove={drugs.length > MIN_DRUGS}
            />
          ))}
        </div>

        <div className="checker-actions">
          {drugs.length < MAX_DRUGS && (
            <button type="button" className="secondary add-drug-btn" onClick={addDrug}>
              <Plus size={14} />
              Add drug ({drugs.length}/{MAX_DRUGS})
            </button>
          )}
          <button type="submit" disabled={loading || filledCount < 2}>
            <Search size={14} />
            {loading ? "Checking…" : "Check Interactions"}
          </button>
        </div>
      </form>

      {error ? (
        <p className="feedback error" role="alert">
          {error}
        </p>
      ) : null}

      {result ? (
        <div className="result-card">
          <div className="interaction-result-header">
            <span>Checked:</span>
            <strong>{result.queried.join(" + ")}</strong>
          </div>
          {result.warning ? <p className="feedback ok">{result.warning}</p> : null}
          {result.matches.length === 0 ? (
            <>
              <p className="feedback ok">
                No direct interaction entries were returned for this combination.
              </p>
              {result.fallbackSubstances?.length ? (
                <div className="fallback-substances">
                  {result.fallbackSubstances.map((item) => (
                    <article key={item.name} className="mini-card">
                      <h3>{item.name}</h3>
                      <p className="tiny-note">IUPAC: {item.compound.iupacName ?? "Unavailable"}</p>
                      <p className="tiny-note">Formula: {item.compound.molecularFormula ?? "Unavailable"}</p>
                      {item.compound.pharmacologySummary ? <p>{item.compound.pharmacologySummary}</p> : null}
                      <p className="tiny-note">
                        Hazards: {item.safety.hazardCodes.join(", ") || "Unavailable"}
                      </p>
                      <p className="tiny-note">LD50: {item.safety.ld50 ?? "Unavailable"}</p>
                      <p className="tiny-note">
                        Data: <a href="https://pubchem.ncbi.nlm.nih.gov/" target="_blank" rel="noreferrer">PubChem / NIH</a>
                      </p>
                    </article>
                  ))}
                </div>
              ) : null}
              <div className="next-step-cta next-step-cta-ok">
                <strong>Still unsure?</strong>{" "}
                Call Poison Control at <a href="tel:18002221222">1-800-222-1222</a> — free, 24/7, confidential.
              </div>
            </>
          ) : (
            <>
              <div aria-live="polite">
                {result.matches.slice(0, 10).map((match, index) => {
                  const sev = match.severity.toLowerCase();
                  const actionMap: Record<string, string> = {
                    major: "Avoid this combination. Call Poison Control or consult a pharmacist immediately.",
                    severe: "Avoid this combination. Seek medical advice before taking these together.",
                    moderate: "Use caution. Talk to a pharmacist or prescriber before combining.",
                    minor: "Generally manageable — still worth discussing with a pharmacist.",
                  };
                  const action = actionMap[sev] ?? "Consult a pharmacist or prescriber.";
                  return (
                    <div key={`${match.severity}-${index}`} className="interaction-match">
                      <span className={`interaction-match-severity severity-${sev}`}>{match.severity.toUpperCase()}</span>
                      <span className="interaction-match-desc">{match.description}</span>
                      <span className="interaction-match-action">{action}</span>
                    </div>
                  );
                })}
              </div>
              {result.matches.some((m) => ["major", "severe"].includes(m.severity.toLowerCase())) && (
                <div className="next-step-cta" role="alert">
                  <strong>Major interaction detected.</strong>{" "}
                  Call Poison Control at <a href="tel:18002221222">1-800-222-1222</a> or contact a pharmacist before taking these together.
                </div>
              )}
            </>
          )}
          <p className="tiny-note">
            Source:{" "}
            <a href={result.source.citation.url} target="_blank" rel="noreferrer">
              {result.source.citation.title}
            </a>{" "}
            · This is a safety reference, not a substitute for clinical or emergency advice.
          </p>
        </div>
      ) : null}
    </section>
  );
}
