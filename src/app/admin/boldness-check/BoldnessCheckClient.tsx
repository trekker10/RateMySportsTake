"use client";

import { useState } from "react";

interface ClassifyResult {
  is_take: boolean;
  confidence: number;
  has_clear_claim: boolean;
  is_fantasy: boolean;
  summary: string | null;
  grading_criteria: string | null;
  resolution_condition: string;
  sport: string;
  season: string | null;
  take_type: string;
  take_subtype: string;
  subjects: string[];
  boldness_score: number;
  confidence_language: string;
  time_horizon: string | null;
  flags: string[];
}

function boldnessLabel(score: number): { label: string; color: string } {
  if (score <= 15)  return { label: "Extreme Chalk",  color: "#6b7280" };
  if (score <= 30)  return { label: "Mild Lean",      color: "#3b82f6" };
  if (score <= 45)  return { label: "Moderate",       color: "#f59e0b" };
  if (score <= 60)  return { label: "Clear Contrarian", color: "#f97316" };
  if (score <= 75)  return { label: "Bold",           color: "#ef4444" };
  if (score <= 90)  return { label: "Very Bold",      color: "#dc2626" };
  return                   { label: "Extreme",        color: "#991b1b" };
}

function BoldnessMeter({ score }: { score: number }) {
  const { label, color } = boldnessLabel(score);
  const pct = score;
  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, letterSpacing: ".16em", textTransform: "uppercase", color: "#8a8a82" }}>Boldness Score</span>
        <span style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 28, color, letterSpacing: "-.02em" }}>{score} <span style={{ fontSize: 14, color: "#8a8a82", fontFamily: "'JetBrains Mono', monospace", letterSpacing: ".1em" }}>/ 100</span></span>
      </div>
      <div style={{ height: 12, background: "#e5e7eb", borderRadius: 6, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: 6, transition: "width .4s ease" }} />
      </div>
      <div style={{ marginTop: 6, display: "flex", justifyContent: "space-between" }}>
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: ".12em", color: "#8a8a82" }}>CHALK</span>
        <span style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 13, color, letterSpacing: "-.01em" }}>{label.toUpperCase()}</span>
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: ".12em", color: "#8a8a82" }}>EXTREME</span>
      </div>
    </div>
  );
}

function Field({ label, value, mono = false }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div style={{ padding: "12px 0", borderBottom: "1px solid #f0ede7" }}>
      <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: ".16em", textTransform: "uppercase", color: "#8a8a82", marginBottom: 4 }}>{label}</p>
      <div style={{ fontFamily: mono ? "'JetBrains Mono', monospace" : "'Space Grotesk', sans-serif", fontSize: 14, color: "#15201a", lineHeight: 1.5 }}>{value}</div>
    </div>
  );
}

function Chip({ label, color = "#15201a" }: { label: string; color?: string }) {
  return (
    <span style={{
      display: "inline-block", padding: "2px 8px",
      fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: ".12em",
      textTransform: "uppercase", fontWeight: 700,
      border: `1.5px solid ${color}`, color, marginRight: 6, marginBottom: 4,
    }}>{label}</span>
  );
}

export default function BoldnessCheckClient() {
  const [tweet, setTweet]   = useState("");
  const [date, setDate]     = useState(new Date().toISOString().split("T")[0]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ClassifyResult | null>(null);
  const [error, setError]   = useState<string | null>(null);
  const [notATake, setNotATake] = useState(false);

  async function run() {
    if (!tweet.trim()) return;
    setLoading(true);
    setResult(null);
    setError(null);
    setNotATake(false);
    try {
      const res = await fetch("/api/admin/classify-tweet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tweet_text: tweet, mode: "standard", tweet_date: date }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Unknown error"); return; }
      const r: ClassifyResult = data.result;
      if (!r.is_take) { setNotATake(true); setResult(r); return; }
      setResult(r);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: 760, margin: "0 auto", padding: "32px 24px" }}>
      <div style={{ marginBottom: 28 }}>
        <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, letterSpacing: ".2em", textTransform: "uppercase", color: "#8a8a82", marginBottom: 6 }}>Admin · Grading</p>
        <h1 style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 28, letterSpacing: "-.02em", color: "#15201a", lineHeight: 1.1 }}>Boldness Check</h1>
        <p style={{ fontStyle: "italic", fontSize: 14, color: "#8a8a82", marginTop: 6 }}>
          Paste any tweet to see how the classifier would score it — boldness, sport, grading criteria, all fields. Nothing is saved.
        </p>
      </div>

      {/* Input */}
      <div style={{ background: "#fff", border: "2px solid #15201a", padding: "20px 22px", marginBottom: 20 }}>
        <div style={{ marginBottom: 14 }}>
          <label style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: ".16em", textTransform: "uppercase", color: "#8a8a82", display: "block", marginBottom: 6 }}>Tweet text</label>
          <textarea
            value={tweet}
            onChange={e => setTweet(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) run(); }}
            rows={5}
            placeholder="Paste tweet here… (⌘+Enter to run)"
            style={{
              width: "100%", boxSizing: "border-box",
              fontFamily: "'Space Grotesk', sans-serif", fontSize: 15, lineHeight: 1.5,
              border: "1.5px solid #d1d5db", padding: "12px 14px", resize: "vertical",
              outline: "none", color: "#15201a",
            }}
          />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div>
            <label style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: ".16em", textTransform: "uppercase", color: "#8a8a82", display: "block", marginBottom: 4 }}>Tweet date</label>
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              style={{
                fontFamily: "'JetBrains Mono', monospace", fontSize: 12,
                border: "1.5px solid #d1d5db", padding: "7px 10px", color: "#15201a",
              }}
            />
          </div>
          <button
            onClick={run}
            disabled={loading || !tweet.trim()}
            style={{
              marginTop: 18,
              fontFamily: "'JetBrains Mono', monospace", fontWeight: 800,
              fontSize: 12, letterSpacing: ".16em", textTransform: "uppercase",
              padding: "11px 24px", background: loading ? "#6b7280" : "#15201a",
              color: "#fff", border: "2px solid #15201a",
              boxShadow: "4px 4px 0 rgba(21,32,26,.2)",
              cursor: loading ? "not-allowed" : "pointer",
              transition: "transform .1s, box-shadow .1s",
            }}
          >
            {loading ? "Classifying…" : "Run Check ✦"}
          </button>
        </div>
      </div>

      {error && (
        <div style={{ background: "#fff5f5", border: "1.5px solid #e2241a", padding: "12px 16px", marginBottom: 16, fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: "#e2241a" }}>
          Error: {error}
        </div>
      )}

      {/* Not a take banner */}
      {notATake && result && (
        <div style={{ background: "#f5f1e8", border: "2px solid #15201a", padding: "18px 22px", marginBottom: 20 }}>
          <p style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 16, color: "#15201a", marginBottom: 6 }}>
            ✗ NOT A GRADEABLE TAKE
          </p>
          <p style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 14, color: "#3a4239" }}>
            Classifier confidence: {Math.round(result.confidence * 100)}% · Resolution: {result.resolution_condition}
          </p>
          {result.summary && (
            <p style={{ fontStyle: "italic", fontSize: 14, color: "#8a8a82", marginTop: 8 }}>{result.summary}</p>
          )}
        </div>
      )}

      {/* Results */}
      {result && result.is_take && (
        <div style={{ background: "#fff", border: "2px solid #15201a" }}>
          {/* Header */}
          <div style={{ background: "#15201a", padding: "16px 22px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <p style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 14, color: "#fff", letterSpacing: "-.01em" }}>
              ✓ GRADEABLE TAKE
            </p>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, letterSpacing: ".12em", color: "rgba(255,255,255,.6)" }}>
              Confidence: {Math.round(result.confidence * 100)}%
            </span>
          </div>

          <div style={{ padding: "20px 22px" }}>
            {/* Boldness meter — hero */}
            <BoldnessMeter score={result.boldness_score} />

            {/* Summary */}
            {result.summary && (
              <div style={{ background: "#f5f1e8", padding: "14px 16px", marginBottom: 20, fontStyle: "italic", fontSize: 15, color: "#15201a", lineHeight: 1.55 }}>
                &ldquo;{result.summary}&rdquo;
              </div>
            )}

            {/* Fields grid */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 32px" }}>
              <Field label="Sport" value={result.sport} mono />
              <Field label="Season" value={result.season ?? "—"} mono />
              <Field label="Take Type" value={result.take_type} mono />
              <Field label="Subtype" value={result.take_subtype} mono />
              <Field label="Resolution" value={result.resolution_condition} mono />
              <Field label="Time Horizon" value={result.time_horizon ?? "—"} mono />
              <Field label="Confidence Language" value={result.confidence_language} mono />
              <Field label="Fantasy?" value={result.is_fantasy ? "Yes" : "No"} mono />
            </div>

            {result.subjects?.length > 0 && (
              <Field label="Subjects" value={
                <div style={{ marginTop: 2 }}>{result.subjects.map(s => <Chip key={s} label={s} />)}</div>
              } />
            )}

            {result.flags?.length > 0 && (
              <Field label="Flags" value={
                <div style={{ marginTop: 2 }}>{result.flags.map(f => <Chip key={f} label={f} color="#e2241a" />)}</div>
              } />
            )}

            {result.grading_criteria && (
              <Field label="Grading Criteria" value={result.grading_criteria} />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
