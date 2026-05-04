"use client";

import { useEffect, useRef, useState } from "react";

type BarcodeResult = {
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
  adverseEvents?: Array<{ reaction: string; count: number }>;
  label?: {
    warnings: string[];
    contraindications: string[];
    dosageForm: string | null;
  } | null;
  recalls?: Array<{ reason: string; date: string; classification: string | null }>;
  source: {
    title: string;
    url: string;
  };
  error?: string;
};

type BarcodeDetectorLike = {
  detect: (input: CanvasImageSource) => Promise<Array<{ rawValue?: string }>>;
};

type BarcodeDetectorCtor = new (options?: { formats?: string[] }) => BarcodeDetectorLike;

declare global {
  interface Window {
    BarcodeDetector?: BarcodeDetectorCtor;
  }
}

export function BarcodeLookup() {
  const [barcode, setBarcode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<BarcodeResult | null>(null);
  const [scanning, setScanning] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      stopScanning();
    };
  }, []);

  function stopScanning() {
    if (scanTimerRef.current) {
      window.clearInterval(scanTimerRef.current);
      scanTimerRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    setScanning(false);
  }

  async function lookup(code: string) {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch(`/api/barcode/${encodeURIComponent(code)}`);
      const data = (await response.json()) as BarcodeResult;

      if (!response.ok) {
        setError(data.error ?? "No match found for that barcode.");
        return;
      }

      setResult(data);
    } catch {
      setError("Could not connect to barcode lookup service.");
    } finally {
      setLoading(false);
    }
  }

  async function startCameraScan() {
    if (!window.BarcodeDetector || !videoRef.current) {
      setError("Barcode scanning is not supported in this browser.");
      return;
    }

    setError(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });

      streamRef.current = stream;
      videoRef.current.srcObject = stream;
      await videoRef.current.play();

      const detector = new window.BarcodeDetector({
        formats: ["ean_13", "upc_a", "upc_e", "code_128"],
      });

      setScanning(true);

      scanTimerRef.current = window.setInterval(async () => {
        if (!videoRef.current) {
          return;
        }

        const found = await detector.detect(videoRef.current);
        const first = found[0]?.rawValue;
        if (first) {
          setBarcode(first);
          stopScanning();
          await lookup(first);
        }
      }, 650);
    } catch {
      stopScanning();
      setError("Camera access denied or unavailable.");
    }
  }

  return (
    <section className="panel" id="barcode" aria-labelledby="barcode-heading">
      <h2 id="barcode-heading">Medication Lookup</h2>
      <p className="section-intro">
        Scan a pill bottle barcode or type in a UPC/NDC code to see what a medication is, its active ingredients, and dosage form.
      </p>

      <div className="checker-form two-column">
        <label>
          Barcode (NDC/UPC/EAN)
          <input
            value={barcode}
            onChange={(event) => setBarcode(event.target.value)}
            placeholder="Example: 037000085313"
          />
        </label>
        <button type="button" onClick={() => lookup(barcode)} disabled={!barcode || loading}>
          {loading ? "Searching..." : "Search Barcode"}
        </button>
      </div>

      <div className="scanner-actions">
        <button type="button" onClick={startCameraScan} disabled={scanning}>
          {scanning ? "Scanning..." : "Start Camera Scan"}
        </button>
        {scanning ? (
          <button type="button" className="secondary" onClick={stopScanning}>
            Stop Scan
          </button>
        ) : null}
      </div>

      <video ref={videoRef} className={scanning ? "camera-feed active" : "camera-feed"} muted playsInline />

      {error ? (
        <p className="feedback error" role="alert" aria-live="assertive">
          {error}
        </p>
      ) : null}

      {result?.item ? (
        <div className="result-card">
          <p>
            Match: <strong>{result.item.name}</strong>
          </p>

          {result.resultType === "medication" ? (
            <>
              {result.recalls?.length ? <p className="feedback error">Recall alert: this product has active FDA recall information.</p> : null}
              <ul className="stack-list">
                <li>Generic name: {result.item.genericName ?? "Unavailable"}</li>
                <li>Labeler: {result.item.labeler ?? "Unavailable"}</li>
                <li>Dosage form: {result.item.dosageForm ?? result.label?.dosageForm ?? "Unavailable"}</li>
                <li>Routes: {result.item.route?.join(", ") || "Unavailable"}</li>
                <li>NDC: {result.item.productNdc ?? "Unavailable"}</li>
              </ul>
              {result.label?.warnings?.length ? (
                <div>
                  <h3>Warnings</h3>
                  <ul className="stack-list">
                    {result.label.warnings.map((warning) => (
                      <li key={warning}>{warning}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {result.label?.contraindications?.length ? (
                <div>
                  <h3>Contraindications</h3>
                  <ul className="stack-list">
                    {result.label.contraindications.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {result.adverseEvents?.length ? (
                <div>
                  <h3>Top serious adverse events</h3>
                  <ul className="stack-list">
                    {result.adverseEvents.map((event) => (
                      <li key={event.reaction}>{event.reaction} ({event.count} reports)</li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {result.recalls?.length ? (
                <div>
                  <h3>Active recalls</h3>
                  <ul className="stack-list">
                    {result.recalls.map((recall) => (
                      <li key={`${recall.reason}-${recall.date}`}>{recall.date}: {recall.reason}</li>
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
            Source: {" "}
            <a href={result.source.url} target="_blank" rel="noreferrer">
              {result.source.title}
            </a>
          </p>
          <p className="tiny-note">This is a safety reference, not a substitute for clinical or emergency advice.</p>
        </div>
      ) : null}
    </section>
  );
}
