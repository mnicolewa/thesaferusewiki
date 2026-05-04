"use client";

import { useState, useRef, useEffect } from "react";

type FeedbackType = "helpful" | "not-helpful" | "general";

interface Props {
  context?: string;
  /** Render as inline thumbs (for inside results panels) vs floating button */
  inline?: boolean;
}

export function FeedbackWidget({ context = "general", inline = false }: Props) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<FeedbackType | null>(null);
  const [message, setMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const firstFocusRef = useRef<HTMLButtonElement>(null);

  // Trap focus inside modal and close on Escape
  useEffect(() => {
    if (!open) return;
    firstFocusRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  async function submit() {
    if (!type) return;
    setBusy(true);
    try {
      await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, context, message }),
      });
    } catch {
      // silently succeed from user perspective — feedback is best-effort
    }
    setSubmitted(true);
    setBusy(false);
    setTimeout(() => {
      setOpen(false);
      setSubmitted(false);
      setType(null);
      setMessage("");
    }, 2000);
  }

  /* ── Inline thumbs variant (for result panels) ── */
  if (inline) {
    return (
      <div className="feedback-inline" role="group" aria-label="Was this helpful?">
        <span className="feedback-inline-label">Was this helpful?</span>
        <button
          className={`feedback-thumb${type === "helpful" ? " active" : ""}`}
          aria-pressed={type === "helpful"}
          onClick={() => {
            setType("helpful");
            void fetch("/api/feedback", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ type: "helpful", context, message: "" }),
            });
          }}
          aria-label="Yes, helpful"
        >
          👍
        </button>
        <button
          className={`feedback-thumb${type === "not-helpful" ? " active" : ""}`}
          aria-pressed={type === "not-helpful"}
          onClick={() => setType("not-helpful")}
          aria-label="No, not helpful"
        >
          👎
        </button>

        {type === "not-helpful" && !submitted && (
          <div className="feedback-follow-up">
            <label htmlFor="fb-inline-msg" className="sr-only">What could be better?</label>
            <input
              id="fb-inline-msg"
              type="text"
              className="feedback-follow-up-input"
              placeholder="What could be better? (optional)"
              maxLength={500}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
            <button
              className="feedback-submit-small"
              onClick={submit}
              disabled={busy}
            >
              Send
            </button>
          </div>
        )}

        {submitted && <span className="feedback-thanks">Thanks!</span>}
      </div>
    );
  }

  /* ── Floating button + modal variant ── */
  return (
    <>
      <button
        className="feedback-fab"
        onClick={() => setOpen(true)}
        aria-label="Give feedback about this site"
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        </svg>
        Feedback
      </button>

      {open && (
        <div className="feedback-backdrop" onClick={() => setOpen(false)} aria-hidden="true" />
      )}

      {open && (
        <div
          ref={dialogRef}
          className="feedback-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="fb-modal-title"
        >
          {submitted ? (
            <div className="feedback-modal-thanks">
              <p>Thanks for your feedback!</p>
            </div>
          ) : (
            <>
              <div className="feedback-modal-header">
                <h2 id="fb-modal-title">Give feedback</h2>
                <button
                  className="feedback-modal-close"
                  onClick={() => setOpen(false)}
                  aria-label="Close feedback"
                >
                  ✕
                </button>
              </div>

              <p className="feedback-modal-privacy">
                Feedback is anonymous. Don&apos;t include personal or medical info. If this is an emergency, call 911.
              </p>

              <div className="feedback-type-row" role="group" aria-label="Type of feedback">
                {(["helpful", "not-helpful", "general"] as FeedbackType[]).map((t) => (
                  <button
                    key={t}
                    ref={t === "helpful" ? firstFocusRef : undefined}
                    className={`feedback-type-btn${type === t ? " selected" : ""}`}
                    onClick={() => setType(t)}
                    aria-pressed={type === t}
                  >
                    {t === "helpful" ? "👍 Helpful" : t === "not-helpful" ? "👎 Not helpful" : "💬 Suggestion"}
                  </button>
                ))}
              </div>

              <label htmlFor="fb-message" className="feedback-label">
                Comments <span className="feedback-optional">(optional)</span>
              </label>
              <textarea
                id="fb-message"
                className="feedback-textarea"
                rows={3}
                maxLength={1000}
                placeholder="What worked well or could be improved?"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />

              <button
                className="feedback-submit"
                onClick={submit}
                disabled={!type || busy}
              >
                {busy ? "Sending…" : "Send feedback"}
              </button>
            </>
          )}
        </div>
      )}
    </>
  );
}
