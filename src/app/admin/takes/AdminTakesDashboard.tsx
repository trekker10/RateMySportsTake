"use client";

import { useState, useTransition, useEffect } from "react";
import { getAllTakesForAdmin, gradeSingleTake, type AdminTake } from "@/app/actions/grading";
import { saveTakeEdits } from "@/app/actions/takes";
import Link from "next/link";

type TakeState = AdminTake & { gradeStatus: "idle" | "grading" | "done" | "error"; errorMsg?: string };
type Filter = "all" | "pending" | "graded" | "unrated";

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  pending:         { label: "PENDING",       color: "#d97706" },
  confirmed_true:  { label: "RIGHT",         color: "#0a7a3b" },
  confirmed_false: { label: "WRONG",         color: "#e2241a" },
  partially_true:  { label: "PARTLY RIGHT",  color: "#d97706" },
  unresolvable:    { label: "UNRESOLVABLE",  color: "#6b7280" },
};

const OUTCOME_OPTIONS = [
  { value: "pending",          label: "Pending" },
  { value: "confirmed_true",   label: "Right" },
  { value: "confirmed_false",  label: "Wrong" },
  { value: "partially_true",   label: "Partly Right" },
  { value: "unresolvable",     label: "Unresolvable" },
];

const inputClass = "w-full rounded bg-white border border-gray-300 px-2.5 py-1.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-gray-500";

function TakeEditPanel({ take, onSaved }: { take: TakeState; onSaved: (updated: Partial<AdminTake>) => void }) {
  const [summary, setSummary] = useState(take.summary ?? "");
  const [criteria, setCriteria] = useState(take.grading_criteria ?? "");
  const [boldness, setBoldness] = useState<string>(take.boldness_score != null ? String(take.boldness_score) : "");
  const [resDate, setResDate] = useState(take.time_horizon_date ?? "");
  const [grade, setGrade] = useState<string>(take.grade != null ? String(Math.round(take.grade)) : "");
  const [outcome, setOutcome] = useState(take.outcome_status);
  const [notes, setNotes] = useState(take.outcome_notes ?? "");
  const [saved, setSaved] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleSave() {
    startTransition(async () => {
      const edits: Parameters<typeof saveTakeEdits>[1] = {
        summary: summary.trim() || undefined,
        grading_criteria: criteria.trim() || undefined,
        boldness_score: boldness !== "" ? Number(boldness) : null,
        time_horizon_date: resDate || null,
        outcome_status: outcome,
        outcome_notes: notes.trim() || null,
        grade: grade !== "" ? Number(grade) : null,
      };
      const result = await saveTakeEdits(take.take_id, edits);
      if (result.success) {
        setSaved(true);
        onSaved({
          summary: summary.trim() || null,
          grading_criteria: criteria.trim() || null,
          boldness_score: boldness !== "" ? Number(boldness) : null,
          time_horizon_date: resDate || null,
          outcome_status: outcome,
          outcome_notes: notes.trim() || null,
          grade: grade !== "" ? Number(grade) : null,
        });
        setTimeout(() => setSaved(false), 3000);
      }
    });
  }

  return (
    <div className="mt-3 rounded-lg border border-gray-300 bg-white p-4 space-y-4">
      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <label className="block text-[10px] font-mono tracking-wider text-gray-500 mb-1 uppercase">AI Summary</label>
          <textarea
            value={summary}
            onChange={e => setSummary(e.target.value)}
            rows={2}
            className={`${inputClass} resize-none`}
            placeholder="One-sentence summary of the take…"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[10px] font-mono tracking-wider text-gray-500 mb-1 uppercase">Boldness (0–100)</label>
            <input type="number" min={0} max={100} value={boldness} onChange={e => setBoldness(e.target.value)} className={inputClass} placeholder="e.g. 65" />
          </div>
          <div>
            <label className="block text-[10px] font-mono tracking-wider text-gray-500 mb-1 uppercase">Resolution Date</label>
            <input type="date" value={resDate} onChange={e => setResDate(e.target.value)} className={inputClass} />
          </div>
        </div>
      </div>

      <div>
        <label className="block text-[10px] font-mono tracking-wider text-gray-500 mb-1 uppercase">Grading Criteria</label>
        <textarea
          value={criteria}
          onChange={e => setCriteria(e.target.value)}
          rows={3}
          className={`${inputClass} resize-none`}
          placeholder="What would make this take TRUE?"
        />
      </div>

      <div className="border-t border-gray-200 pt-4 grid md:grid-cols-3 gap-3">
        <div>
          <label className="block text-[10px] font-mono tracking-wider text-gray-500 mb-1 uppercase">Outcome</label>
          <select value={outcome} onChange={e => setOutcome(e.target.value)} className={inputClass}>
            {OUTCOME_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-[10px] font-mono tracking-wider text-gray-500 mb-1 uppercase">Grade (0–100)</label>
          <input
            type="number" min={0} max={100}
            value={grade}
            onChange={e => setGrade(e.target.value)}
            className={inputClass}
            placeholder="e.g. 75"
          />
        </div>
        <div>
          <label className="block text-[10px] font-mono tracking-wider text-gray-500 mb-1 uppercase">Outcome Notes</label>
          <input
            type="text"
            value={notes}
            onChange={e => setNotes(e.target.value)}
            className={inputClass}
            placeholder="What actually happened?"
          />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={isPending}
          className="px-4 py-1.5 rounded-lg bg-gray-900 text-white text-xs font-semibold hover:bg-gray-700 transition-colors disabled:opacity-50"
        >
          {isPending ? "Saving…" : "Save changes"}
        </button>
        {saved && <span className="text-xs text-emerald-400">✓ Saved</span>}
      </div>
    </div>
  );
}

export default function AdminTakesDashboard() {
  const [takes, setTakes] = useState<TakeState[] | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [isLoading, startLoad] = useTransition();
  const [gradingAll, setGradingAll] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    startLoad(async () => {
      const all = await getAllTakesForAdmin();
      setTakes(all.map((t) => ({ ...t, gradeStatus: "idle" })));
    });
  }, []);

  function setTakeGradeStatus(takeId: string, gradeStatus: TakeState["gradeStatus"], errorMsg?: string) {
    setTakes((prev) =>
      prev!.map((t) => t.take_id === takeId ? { ...t, gradeStatus, errorMsg } : t)
    );
  }

  function updateTake(takeId: string, updated: Partial<AdminTake>) {
    setTakes((prev) =>
      prev!.map((t) => t.take_id === takeId ? { ...t, ...updated } : t)
    );
  }

  function refreshTake(takeId: string) {
    startLoad(async () => {
      const all = await getAllTakesForAdmin();
      setTakes((prev) =>
        prev!.map((t) => {
          const fresh = all.find((a) => a.take_id === t.take_id);
          if (!fresh) return t;
          return { ...fresh, gradeStatus: t.take_id === takeId ? "done" : t.gradeStatus, errorMsg: t.errorMsg };
        })
      );
    });
  }

  async function gradeOne(takeId: string) {
    setTakeGradeStatus(takeId, "grading");
    const result = await gradeSingleTake(takeId);
    if (result.success) {
      refreshTake(takeId);
    } else {
      setTakeGradeStatus(takeId, "error", result.error);
    }
  }

  async function gradeAllPending() {
    if (!takes) return;
    const eligible = takes.filter(
      (t) => t.outcome_status === "pending" && t.rating_status === "rated" && t.gradeStatus === "idle"
    );
    setGradingAll(true);
    for (const take of eligible) {
      setTakeGradeStatus(take.take_id, "grading");
      const result = await gradeSingleTake(take.take_id);
      if (result.success) {
        refreshTake(take.take_id);
      } else {
        setTakeGradeStatus(take.take_id, "error", result.error);
      }
    }
    setGradingAll(false);
  }

  const allTakes = takes ?? [];
  const filtered = allTakes.filter((t) => {
    if (filter === "pending") return t.outcome_status === "pending";
    if (filter === "graded") return t.outcome_status !== "pending";
    if (filter === "unrated") return t.rating_status !== "rated";
    return true;
  });

  const pendingGradeable = allTakes.filter(
    (t) => t.outcome_status === "pending" && t.rating_status === "rated" && t.gradeStatus === "idle"
  ).length;

  const counts = {
    all: allTakes.length,
    pending: allTakes.filter((t) => t.outcome_status === "pending").length,
    graded: allTakes.filter((t) => t.outcome_status !== "pending").length,
    unrated: allTakes.filter((t) => t.rating_status !== "rated").length,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Takes Review</h1>
          <p className="mt-1 text-gray-500">
            Review all takes and trigger AI grading on any of them.
          </p>
        </div>
        {pendingGradeable > 0 && (
          <button
            onClick={gradeAllPending}
            disabled={gradingAll}
            className="shrink-0 rounded-lg bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-black hover:bg-emerald-400 disabled:opacity-50 transition-colors"
          >
            {gradingAll ? "Grading…" : `Grade all pending (${pendingGradeable})`}
          </button>
        )}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {(["all", "pending", "graded", "unrated"] as Filter[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              filter === f
                ? "bg-gray-900 text-white"
                : "text-gray-500 hover:text-gray-900 border border-gray-300 hover:border-gray-500"
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)} <span className="opacity-60">({counts[f]})</span>
          </button>
        ))}
      </div>

      {isLoading && takes === null && (
        <div className="rounded-xl border border-gray-300 p-8 text-center text-gray-400" style={{ backgroundColor: "#f5f0e6" }}>
          Loading takes…
        </div>
      )}

      {takes !== null && filtered.length === 0 && (
        <div className="rounded-xl border border-gray-300 p-8 text-center text-gray-400" style={{ backgroundColor: "#f5f0e6" }}>
          No takes in this category.
        </div>
      )}

      {filtered.length > 0 && (
        <div className="rounded-xl border border-gray-300 divide-y divide-gray-200" style={{ backgroundColor: "#f5f0e6" }}>
          {filtered.map((take) => {
            const verdict = STATUS_LABEL[take.outcome_status] ?? STATUS_LABEL.pending;
            const isGraded = take.outcome_status !== "pending";
            const isExpanded = expandedId === take.take_id;

            return (
              <div key={take.take_id} className="px-5 py-4">
                {/* Row header */}
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Link
                        href={`/experts/${take.expert_id}`}
                        className="font-semibold text-gray-900 hover:text-black text-sm"
                      >
                        {take.expert_name}
                      </Link>
                      <span className="text-gray-400 text-xs">·</span>
                      <span className="text-gray-500 text-xs">{take.date_made}</span>
                      {take.time_horizon_date && (
                        <>
                          <span className="text-gray-400 text-xs">·</span>
                          <span className="text-gray-500 text-xs">resolves {take.time_horizon_date}</span>
                        </>
                      )}
                      {take.boldness_score != null && (
                        <span className="text-gray-500 text-xs">· B={take.boldness_score}</span>
                      )}
                      {take.rating_status !== "rated" && (
                        <span className="rounded px-1.5 py-0.5 text-[10px] font-mono bg-amber-900/40 text-amber-400 border border-amber-800">
                          NOT RATED YET
                        </span>
                      )}
                    </div>

                    <p className="mt-1.5 text-sm text-gray-700 leading-relaxed line-clamp-2">
                      "{take.summary ?? take.raw_text}"
                    </p>

                    {isGraded && take.outcome_notes && (
                      <p className="mt-1 text-xs text-gray-500 italic">{take.outcome_notes}</p>
                    )}
                  </div>

                  {/* Right side */}
                  <div className="shrink-0 flex flex-col items-end gap-2">
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-xs font-bold" style={{ color: verdict.color }}>
                        {verdict.label}
                      </span>
                      {take.grade != null && (
                        <span className="font-black text-lg leading-none" style={{ color: take.grade >= 60 ? "#0a7a3b" : "#e2241a" }}>
                          {Math.round(take.grade)}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Edit toggle */}
                      <button
                        onClick={() => setExpandedId(isExpanded ? null : take.take_id)}
                        className={`rounded-lg border px-3 py-1 text-xs transition-colors ${
                          isExpanded
                            ? "border-gray-600 text-gray-900 bg-gray-100"
                            : "border-gray-300 text-gray-500 hover:border-gray-500 hover:text-gray-800"
                        }`}
                      >
                        {isExpanded ? "Close" : "Edit"}
                      </button>

                      {/* Grade button */}
                      {take.gradeStatus === "idle" && take.rating_status === "rated" && (
                        <button
                          onClick={() => gradeOne(take.take_id)}
                          className="rounded-lg border border-zinc-700 px-3 py-1 text-xs text-zinc-300 hover:border-zinc-500 hover:text-zinc-100 transition-colors"
                        >
                          {isGraded ? "Re-grade" : "Grade it"}
                        </button>
                      )}
                      {take.gradeStatus === "grading" && (
                        <span className="text-xs text-gray-400 animate-pulse">Searching web…</span>
                      )}
                      {take.gradeStatus === "done" && (
                        <span className="text-xs text-emerald-400">✓ Done</span>
                      )}
                      {take.gradeStatus === "error" && (
                        <span className="text-xs text-red-400" title={take.errorMsg}>Failed</span>
                      )}
                    </div>
                  </div>
                </div>

                {take.gradeStatus === "error" && take.errorMsg && (
                  <p className="text-xs text-red-400 mt-1">{take.errorMsg}</p>
                )}

                {/* Inline edit panel */}
                {isExpanded && (
                  <TakeEditPanel
                    take={take}
                    onSaved={(updated) => updateTake(take.take_id, updated)}
                  />
                )}
              </div>
            );
          })}
        </div>
      )}

      <Link href="/admin" className="inline-block text-sm text-gray-500 hover:text-gray-800 transition-colors">
        ← Back to Admin
      </Link>
    </div>
  );
}
