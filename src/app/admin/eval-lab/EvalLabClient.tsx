"use client";

import { useState, useEffect, useCallback } from "react";

type Mode = "fantasy" | "standard";
type Label = "yes" | "no" | "gray";

interface ClassifierResult {
  // fantasy fields
  is_fantasy_take?: boolean;
  content_type?: string;
  player_name?: string | null;
  player_position?: string | null;
  format?: string;
  timing_window?: string;
  // standard fields
  is_take?: boolean;
  subjects?: string[];
  take_type?: string;
  take_subtype?: string;
  difficulty_score?: number;
  confidence_language?: string;
  time_horizon?: string | null;
  flags?: string[];
  // shared
  confidence?: number;
  category?: string | null;
  boldness_score?: number | null;
  grading_criteria?: string | null;
  summary?: string | null;
  season?: string | null;
}

interface EvalRow {
  id: string;
  tweet_text: string;
  your_label: Label;
  why: string | null;
  created_at: string;
}

const LABEL_STYLES: Record<Label, { bg: string; text: string; border: string }> = {
  yes:  { bg: "#dcfce7", text: "#166534", border: "#86efac" },
  no:   { bg: "#fee2e2", text: "#991b1b", border: "#fca5a5" },
  gray: { bg: "#f3f4f6", text: "#374151", border: "#d1d5db" },
};

function LabelBadge({ label }: { label: Label }) {
  const s = LABEL_STYLES[label];
  return (
    <span
      className="rounded-full px-2 py-0.5 text-[11px] font-bold uppercase"
      style={{ backgroundColor: s.bg, color: s.text, border: `1px solid ${s.border}` }}
    >
      {label}
    </span>
  );
}

function ResultRow({ label, value }: { label: string; value: React.ReactNode }) {
  if (value === null || value === undefined || value === "") return null;
  return (
    <div className="flex gap-2 text-sm">
      <span className="font-mono text-[10px] tracking-wider text-gray-400 uppercase w-32 shrink-0 pt-0.5">{label}</span>
      <span className="text-gray-800">{value}</span>
    </div>
  );
}

export default function EvalLabClient() {
  const [mode, setMode] = useState<Mode>("fantasy");
  const [tweet, setTweet] = useState("");
  const [classifying, setClassifying] = useState(false);
  const [result, setResult] = useState<ClassifierResult | null>(null);
  const [classifyError, setClassifyError] = useState<string | null>(null);

  const [label, setLabel] = useState<Label | null>(null);
  const [why, setWhy] = useState("");
  const [saving, setSaving] = useState(false);
  const [savedToast, setSavedToast] = useState(false);

  const [rows, setRows] = useState<EvalRow[]>([]);
  const [loadingRows, setLoadingRows] = useState(false);

  // ── Fetch saved rows ─────────────────────────────────────────────────────
  const fetchRows = useCallback(async () => {
    setLoadingRows(true);
    try {
      const res = await fetch(`/api/admin/eval-labels?mode=${mode}`);
      const data = await res.json();
      setRows(data.rows ?? []);
    } catch {
      // ignore
    } finally {
      setLoadingRows(false);
    }
  }, [mode]);

  useEffect(() => {
    fetchRows();
    // Reset classifier state when switching mode
    setResult(null);
    setClassifyError(null);
    setLabel(null);
    setWhy("");
  }, [mode, fetchRows]);

  // ── Classify ─────────────────────────────────────────────────────────────
  async function handleClassify() {
    if (!tweet.trim()) return;
    setClassifying(true);
    setResult(null);
    setClassifyError(null);
    setLabel(null);

    try {
      const res = await fetch("/api/admin/classify-tweet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tweet_text: tweet, mode }),
      });
      const data = await res.json();
      if (data.error) { setClassifyError(data.error); return; }
      setResult(data.result);

      // Pre-select label based on classifier output
      const isTake = mode === "fantasy" ? data.result?.is_fantasy_take : data.result?.is_take;
      if (isTake === true) setLabel("yes");
      else if (isTake === false) setLabel("no");
      else setLabel(null);
    } catch (e) {
      setClassifyError(String(e));
    } finally {
      setClassifying(false);
    }
  }

  // ── Save ─────────────────────────────────────────────────────────────────
  async function handleSave() {
    if (!tweet.trim() || !label) return;
    setSaving(true);
    try {
      const res = await fetch("/api/admin/eval-label", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tweet_text: tweet, your_label: label, why, classifier_result: result, mode }),
      });
      const data = await res.json();
      if (data.ok) {
        // Reset for next tweet
        setTweet("");
        setResult(null);
        setLabel(null);
        setWhy("");
        setClassifyError(null);
        setSavedToast(true);
        setTimeout(() => setSavedToast(false), 2500);
        fetchRows();
      }
    } finally {
      setSaving(false);
    }
  }

  // ── Delete ────────────────────────────────────────────────────────────────
  async function handleDelete(id: string) {
    if (!confirm("Delete this eval example?")) return;
    await fetch("/api/admin/eval-labels", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, mode }),
    });
    fetchRows();
  }

  // ── Derived display values ────────────────────────────────────────────────
  const isTake = result
    ? mode === "fantasy" ? result.is_fantasy_take : result.is_take
    : null;

  const classifierLabelBadge = isTake === true
    ? <span className="rounded-full px-2.5 py-0.5 text-xs font-bold bg-green-100 text-green-700 border border-green-300">YES — Take</span>
    : isTake === false
    ? <span className="rounded-full px-2.5 py-0.5 text-xs font-bold bg-red-100 text-red-700 border border-red-300">NO — Not a Take</span>
    : null;

  return (
    <div className="max-w-3xl space-y-8">
      {/* ── Header ── */}
      <div>
        <p className="font-mono text-[11px] tracking-[0.22em] text-gray-400 uppercase">Admin · Tools</p>
        <h1 className="text-3xl font-black tracking-tight mt-1">Eval Lab</h1>
        <p className="text-sm text-gray-500 mt-1">Label tweets for classifier training. Each save adds to the eval dataset.</p>
      </div>

      {/* ── Mode toggle ── */}
      <div className="flex border-2 border-gray-900 overflow-hidden w-fit">
        {(["fantasy", "standard"] as Mode[]).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`px-5 py-2 font-mono text-[11px] tracking-widest uppercase font-black transition-colors ${
              mode === m ? "bg-gray-900 text-white" : "bg-white text-gray-500 hover:text-gray-900"
            } ${m === "standard" ? "border-l-2 border-gray-900" : ""}`}
          >
            {m === "fantasy" ? "🏈 Fantasy Takes" : "📊 Standard Takes"}
          </button>
        ))}
      </div>

      {/* ── Tweet input ── */}
      <div className="space-y-3">
        <label className="block text-[10px] font-mono tracking-wider text-gray-500 uppercase">Paste tweet text</label>
        <textarea
          value={tweet}
          onChange={e => setTweet(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleClassify(); }}
          rows={4}
          placeholder="Paste tweet here… (⌘+Enter to classify)"
          className="w-full rounded-lg border-2 border-gray-200 focus:border-gray-900 px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none resize-none transition-colors"
        />
        <button
          onClick={handleClassify}
          disabled={classifying || !tweet.trim()}
          className="px-5 py-2 bg-gray-900 text-white text-sm font-bold rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {classifying ? "Classifying…" : "Classify ✦"}
        </button>
        {classifyError && (
          <p className="text-xs text-red-500">Error: {classifyError}</p>
        )}
      </div>

      {/* ── Classifier result ── */}
      {result && (
        <div className="rounded-xl border-2 border-gray-200 bg-gray-50 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-[10px] font-mono tracking-widest text-gray-400 uppercase">Classifier Result</h2>
            {classifierLabelBadge}
          </div>

          <div className="space-y-2">
            <ResultRow label="Confidence" value={result.confidence != null ? `${(result.confidence * 100).toFixed(0)}%` : null} />
            <ResultRow label="Summary" value={result.summary} />
            <ResultRow label="Category" value={result.category} />
            {mode === "fantasy" ? (
              <>
                <ResultRow label="Player" value={result.player_name ? `${result.player_name}${result.player_position ? ` (${result.player_position})` : ""}` : null} />
                <ResultRow label="Format" value={result.format} />
                <ResultRow label="Timing" value={result.timing_window} />
                <ResultRow label="Content Type" value={result.content_type} />
              </>
            ) : (
              <>
                <ResultRow label="Subjects" value={result.subjects?.length ? result.subjects.join(", ") : null} />
                <ResultRow label="Take Type" value={result.take_subtype ?? result.take_type} />
                <ResultRow label="Time Horizon" value={result.time_horizon} />
                <ResultRow label="Confidence Lang" value={result.confidence_language} />
                <ResultRow label="Flags" value={result.flags?.length ? result.flags.join(", ") : null} />
              </>
            )}
            <ResultRow label="Boldness" value={result.boldness_score != null ? String(result.boldness_score) : (result.difficulty_score != null ? `${result.difficulty_score}/10` : null)} />
            <ResultRow label="Season" value={result.season} />
            {result.grading_criteria && (
              <div className="flex gap-2 text-sm">
                <span className="font-mono text-[10px] tracking-wider text-gray-400 uppercase w-32 shrink-0 pt-0.5">Grading Criteria</span>
                <span className="text-gray-700 text-xs leading-relaxed">{result.grading_criteria}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Your label ── */}
      {result && (
        <div className="space-y-4">
          <h2 className="text-[10px] font-mono tracking-widest text-gray-400 uppercase">Your Label</h2>

          {/* YES / NO / GRAY buttons */}
          <div className="flex gap-2">
            {(["yes", "no", "gray"] as Label[]).map((l) => {
              const s = LABEL_STYLES[l];
              const active = label === l;
              return (
                <button
                  key={l}
                  onClick={() => setLabel(l)}
                  className={`px-6 py-2.5 rounded-lg font-black text-sm tracking-wider uppercase border-2 transition-all ${
                    active ? "scale-105 shadow-sm" : "opacity-50 hover:opacity-80"
                  }`}
                  style={active
                    ? { backgroundColor: s.bg, color: s.text, borderColor: s.border }
                    : { backgroundColor: "#f9fafb", color: "#6b7280", borderColor: "#e5e7eb" }
                  }
                >
                  {l === "yes" ? "✓ YES" : l === "no" ? "✗ NO" : "~ GRAY"}
                </button>
              );
            })}
          </div>

          {/* Why textarea */}
          <div className="space-y-1.5">
            <label className="block text-[10px] font-mono tracking-wider text-gray-500 uppercase">Why <span className="text-gray-400 normal-case font-normal">(optional but useful)</span></label>
            <textarea
              value={why}
              onChange={e => setWhy(e.target.value)}
              rows={2}
              placeholder="e.g. Sarcasm, no real prediction / Thread teaser, players in replies / Clear falsifiable claim about player X"
              className="w-full rounded-lg border border-gray-300 focus:border-gray-600 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none resize-none transition-colors"
            />
          </div>

          {/* Save button + toast */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleSave}
              disabled={saving || !label}
              className="px-5 py-2 bg-gray-900 text-white text-sm font-bold rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {saving ? "Saving…" : "Save to Eval Dataset"}
            </button>
            {savedToast && (
              <span className="text-sm font-semibold text-emerald-600 animate-pulse">✓ Saved!</span>
            )}
          </div>
        </div>
      )}

      {/* ── Saved examples table ── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-[10px] font-mono tracking-widest text-gray-400 uppercase">
            Last 20 — {mode === "fantasy" ? "Fantasy" : "Standard"} Eval Dataset
          </h2>
          <span className="text-xs text-gray-400">{rows.length} rows</span>
        </div>

        {loadingRows && <p className="text-xs text-gray-400">Loading…</p>}

        {!loadingRows && rows.length === 0 && (
          <div className="rounded-xl border border-dashed border-gray-300 p-8 text-center text-gray-400 text-sm">
            No labeled examples yet. Classify and save a tweet to get started.
          </div>
        )}

        {rows.length > 0 && (
          <div className="rounded-xl border border-gray-200 overflow-hidden divide-y divide-gray-100">
            {rows.map((row) => (
              <div key={row.id} className="flex items-start gap-3 px-4 py-3 hover:bg-gray-50 transition-colors">
                <LabelBadge label={row.your_label} />
                <div className="flex-1 min-w-0 space-y-0.5">
                  <p className="text-sm text-gray-800 truncate">
                    &ldquo;{row.tweet_text.length > 100 ? row.tweet_text.slice(0, 100) + "…" : row.tweet_text}&rdquo;
                  </p>
                  {row.why && <p className="text-xs text-gray-400 italic">{row.why}</p>}
                </div>
                <div className="shrink-0 flex items-center gap-3">
                  <span className="text-[10px] text-gray-400 font-mono whitespace-nowrap">
                    {new Date(row.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </span>
                  <button
                    onClick={() => handleDelete(row.id)}
                    className="text-gray-300 hover:text-red-500 transition-colors text-sm"
                    title="Delete"
                  >
                    🗑
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
