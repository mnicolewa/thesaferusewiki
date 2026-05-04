"use client";

import { useEffect, useRef, useState } from "react";

type MedResult = {
  resultType: "medication" | "consumer-product" | "none";
  item?: {
    name: string;
    genericName?: string | null;
    labeler?: string | null;
    dosageForm?: string | null;
    route?: string[];
    productNdc?: string | null;
    activeIngredients?: Array<{ name?: string; strength?: string }>;
    packageNdc?: string[];
    brand?: string | null;
    categories?: string | null;
  };
  matches?: Array<{
    name: string;
    genericName: string | null;
    labeler: string | null;
    dosageForm: string | null;
    route: string[];
    productNdc: string | null;
  }>;
  adverseEvents?: Array<{ reaction: string; count: number }>;
  label?: {
    warnings: string[];
    contraindications: string[];
    dosageForm: string | null;
  } | null;
  recalls?: Array<{ reason: string; date: string; classification: string | null }>;
  source: { title: string; url: string };
  error?: string;
};

type Mode = "name" | "barcode";

type BarcodeDetectorLike = {
  detect: (input: CanvasImageSource) => Promise<Array<{ rawValue?: string }>>;
};
type BarcodeDetectorCtor = new (options?: { formats?: string[] }) => BarcodeDetectorLike;
declare global {
  interface Window { BarcodeDetector?: BarcodeDetectorCtor; }
}

function MedDetails({ result }: { result: MedResult }) {
  if (!result.item) return null;
  return (
    <div className="result-card">
      <p>Match: <strong>{result.item.name}</strong></p>

      {result.resultType === "medication" ? (
        <>
          {result.recalls?.length ? (
            <p className="feedback error">⚠ Recall alert: this product has active FDA recall information.</p>
          ) : null}
          <ul className="stack-list">
            <li>Generic name: {result.item.genericName ?? "Unavailable"}</li>
            <li>Labeler: {result.item.labeler ?? "Unavailable"}</li>
            <li>Dosage form: {result.item.dosageForm ?? result.label?.dosageForm ?? "Unavailable"}</li>
            <li>Routes: {result.item.route?.join(", ") || "Unavailable"}</li>
            <li>NDC: {result.item.productNdc ?? "Unavailable"}</li>
          </ul>

          {result.item.activeIngredients?.length ? (
            <div>
              <h3>Active ingredients</h3>
              <ul className="stack-list">
                {result.item.activeIngredients.map((i) => (
                  <li key={i.name}>{i.name}{i.strength ? ` — ${i.strength}` : ""}</li>
                ))}
              </ul>
            </div>
          ) : null}

          {result.label?.warnings?.length ? (
            <div>
              <h3>Warnings</h3>
              <ul className="stack-list">
                {result.label.warnings.map((w) => <li key={w}>{w}</li>)}
              </ul>
            </div>
          ) : null}

          {result.label?.contraindications?.length ? (
            <div>
              <h3>Contraindications</h3>
              <ul className="stack-list">
                {result.label.contraindications.map((c) => <li key={c}>{c}</li>)}
              </ul>
            </div>
          ) : null}

          {result.adverseEvents?.length ? (
            <div>
              <h3>Top serious adverse events</h3>
              <ul className="stack-list">
                {result.adverseEvents.map((e) => (
                  <li key={e.reaction}>{e.reaction} ({e.count} reports)</li>
                ))}
              </ul>
            </div>
          ) : null}

          {result.recalls?.length ? (
            <div>
              <h3>Active recalls</h3>
              <ul className="stack-list">
                {result.recalls.map((r) => (
                  <li key={`${r.reason}-${r.date}`}>{r.date}: {r.reason}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </>
      ) : (
        <ul className="stack-list">
          <li>Brand: {result.item.brand ?? "Unavailable"}</li>
          <li>Categories: {result.item.categories ?? "Unavailable"}</li>
        </ul>
      )}

      <p className="tiny-note">
        Source:{" "}
        <a href={result.source.url} target="_blank" rel="noreferrer">{result.source.title}</a>
      </p>
      <p className="tiny-note">Safety reference only — not a substitute for clinical or emergency advice.</p>
    </div>
  );
}

export function BarcodeLookup() {
  const [mode, setMode] = useState<Mode>("name");
  const [nameQuery, setNameQuery] = useState("");
  const [barcode, setBarcode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<MedResult | null>(null);
  const [scanning, setScanning] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanTimerRef = useRef<number | null>(null);

  useEffect(() => () => { stopScanning(); }, []);

  function stopScanning() {
    if (scanTimerRef.current) { window.clearInterval(scanTimerRef.current); scanTimerRef.current = null; }
    if (streamRef.current) { streamRef.current.getTracks().forEach((t) => t.stop()); streamRef.current = null; }
    setScanning(false);
  }

  async function lookupByBarcode(code: string) {
    setLoading(true); setError(null); setResult(null);
    try {
      const res = await fetch(`/api/barcode/${encodeURIComponent(code)}`);
      const data = (await res.json()) as MedResult;
      if (!res.ok) { setError(data.error ?? "No match found for that barcode."); return; }
      setResult(data);
    } catch { setError("Could not connect to lookup service."); }
    finally { setLoading(false); }
  }

  async function lookupByName(name: string) {
    setLoading(true); setError(null); setResult(null);
    try {
      const res = await fetch(`/api/drug-lookup?name=${encodeURIComponent(name)}`);
      const data = (await res.json()) as MedResult;
      if (!res.ok) { setError(data.error ?? "No medication found with that name."); return; }
      setResult(data);
    } catch { setError("Could not connect to lookup service."); }
    finally { setLoading(false); }
  }

  async function startCameraScan() {
    if (!window.BarcodeDetector || !videoRef.current) {
      setError("Barcode scanning is not supported in this browser. Try Chrome on Android or Safari on iOS 16+.");
      return;
    }
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      streamRef.current = stream;
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
      const detector = new window.BarcodeDetector({ formats: ["ean_13", "upc_a", "upc_e", "code_128"] });
      setScanning(true);
      scanTimerRef.current = window.setInterval(async () => {
        if (!videoRef.current) return;
        const found = await detector.detect(videoRef.current);
        const first = found[0]?.rawValue;
        if (first) {
          setBarcode(first);
          stopScanning();
          await lookupByBarcode(first);
        }
      }, 650);
    } catch { stopScanning(); setError("Camera access denied or unavailable."); }
  }

  function handleModeChange(next: Mode) {
    setMode(next);
    setError(null);
    setResult(null);
  }

  return (
    <section className="panel panel-tool" id="barcode" aria-labelledby="barcode-heading">
      <h2 id="barcode-heading">Medication Lookup</h2>
      <p className="section-intro">
        Search by medication name or scan/enter a barcode to see active ingredients, warnings, contraindications, and FDA recall status.
      </p>

      {/* Mode tabs */}
      <div className="lookup-tabs" role="tablist" aria-label="Lookup method">
        <button
          role="tab"
          aria-selected={mode === "name"}
          className={`lookup-tab${mode === "name" ? " active" : ""}`}
          onClick={() => handleModeChange("name")}
        >
          Search by name
        </button>
        <button
          role="tab"
          aria-selected={mode === "barcode"}
          className={`lookup-tab${mode === "barcode" ? " active" : ""}`}
          onClick={() => handleModeChange("barcode")}
        >
          Search by barcode
        </button>
      </div>

      {mode === "name" && (
        <div className="checker-form two-column" role="tabpanel">
          <label>
            Drug or medication name
            <input
              value={nameQuery}
              onChange={(e) => setNameQuery(e.target.value)}
              placeholder="e.g. ibuprofen, Narcan, methadone"
              onKeyDown={(e) => { if (e.key === "Enter" && nameQuery.trim().length >= 2) lookupByName(nameQuery.trim()); }}
              autoFocus
            />
          </label>
          <button
            type="button"
            onClick={() => lookupByName(nameQuery.trim())}
            disabled={nameQuery.trim().length < 2 || loading}
          >
            {loading ? "Searching…" : "Search"}
          </button>
        </div>
      )}

      {mode === "barcode" && (
        <div role="tabpanel">
          <div className="checker-form two-column">
            <label>
              Barcode (NDC / UPC / EAN)
              <input
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
                placeholder="e.g. 037000085313"
                onKeyDown={(e) => { if (e.key === "Enter" && barcode.trim()) lookupByBarcode(barcode.trim()); }}
              />
            </label>
            <button
              type="button"
              onClick={() => lookupByBarcode(barcode.trim())}
              disabled={!barcode.trim() || loading}
            >
              {loading ? "Searching…" : "Search Barcode"}
            </button>
          </div>
          <div className="scanner-actions">
            <button type="button" onClick={startCameraScan} disabled={scanning}>
              {scanning ? "Scanning…" : "📷 Start Camera Scan"}
            </button>
            {scanning && (
              <button type="button" className="secondary" onClick={stopScanning}>Stop</button>
            )}
          </div>
          <video
            ref={videoRef}
            className={scanning ? "camera-feed active" : "camera-feed"}
            muted
            playsInline
          />
        </div>
      )}

      {error && (
        <p className="feedback error" role="alert" aria-live="assertive">{error}</p>
      )}

      {result && <MedDetails result={result} />}
    </section>
  );
}


