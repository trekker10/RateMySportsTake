"use client";

import { useState, useEffect, useRef } from "react";
import { importInstagramFantasyTake } from "@/app/actions/takes";

// ── Types mirroring the take-extractor-api response shape ────────────────────

interface ExtractedTake {
  player: string;
  position: string;
  stance: string;
  confidence: string;
  reasoning: string;
  quote_paraphrase: string;
  rating: number | null;
}

interface ExtractionResult {
  video_summary: string;
  takes: ExtractedTake[];
  transcript: string;
  source_url: string;
  upload_date: string | null;
}

function RatingArrows({ rating }: { rating: number | null }) {
  if (rating == null) return null;
  if (rating === 5) return (
    <span className="inline-flex items-center gap-1">
      <span className="text-green-400 font-bold text-sm">↑↑</span>
      <span className="text-xs font-semibold text-green-400">Buy</span>
      <span className="text-[10px] bg-green-900 text-green-300 px-1.5 py-0.5 rounded font-bold">BREAKOUT</span>
    </span>
  );
  if (rating === 4) return (
    <span className="inline-flex items-center gap-1">
      <span className="text-green-400 font-bold text-sm">↑</span>
      <span className="text-xs font-semibold text-green-400">Buy</span>
    </span>
  );
  if (rating === 3) return (
    <span className="inline-flex items-center gap-1">
      <span className="text-zinc-400 font-bold text-sm">→</span>
      <span className="text-xs font-semibold text-zinc-400">Neutral</span>
    </span>
  );
  if (rating === 2) return (
    <span className="inline-flex items-center gap-1">
      <span className="text-red-400 font-bold text-sm">↓</span>
      <span className="text-xs font-semibold text-red-400">Avoid</span>
    </span>
  );
  // rating === 1
  return (
    <span className="inline-flex items-center gap-1">
      <span className="text-red-400 font-bold text-sm">↓↓</span>
      <span className="text-xs font-semibold text-red-400">Avoid</span>
      <span className="text-[10px] bg-red-900 text-red-300 px-1.5 py-0.5 rounded font-bold">BUST</span>
    </span>
  );
}

// ── Staged loading messages — cycles during the 2-4 min wait ─────────────────

const LOADING_STAGES = [
  { msg: "Downloading video…",      delay: 0     },
  { msg: "Extracting audio…",       delay: 15000 },
  { msg: "Transcribing with Whisper…", delay: 35000 },
  { msg: "Analyzing takes with AI…",   delay: 80000 },
  { msg: "Almost there…",           delay: 160000 },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

/** Extract an Instagram handle from a URL, e.g. instagram.com/somehandle/reel/... */
function handleFromUrl(url: string): string {
  try {
    const path = new URL(url).pathname; // e.g. /somehandle/reel/AbcXyz/
    const parts = path.split("/").filter(Boolean);
    if (parts.length > 0 && parts[0] !== "reel" && parts[0] !== "p") {
      return parts[0];
    }
  } catch {/* ignore */}
  return "";
}

function stanceColor(stance: string) {
  const s = stance.toLowerCase();
  if (["buy", "breakout", "start"].includes(s)) return "text-green-400";
  if (["sell", "bust", "sit", "avoid"].includes(s)) return "text-red-400";
  return "text-yellow-400"; // hold, other
}

function confidenceBadge(confidence: string) {
  const c = confidence.toLowerCase();
  if (c === "strong")   return "bg-green-900 text-green-300";
  if (c === "hedged")   return "bg-zinc-700 text-zinc-300";
  return "bg-blue-900 text-blue-300"; // moderate
}

// ── Main component ────────────────────────────────────────────────────────────

export default function InstagramTakesPanel() {
  const [url, setUrl]         = useState("");
  const [expertName, setExpertName] = useState("");
  const [loading, setLoading] = useState(false);
  const [stageMsg, setStageMsg] = useState("");
  const [result, setResult]   = useState<ExtractionResult | null>(null);
  const [error, setError]     = useState<string | null>(null);
  const [transcript, setTranscript] = useState(false);

  // Per-take save state: "idle" | "saving" | "saved" | "error"
  const [saveState, setSaveState] = useState<Record<number, "idle" | "saving" | "saved" | "error">>({});
  const [saveErrors, setSaveErrors] = useState<Record<number, string>>({});

  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  // Clear staged-message timers on unmount
  useEffect(() => {
    return () => timersRef.current.forEach(clearTimeout);
  }, []);

  function startStagedMessages() {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
    LOADING_STAGES.forEach(({ msg, delay }) => {
      timersRef.current.push(setTimeout(() => setStageMsg(msg), delay));
    });
  }

  function isValidInstagramUrl(u: string) {
    try {
      const parsed = new URL(u);
      return parsed.hostname.includes("instagram.com");
    } catch { return false; }
  }

  async function handleExtract() {
    if (!isValidInstagramUrl(url)) return;
    setError(null);
    setResult(null);
    setSaveState({});
    setSaveErrors({});
    setLoading(true);
    setStageMsg("Downloading video…");
    startStagedMessages();

    // Auto-populate expert name from URL handle if not already set
    if (!expertName) {
      const handle = handleFromUrl(url);
      if (handle) setExpertName(handle);
    }

    try {
      const res = await fetch("/api/admin/extract-instagram-take", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? `Server error ${res.status}`);
      } else if (!data.takes || data.takes.length === 0) {
        setError("No takes were extracted from this video. The content may not contain fantasy football takes.");
      } else {
        setResult(data);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Network error — check your connection and try again.");
    } finally {
      timersRef.current.forEach(clearTimeout);
      setLoading(false);
      setStageMsg("");
    }
  }

  async function handleSave(idx: number, take: ExtractedTake) {
    if (!expertName.trim()) {
      setSaveErrors(prev => ({ ...prev, [idx]: "Enter a creator/expert name above before saving." }));
      return;
    }
    setSaveState(prev => ({ ...prev, [idx]: "saving" }));
    setSaveErrors(prev => { const n = { ...prev }; delete n[idx]; return n; });

    const res = await importInstagramFantasyTake({
      expertName:    expertName.trim(),
      rawText:       take.quote_paraphrase || take.reasoning,
      dateMade:      todayISO(),
      category:      take.position || "Fantasy Football",
      timingWindow:  "",
      format:        "both",
      playerName:    take.player || null,
      playerPosition: take.position || null,
      sourceUrl:     result?.source_url ?? null,
      playerRating:  take.rating ?? null,
      videoUploadDate: result?.upload_date ?? null,
    });

    if (res.success) {
      setSaveState(prev => ({ ...prev, [idx]: "saved" }));
    } else {
      setSaveState(prev => ({ ...prev, [idx]: "error" }));
      setSaveErrors(prev => ({ ...prev, [idx]: res.error ?? "Save failed" }));
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">

      {/* ── Input card ── */}
      <div className="rounded-xl bg-zinc-900 border border-zinc-700 p-6 space-y-4">

        {/* URL input */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-widest text-zinc-400 mb-2">
            Instagram URL
          </label>
          <input
            type="url"
            value={url}
            onChange={e => setUrl(e.target.value)}
            placeholder="https://www.instagram.com/reel/…"
            disabled={loading}
            className="w-full rounded-lg bg-zinc-800 border border-zinc-600 px-4 py-3 text-sm text-zinc-100 placeholder-zinc-500
                       focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent
                       disabled:opacity-50"
          />
          {url && !isValidInstagramUrl(url) && (
            <p className="mt-1.5 text-xs text-red-400">Must be an instagram.com URL</p>
          )}
        </div>

        {/* Creator name */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-widest text-zinc-400 mb-2">
            Creator / Expert Name
            <span className="ml-2 normal-case font-normal text-zinc-500">(auto-detected from URL, edit if wrong)</span>
          </label>
          <input
            type="text"
            value={expertName}
            onChange={e => setExpertName(e.target.value)}
            placeholder="e.g. Matthew Berry"
            disabled={loading}
            className="w-full rounded-lg bg-zinc-800 border border-zinc-600 px-4 py-3 text-sm text-zinc-100 placeholder-zinc-500
                       focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent
                       disabled:opacity-50"
          />
          <p className="mt-1.5 text-xs text-zinc-500">
            Used to find or create an expert record. Takes will be saved under this name.
          </p>
        </div>

        {/* Extract button */}
        <button
          onClick={handleExtract}
          disabled={loading || !url || !isValidInstagramUrl(url)}
          className="w-full rounded-lg bg-green-700 hover:bg-green-600 disabled:bg-zinc-700 disabled:text-zinc-500
                     text-white font-semibold text-sm py-3 transition-colors"
        >
          {loading ? "Extracting…" : "Extract Takes"}
        </button>
      </div>

      {/* ── Loading state ── */}
      {loading && (
        <div className="rounded-xl bg-zinc-900 border border-zinc-700 p-8 flex flex-col items-center gap-4">
          {/* Animated ring */}
          <svg className="animate-spin h-10 w-10 text-green-500" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3"/>
            <path className="opacity-80" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.37 0 0 5.37 0 12h4z"/>
          </svg>
          <p className="text-zinc-100 font-medium">{stageMsg}</p>
          <p className="text-xs text-zinc-500">This usually takes 2–4 minutes — video download + transcription + AI analysis.</p>
        </div>
      )}

      {/* ── Error state ── */}
      {!loading && error && (
        <div className="rounded-xl bg-red-950 border border-red-800 p-5">
          <p className="text-sm font-semibold text-red-300 mb-1">Extraction failed</p>
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {/* ── Results ── */}
      {!loading && result && (
        <div className="space-y-5">

          {/* Summary */}
          <div className="rounded-xl bg-zinc-900 border border-zinc-700 p-5">
            <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400 mb-2">Video Summary</p>
            <p className="text-sm text-zinc-200 leading-relaxed">{result.video_summary}</p>
          </div>

          {/* Per-take breakdown */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400 mb-3">
              {result.takes.length} Take{result.takes.length !== 1 ? "s" : ""} Extracted
              {result.upload_date && <span className="text-zinc-500 text-xs ml-2 normal-case font-normal">· video from {result.upload_date}</span>}
            </p>
            <div className="space-y-4">
              {result.takes.map((take, idx) => {
                const state = saveState[idx] ?? "idle";
                return (
                  <div key={idx} className="rounded-xl bg-zinc-900 border border-zinc-700 p-5 space-y-3">

                    {/* Header row */}
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-base font-bold text-zinc-100">{take.player}</span>
                          {take.position && (
                            <span className="text-xs bg-zinc-700 text-zinc-300 px-2 py-0.5 rounded font-mono">
                              {take.position}
                            </span>
                          )}
                          <span className={`text-sm font-bold uppercase ${stanceColor(take.stance)}`}>
                            {take.stance}
                          </span>
                          <span className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded ${confidenceBadge(take.confidence)}`}>
                            {take.confidence}
                          </span>
                          <RatingArrows rating={take.rating} />
                        </div>
                      </div>

                      {/* Save button */}
                      <div className="shrink-0">
                        {state === "saved" ? (
                          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-green-400">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                              <path d="M5 13l4 4L19 7"/>
                            </svg>
                            Saved
                          </span>
                        ) : (
                          <button
                            onClick={() => handleSave(idx, take)}
                            disabled={state === "saving"}
                            className="rounded-lg bg-green-800 hover:bg-green-700 disabled:bg-zinc-700 disabled:text-zinc-500
                                       text-green-100 text-xs font-semibold px-3 py-1.5 transition-colors"
                          >
                            {state === "saving" ? "Saving…" : "Save Take"}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Reasoning */}
                    <p className="text-sm text-zinc-300 leading-relaxed">{take.reasoning}</p>

                    {/* Quote paraphrase */}
                    {take.quote_paraphrase && take.quote_paraphrase !== take.reasoning && (
                      <blockquote className="border-l-2 border-zinc-600 pl-3 text-sm text-zinc-400 italic">
                        {take.quote_paraphrase}
                      </blockquote>
                    )}

                    {/* Save error */}
                    {saveErrors[idx] && (
                      <p className="text-xs text-red-400">{saveErrors[idx]}</p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Full transcript (collapsible) */}
          {result.transcript && (
            <div className="rounded-xl bg-zinc-900 border border-zinc-700 overflow-hidden">
              <button
                onClick={() => setTranscript(v => !v)}
                className="w-full flex items-center justify-between px-5 py-4 text-sm font-medium text-zinc-300 hover:text-zinc-100 transition-colors"
              >
                <span>Full Transcript</span>
                <svg
                  className={`w-4 h-4 transition-transform ${transcript ? "rotate-180" : ""}`}
                  fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"
                >
                  <path d="M6 9l6 6 6-6"/>
                </svg>
              </button>
              {transcript && (
                <div className="px-5 pb-5">
                  <p className="text-xs text-zinc-400 whitespace-pre-wrap leading-relaxed">{result.transcript}</p>
                </div>
              )}
            </div>
          )}

        </div>
      )}
    </div>
  );
}
