"use client";

import {
  Activity,
  AlertCircle,
  AlertTriangle,
  BedDouble,
  BookOpen,
  ChevronDown,
  CircleDot,
  Eye,
  Heart,
  Phone,
  RefreshCw,
  RotateCcw,
  ShieldAlert,
  Snowflake,
  Syringe,
  Thermometer,
  UserX,
  Wind,
  Zap,
  type LucideProps,
} from "lucide-react";
import React, { useState } from "react";
import type { OverdoseEntry } from "@/lib/content";

type FC = (props: LucideProps) => React.ReactElement;

const ICON_MAP: Record<string, FC> = {
  Activity: Activity as FC,
  AlertCircle: AlertCircle as FC,
  AlertTriangle: AlertTriangle as FC,
  BedDouble: BedDouble as FC,
  BookOpen: BookOpen as FC,
  CircleDot: CircleDot as FC,
  Eye: Eye as FC,
  Heart: Heart as FC,
  Phone: Phone as FC,
  RefreshCw: RefreshCw as FC,
  RotateCcw: RotateCcw as FC,
  ShieldAlert: ShieldAlert as FC,
  Snowflake: Snowflake as FC,
  Syringe: Syringe as FC,
  Thermometer: Thermometer as FC,
  UserX: UserX as FC,
  Wind: Wind as FC,
  Zap: Zap as FC,
};

const COLOR_MAP = {
  opioid: {
    border: "#ef4444",
    bg: "rgba(127, 29, 29, 0.18)",
    badge: "#dc2626",
    text: "#fecaca",
    pillBg: "rgba(127, 29, 29, 0.24)",
    stepBg: "rgba(127, 29, 29, 0.16)",
  },
  stimulant: {
    border: "#f59e0b",
    bg: "rgba(120, 53, 15, 0.18)",
    badge: "#d97706",
    text: "#fef3c7",
    pillBg: "rgba(120, 53, 15, 0.24)",
    stepBg: "rgba(120, 53, 15, 0.16)",
  },
  depressant: {
    border: "#60a5fa",
    bg: "rgba(30, 64, 175, 0.18)",
    badge: "#2563eb",
    text: "#dbeafe",
    pillBg: "rgba(30, 64, 175, 0.24)",
    stepBg: "rgba(30, 64, 175, 0.16)",
  },
};

type MedlinePlusResult = {
  title: string | null;
  url: string | null;
  summary: string | null;
};

function ResolvedIcon({ name, ...props }: { name: string } & LucideProps) {
  const Icon = ICON_MAP[name];
  if (!Icon) return null;
  return <Icon {...props} />;
}

export function OverdoseCard(props: OverdoseEntry) {
  const {
    substance,
    substanceColor,
    icd10Code,
    severityLabel,
    acronym,
    signs,
    signIcons,
    response,
    responseIcons,
  } = props;

  const colors = COLOR_MAP[substanceColor];
  const [open, setOpen] = useState(false);
  const [nlmData, setNlmData] = useState<MedlinePlusResult | null>(null);
  const [nlmLoading, setNlmLoading] = useState(false);
  const [nlmError, setNlmError] = useState<string | null>(null);

  async function handleExpand() {
    const next = !open;
    setOpen(next);
    if (next && !nlmData && !nlmError) {
      setNlmLoading(true);
      try {
        const res = await fetch(`/api/medlineplus?code=${encodeURIComponent(icd10Code)}`);
        const json = (await res.json()) as MedlinePlusResult & { error?: string };
        if (!res.ok) {
          setNlmError(json.error ?? "Could not load MedlinePlus information.");
        } else {
          setNlmData(json);
        }
      } catch {
        setNlmError("Network error while loading MedlinePlus information.");
      } finally {
        setNlmLoading(false);
      }
    }
  }

  return (
    <article
      className="overdose-card"
      style={{
        borderLeftColor: colors.border,
        background: colors.bg,
        color: "var(--ink)",
      }}
    >
      {/* Header */}
      <div className="overdose-header">
        <div className="overdose-title-row">
          <h4 className="overdose-substance" style={{ color: colors.text }}>
            {substance}
          </h4>
          <span
            className="severity-badge"
            style={{ background: colors.border }}
          >
            {severityLabel}
          </span>
          {acronym && (
            <span
              className="acronym-pill"
              style={{ borderColor: colors.border, color: colors.text, background: colors.pillBg }}
              title={acronym.expansion}
            >
              <BookOpen size={11} aria-hidden="true" />
              {acronym.label} — {acronym.expansion}
            </span>
          )}
        </div>
      </div>

      {/* Signs */}
      <div className="overdose-section">
        <p className="overdose-section-label">Watch for:</p>
        <ul className="sign-grid">
          {signs.map((sign, i) => (
            <li key={sign} className="sign-item">
              <span className="sign-icon" style={{ color: colors.border }}>
                <ResolvedIcon name={signIcons[i] ?? "AlertCircle"} size={16} aria-hidden="true" />
              </span>
              {sign}
            </li>
          ))}
        </ul>
      </div>

      {/* Response steps */}
      <div className="overdose-section">
        <p className="overdose-section-label">Respond:</p>
        <ol className="step-list">
          {response.map((step, i) => (
            <li key={step} className="step-card" style={{ borderColor: colors.border, background: colors.stepBg }}>
              <span className="step-number" style={{ background: colors.border }}>
                {i + 1}
              </span>
              <span className="step-icon" style={{ color: colors.border }}>
                <ResolvedIcon name={responseIcons[i] ?? "AlertCircle"} size={15} aria-hidden="true" />
              </span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
      </div>

      {/* MedlinePlus expandable panel */}
      <div className="medlineplus-panel">
        <button
          type="button"
          className="nlm-toggle"
          onClick={handleExpand}
          aria-expanded={open}
        >
          <BookOpen size={14} aria-hidden="true" />
          MedlinePlus patient education
          <ChevronDown
            size={14}
            aria-hidden="true"
            style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform 200ms" }}
          />
        </button>

        {open && (
          <div className="nlm-body">
            {nlmLoading && <p className="tiny-note">Loading from MedlinePlus…</p>}
            {nlmError && <p className="tiny-note" style={{ color: "#dc2626" }}>{nlmError}</p>}
            {nlmData && (
              <>
                {nlmData.title && (
                  <p className="nlm-title">
                    <strong>{nlmData.title}</strong>
                  </p>
                )}
                {nlmData.summary && (
                  <div
                    className="nlm-summary"
                    // Content sourced exclusively from NLM servers — no user input in this path
                    dangerouslySetInnerHTML={{ __html: nlmData.summary }}
                  />
                )}
                {nlmData.url && (
                  <a
                    className="nlm-link tiny-note"
                    href={nlmData.url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Read full article on MedlinePlus →
                  </a>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </article>
  );
}
