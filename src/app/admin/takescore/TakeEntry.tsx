"use client";

import { useState, useTransition, useEffect } from "react";
import { submitAdminTake, gradeAdminTake, getPendingAdminTakes } from "@/app/actions/takescore";

type View = "new" | "grade";

const ACCURACY_OPTIONS = [
  { value: 100, label: "100 — Nailed it. Correct and specific." },
  { value: 75,  label: "75 — Mostly right. Core prediction held up." },
  { value: 50,  label: "50 — Half right. Partially correct." },
  { value: 25,  label: "25 — Mostly wrong. Some element was right." },
  { value: 0,   label: "0 — Completely wrong." },
];

const OUTCOME_OPTIONS = [
  { value: "confirmed_true",  label: "Confirmed True" },
  { value: "confirmed_false", label: "Confirmed False" },
  { value: "partially_true",  label: "Partially True" },
  { value: "unresolvable",    label: "Unresolvable" },
];

const BOLDNESS_TOOLTIP = `0–9: Obvious take (60%+ implied probability)
10–39: Late-season favorite (35–60%)
40–69: Midseason contender (15–35%)
70–89: Midseason longshot (5–15%)
90–100: Preseason/longshot (under 5%)`;

export default function TakeEntry() {
  const [view, setView] = useState<View>("new");
  const [experts, setExperts] = useState<Array<{ expert_id: string; name: string }>>([]);
  const [pendingTakes, setPendingTakes] = useState<Awaited<ReturnType<typeof getPendingAdminTakes>>>([]);
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // New take form state
  const [form, setForm] = useState({
    expert_id: "",
    raw_text: "",
    date_made: new Date().toISOString().split("T")[0],
    boldness_score: 50,
    sport: "",
    predicted_outcome: "",
    time_horizon_date: "",
    source_url: "",
  });

  // Grading state per take
  const [grades, setGrades] = useState<Record<string, { accuracy: number; outcome: string; notes: string }>>({});

  useEffect(() => {
    async function load() {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      const { data } = await supabase.from("experts").select("expert_id, name").order("name");
      setExperts(data ?? []);
      const pending = await getPendingAdminTakes();
      setPendingTakes(pending);
    }
    load();
  }, []);

  function handleFormChange(key: string, value: string | number) {
    setForm(prev => ({ ...prev, [key]: value }));
  }

  function handleSubmitNew() {
    if (!form.expert_id || !form.raw_text || !form.predicted_outcome) {
      setMessage({ type: "error", text: "Analyst, take text, and predicted outcome are required." });
      return;
    }
    startTransition(async () => {
      const result = await submitAdminTake({ ...form, boldness_score: Number(form.boldness_score) });
      if (result.success) {
        setMessage({ type: "success", text: "Take submitted." });
        setForm(prev => ({ ...prev, raw_text: "", predicted_outcome: "", source_url: "", time_horizon_date: "" }));
      } else {
        setMessage({ type: "error", text: result.error ?? "Failed." });
      }
    });
  }

  function handleGrade(takeId: string) {
    const g = grades[takeId];
    if (!g) return;
    startTransition(async () => {
      const result = await gradeAdminTake(takeId, g.accuracy, g.outcome, g.notes);
      if (result.success) {
        setPendingTakes(prev => prev.filter(t => t.take_id !== takeId));
        setMessage({ type: "success", text: "Take graded." });
      } else {
        setMessage({ type: "error", text: result.error ?? "Failed." });
      }
    });
  }

  return (
    <div className="space-y-5">
      {/* View toggle */}
      <div className="flex gap-2">
        {([["new", "Enter New Take"], ["grade", `Grade Pending (${pendingTakes.length})`]] as const).map(([v, label]) => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              view === v ? "bg-zinc-100 text-zinc-900" : "border border-zinc-700 text-zinc-400 hover:text-zinc-200"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {message && (
        <p className={`text-sm ${message.type === "success" ? "text-emerald-400" : "text-red-400"}`}>
          {message.text}
        </p>
      )}

      {/* ── New take form ── */}
      {view === "new" && (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5 space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-zinc-400 mb-1">Analyst *</label>
              <select
                value={form.expert_id}
                onChange={e => handleFormChange("expert_id", e.target.value)}
                className="w-full rounded bg-zinc-800 border border-zinc-700 px-3 py-2 text-sm text-zinc-100 focus:outline-none"
              >
                <option value="">Select analyst…</option>
                {experts.map(e => <option key={e.expert_id} value={e.expert_id}>{e.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-zinc-400 mb-1">Date of Take *</label>
              <input
                type="date"
                value={form.date_made}
                onChange={e => handleFormChange("date_made", e.target.value)}
                className="w-full rounded bg-zinc-800 border border-zinc-700 px-3 py-2 text-sm text-zinc-100 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs text-zinc-400 mb-1">Take Text *</label>
            <textarea
              value={form.raw_text}
              onChange={e => handleFormChange("raw_text", e.target.value)}
              rows={3}
              className="w-full rounded bg-zinc-800 border border-zinc-700 px-3 py-2 text-sm text-zinc-100 focus:outline-none resize-none"
              placeholder="The analyst's exact words…"
            />
          </div>

          <div>
            <label className="block text-xs text-zinc-400 mb-1">Predicted Outcome / Grading Criteria *</label>
            <input
              type="text"
              value={form.predicted_outcome}
              onChange={e => handleFormChange("predicted_outcome", e.target.value)}
              className="w-full rounded bg-zinc-800 border border-zinc-700 px-3 py-2 text-sm text-zinc-100 focus:outline-none"
              placeholder="What would need to be true for this to be correct?"
            />
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs text-zinc-400 mb-1" title={BOLDNESS_TOOLTIP}>
                Boldness Score (0–100) ⓘ
              </label>
              <input
                type="number"
                min={0} max={100}
                value={form.boldness_score}
                onChange={e => handleFormChange("boldness_score", Number(e.target.value))}
                className="w-full rounded bg-zinc-800 border border-zinc-700 px-3 py-2 text-sm text-zinc-100 focus:outline-none"
              />
              <p className="mt-1 text-[10px] text-zinc-600 whitespace-pre-line">{BOLDNESS_TOOLTIP}</p>
            </div>
            <div>
              <label className="block text-xs text-zinc-400 mb-1">Sport / League</label>
              <input
                type="text"
                value={form.sport}
                onChange={e => handleFormChange("sport", e.target.value)}
                className="w-full rounded bg-zinc-800 border border-zinc-700 px-3 py-2 text-sm text-zinc-100 focus:outline-none"
                placeholder="NBA, NFL, MLB…"
              />
            </div>
            <div>
              <label className="block text-xs text-zinc-400 mb-1">Resolution Date (optional)</label>
              <input
                type="date"
                value={form.time_horizon_date}
                onChange={e => handleFormChange("time_horizon_date", e.target.value)}
                className="w-full rounded bg-zinc-800 border border-zinc-700 px-3 py-2 text-sm text-zinc-100 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs text-zinc-400 mb-1">Source URL (optional)</label>
            <input
              type="url"
              value={form.source_url}
              onChange={e => handleFormChange("source_url", e.target.value)}
              className="w-full rounded bg-zinc-800 border border-zinc-700 px-3 py-2 text-sm text-zinc-100 focus:outline-none"
              placeholder="https://…"
            />
          </div>

          <button
            onClick={handleSubmitNew}
            disabled={isPending}
            className="px-5 py-2.5 rounded-lg bg-white text-black text-sm font-semibold hover:bg-zinc-200 transition-colors disabled:opacity-50"
          >
            {isPending ? "Submitting…" : "Submit Take"}
          </button>
        </div>
      )}

      {/* ── Grade pending ── */}
      {view === "grade" && (
        <div className="space-y-3">
          {pendingTakes.length === 0 && (
            <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-8 text-center text-zinc-500">
              No takes are past their resolution date.
            </div>
          )}
          {pendingTakes.map(take => {
            const g = grades[take.take_id] ?? { accuracy: 75, outcome: "confirmed_true", notes: "" };
            return (
              <div key={take.take_id} className="rounded-xl border border-zinc-800 bg-zinc-900 p-5 space-y-3">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-semibold text-zinc-100 text-sm">{take.expert_name}</p>
                    <p className="text-xs text-zinc-500 mt-0.5">
                      {take.sport && <span>{take.sport} · </span>}
                      Made {take.date_made}
                      {take.time_horizon_date && <span> · Resolved {take.time_horizon_date}</span>}
                      {take.boldness_score != null && <span> · B={take.boldness_score}</span>}
                    </p>
                  </div>
                </div>

                <p className="text-sm text-zinc-300 italic">"{take.raw_text}"</p>
                {take.grading_criteria && (
                  <p className="text-xs text-zinc-500">Criteria: {take.grading_criteria}</p>
                )}

                <div className="grid md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs text-zinc-400 mb-1">Accuracy Score (A)</label>
                    <select
                      value={g.accuracy}
                      onChange={e => setGrades(prev => ({ ...prev, [take.take_id]: { ...g, accuracy: Number(e.target.value) } }))}
                      className="w-full rounded bg-zinc-800 border border-zinc-700 px-2 py-1.5 text-sm text-zinc-100 focus:outline-none"
                    >
                      {ACCURACY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-zinc-400 mb-1">Outcome</label>
                    <select
                      value={g.outcome}
                      onChange={e => setGrades(prev => ({ ...prev, [take.take_id]: { ...g, outcome: e.target.value } }))}
                      className="w-full rounded bg-zinc-800 border border-zinc-700 px-2 py-1.5 text-sm text-zinc-100 focus:outline-none"
                    >
                      {OUTCOME_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-zinc-400 mb-1">Outcome Notes</label>
                    <input
                      type="text"
                      value={g.notes}
                      onChange={e => setGrades(prev => ({ ...prev, [take.take_id]: { ...g, notes: e.target.value } }))}
                      className="w-full rounded bg-zinc-800 border border-zinc-700 px-2 py-1.5 text-sm text-zinc-100 focus:outline-none"
                      placeholder="What happened?"
                    />
                  </div>
                </div>

                <button
                  onClick={() => handleGrade(take.take_id)}
                  disabled={isPending}
                  className="px-4 py-1.5 rounded-lg bg-emerald-500 text-black text-sm font-semibold hover:bg-emerald-400 transition-colors disabled:opacity-50"
                >
                  {isPending ? "Saving…" : "Grade It"}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
