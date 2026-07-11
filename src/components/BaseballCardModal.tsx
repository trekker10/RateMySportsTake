"use client";

import { useState, useEffect, useRef } from "react";

const CARD_W = 720;
const CARD_H = 1008;

const BEAT_C: Record<string, string> = {
  NBA: "#e2241a", NFL: "#0a5b73", MLB: "#1f6b3a",
  WNBA: "#7a1f2a", NHL: "#243042", CFB: "#b8731a",
};
const GRADE_C: Record<string, string> = {
  A: "#0a7a3b", B: "#e07a18", C: "#d6a312", D: "#a8472a", F: "#e2241a",
};

export interface BaseballCardProps {
  first: string;
  last: string;
  beat: string;
  grade: string;
  score: number;
  acc: number;
  record: string;
  rank: number;
  network: string;
  logoUrl: string | null;
  portraitUrl: string | null;
}

/* ─── The 720×1008 card ─────────────────────────────────── */
function BaseballCard({ first, last, beat, grade, score, acc, record, rank, network, logoUrl, portraitUrl }: BaseballCardProps) {
  const beatC  = BEAT_C[beat]  ?? "#0a5b73";
  const gradeC = GRADE_C[(grade || "C")[0]] ?? "#d6a312";

  const cells: [string, string, boolean][] = [
    ["GRADE",    grade || "—",                         false],
    ["ACCURACY", acc  > 0 ? `${acc}%`          : "—", false],
    ["RECORD",   record,                               true],
    ["RANK",     rank > 0 ? `#${rank}`          : "—", false],
  ];

  const CREAM = "#f3efdf";
  const INK   = "#15201a";

  return (
    <div style={{
      width: CARD_W, height: CARD_H, background: CREAM,
      padding: 26, overflow: "hidden", boxSizing: "border-box",
      fontFamily: "'Space Grotesk', sans-serif",
    }}>
      {/* Inner frame */}
      <div style={{
        height: "100%", display: "flex", flexDirection: "column",
        border: `4px solid ${beatC}`,
        boxShadow: `0 0 0 2px ${CREAM}, 0 0 0 5px rgba(21,32,26,.25)`,
      }}>

        {/* ── Portrait window ── */}
        <div style={{
          flex: 1, margin: 14, border: `2px solid ${beatC}`,
          background: "#11161c", overflow: "hidden", position: "relative",
        }}>
          {/* Photo */}
          {portraitUrl && (
            <img
              src={portraitUrl}
              alt=""
              style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center top", display: "block" }}
            />
          )}

          {/* RMST wordmark tab — top left */}
          <div style={{
            position: "absolute", top: 0, left: 0,
            background: "#fff", padding: "14px 20px 20px 14px",
            clipPath: "polygon(0 0, 100% 0, 100% 100%, 0 84%)",
            boxShadow: "2px 3px 7px rgba(0,0,0,.30)",
          }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/wordmark.png" alt="RATE/MY/SPORTS/TAKE" style={{ width: 180, display: "block" }} />
          </div>

          {/* ANALYST pennant — top right */}
          <div style={{
            position: "absolute", top: 30, right: -58,
            transform: "rotate(45deg)", background: beatC,
            color: "#fff", fontFamily: "'JetBrains Mono', monospace",
            fontWeight: 700, fontSize: 22, letterSpacing: ".16em",
            padding: "11px 72px", boxShadow: "0 2px 6px rgba(0,0,0,.3)",
          }}>ANALYST</div>

        </div>

        {/* ── Name banner ── */}
        <div style={{
          background: beatC, color: CREAM, padding: "16px 22px 14px",
          display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16,
        }}>
          <div>
            <div style={{ fontFamily: "'Archivo Black', sans-serif", fontStyle: "italic", fontWeight: 900, fontSize: 72, lineHeight: .82, letterSpacing: "-.03em" }}>{first}</div>
            <div style={{ fontFamily: "'Archivo Black', sans-serif", fontStyle: "italic", fontWeight: 900, fontSize: 72, lineHeight: .82, letterSpacing: "-.03em", color: "#fff", marginTop: 4 }}>{last}</div>
          </div>

          {/* Network logo roundel */}
          <div style={{
            flexShrink: 0, width: 96, height: 96, borderRadius: "50%",
            background: CREAM, border: "3px solid rgba(21,32,26,.18)",
            boxShadow: "0 2px 0 rgba(0,0,0,.22)",
            display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden",
          }}>
            {logoUrl ? (
              <img src={logoUrl} alt={network} style={{ width: 64, height: 64, objectFit: "contain" }} />
            ) : (
              <span style={{
                fontFamily: "'Archivo Black', sans-serif", fontStyle: "italic",
                fontSize: network.length > 4 ? 22 : 30, letterSpacing: "-.06em",
                color: "#e2241a", transform: "skewX(-2deg)", textAlign: "center",
                lineHeight: 1, padding: "0 4px",
              }}>{network || "—"}</span>
            )}
          </div>
        </div>

        {/* ── Stat strip ── */}
        <div style={{
          background: CREAM, borderTop: `4px solid ${beatC}`,
          display: "grid", gridTemplateColumns: "repeat(4, 1fr)",
        }}>
          {cells.map(([label, value, small], i) => (
            <div key={label} style={{
              padding: "34px 6px 32px", textAlign: "center",
              borderRight: i < 3 ? `1.5px solid rgba(21,32,26,.18)` : undefined,
            }}>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 16, letterSpacing: ".1em", color: "#857d68" }}>{label}</div>
              <div style={{
                fontFamily: "'Archivo Black', sans-serif",
                fontWeight: 900,
                fontSize: small ? 48 : 61,
                color: INK, marginTop: 10,
                letterSpacing: "-.04em", whiteSpace: "nowrap",
              }}>{value}</div>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}

/* ─── Modal + button ────────────────────────────────────── */
export default function BaseballCardModal(props: BaseballCardProps) {
  const [open, setOpen]   = useState(false);
  const [scale, setScale] = useState(0.5);
  const [copying, setCopying] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  async function captureCard() {
    const el = cardRef.current!;
    const html2canvas = (await import("html2canvas")).default;

    // The element lives at left:-9999 so browsers skip compositing it — nothing
    // renders and html2canvas captures a blank canvas. Temporarily move it
    // on-screen (opacity:0 so it's invisible) for the duration of the capture.
    el.style.left    = "0px";
    el.style.opacity = "0";
    try {
      return await html2canvas(el, {
        scale: 2,
        useCORS: true,
        backgroundColor: null,
        width: CARD_W,
        height: CARD_H,
        logging: false,
      });
    } finally {
      el.style.left    = "-9999px";
      el.style.opacity = "";
    }
  }

  async function cardBlob(canvas: HTMLCanvasElement): Promise<Blob> {
    return new Promise((resolve, reject) =>
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("toBlob returned null"))), "image/png")
    );
  }

  const filename = `${props.first}-${props.last}-rmst.png`.toLowerCase().replace(/\s+/g, "-");

  async function handleCopy() {
    setCopying(true);
    try {
      const canvas = await captureCard();
      const blob   = await cardBlob(canvas);

      // iOS Safari doesn't support ClipboardItem at all — use Web Share API
      // instead so users get the native share sheet (Save Image, AirDrop, etc.)
      const isMobile = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);
      if (isMobile && navigator.share) {
        const file = new File([blob], filename, { type: "image/png" });
        if (navigator.canShare?.({ files: [file] })) {
          await navigator.share({ files: [file], title: `${props.first} ${props.last} — RMST` });
          return;
        }
      }
      // Desktop: write to clipboard
      await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
    } catch (err) {
      console.error("[baseball card] copy/share failed:", err);
    } finally {
      setCopying(false);
    }
  }

  async function handleDownload() {
    setDownloading(true);
    try {
      const canvas = await captureCard();
      const link   = document.createElement("a");
      link.download = filename;
      link.href     = canvas.toDataURL("image/png");
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } finally {
      setDownloading(false);
    }
  }

  // Label adapts: mobile gets "SHARE IMAGE" since it opens the share sheet
  const isMobileDevice = typeof navigator !== "undefined" && /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);

  function fitCard() {
    const s = Math.min(0.62, (window.innerHeight - 200) / CARD_H, (window.innerWidth - 72) / CARD_W);
    setScale(s);
  }

  useEffect(() => {
    if (!open) return;
    fitCard();
    window.addEventListener("resize", fitCard);
    return () => window.removeEventListener("resize", fitCard);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") setOpen(false); }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <>
      {/* Button */}
      <button
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors hover:opacity-90"
        style={{ background: "#e2241a" }}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="w-4 h-4 shrink-0">
          <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
          <line x1="8.6" y1="10.5" x2="15.4" y2="6.5"/><line x1="8.6" y1="13.5" x2="15.4" y2="17.5"/>
        </svg>
        Baseball Card
      </button>

      {/* Modal backdrop */}
      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Baseball card"
          onClick={e => { if (e.target === e.currentTarget) setOpen(false); }}
          style={{
            position: "fixed", inset: 0, zIndex: 120,
            display: "flex", alignItems: "flex-start", justifyContent: "center",
            padding: "16px 28px 28px", overflowY: "auto", background: "rgba(21,32,26,.82)", backdropFilter: "blur(4px)",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 22, maxHeight: "100%" }}>

            {/* Modal header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 24, width: "100%", color: "#f5f1e8" }}>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: 14, letterSpacing: ".24em" }}>
                SHAREABLE CARD
              </span>
              <button
                onClick={() => setOpen(false)}
                aria-label="Close"
                style={{
                  background: "none", border: "2px solid rgba(245,241,232,.5)",
                  color: "#f5f1e8", width: 42, height: 42, borderRadius: "50%",
                  fontSize: 20, display: "flex", alignItems: "center", justifyContent: "center",
                  cursor: "pointer",
                }}
              >×</button>
            </div>

            {/* Scaled card stage */}
            <div style={{ overflow: "hidden", boxShadow: "0 24px 60px rgba(0,0,0,.5)", width: CARD_W * scale, height: CARD_H * scale, flexShrink: 0 }}>
              <div style={{ transformOrigin: "top left", transform: `scale(${scale})`, width: CARD_W, height: CARD_H }}>
                <BaseballCard {...props} />
              </div>
            </div>

            {/* Hidden full-res card for capture */}
            <div ref={cardRef} style={{ position: "fixed", left: -9999, top: 0, width: CARD_W, height: CARD_H, pointerEvents: "none", zIndex: -1 }}>
              <BaseballCard {...props} />
            </div>

            {/* Action buttons */}
            <div style={{ width: "100%", background: "#fff", padding: "20px 24px 16px", display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ display: "flex", gap: 12 }}>
                <button
                  onClick={handleCopy}
                  disabled={copying}
                  style={{
                    flex: 1, padding: "14px", background: "#15201a", color: "#fff",
                    border: "2px solid #15201a", fontFamily: "'JetBrains Mono', monospace",
                    fontWeight: 700, fontSize: 12, letterSpacing: ".14em", textTransform: "uppercase",
                    cursor: copying ? "not-allowed" : "pointer", opacity: copying ? 0.6 : 1,
                  }}
                >
                  {copying ? (isMobileDevice ? "SHARING…" : "COPYING…") : (isMobileDevice ? "SHARE IMAGE" : "COPY IMAGE")}
                </button>
                <button
                  onClick={handleDownload}
                  disabled={downloading}
                  style={{
                    flex: 1, padding: "14px", background: "#fff", color: "#15201a",
                    border: "2px solid #15201a", fontFamily: "'JetBrains Mono', monospace",
                    fontWeight: 700, fontSize: 12, letterSpacing: ".14em", textTransform: "uppercase",
                    cursor: downloading ? "not-allowed" : "pointer", opacity: downloading ? 0.6 : 1,
                  }}
                >
                  {downloading ? "SAVING…" : "DOWNLOAD PNG"}
                </button>
              </div>
              <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: ".1em", color: "#b0aca4", textAlign: "center", textTransform: "uppercase" }}>
                {isMobileDevice ? "Share image · save to photos or send via AirDrop / iMessage" : "Copy image · paste directly to X / Instagram / iMessage"}
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
