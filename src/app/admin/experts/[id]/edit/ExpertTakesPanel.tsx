"use client";

import { useState, useTransition, useEffect } from "react";
import { getTakesForExpert, gradeSingleTake, type AdminTake } from "@/app/actions/grading";
import { saveTakeEdits, rateSingleTake, deleteTake } from "@/app/actions/takes";
import { checkDuplicateTakes, type DuplicateGroup, type DuplicateTake } from "@/app/actions/duplicate-takes";

type TakeState = AdminTake & {
  gradeStatus: "idle" | "grading" | "done" | "error";
  rateStatus: "idle" | "rating" | "done" | "error";
  errorMsg?: string;
};

type Filter = "all" | "pending" | "graded" | "unrated" | "no_date";

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  pending:         { label: "PENDING",      color: "#d97706" },
  confirmed_true:  { label: "RIGHT",        color: "#0a7a3b" },
  confirmed_false: { label: "WRONG",        color: "#e2241a" },
  partially_true:  { label: "PARTLY RIGHT", color: "#d97706" },
  unresolvable:    { label: "UNRESOLVABLE", color: "#6b7280" },
};

const OUTCOME_OPTIONS = [
  { value: "pending",         label: "Pending" },
  { value: "confirmed_true",  label: "Right" },
  { value: "confirmed_false", label: "Wrong" },
  { value: "partially_true",  label: "Partly Right" },
  { value: "unresolvable",    label: "Unresolvable" },
];

const inputClass =
  "w-full rounded bg-white border border-gray-300 px-2.5 py-1.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-gray-500";

function ResolveBadge({ date }: { date: string }) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(date + "T00:00:00");
  const diffDays = Math.round((d.getTime() - today.getTime()) / 86400000);
  let bg = "#e5e7eb", fg = "#4b5563", prefix = "Resolves";
  if (diffDays < 0)       { bg = "#fef2f2"; fg = "#b91c1c"; prefix = "Overdue"; }
  else if (diffDays === 0){ bg = "#fff7ed"; fg = "#c2410c"; prefix = "Today"; }
  else if (diffDays <= 30){ bg = "#fffbeb"; fg = "#b45309"; prefix = "Soon"; }
  const label = d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: diffDays < -300 || diffDays > 300 ? "numeric" : undefined });
  return (
    <span className="rounded-full px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap" style={{ backgroundColor: bg, color: fg }}>
      {prefix} {label}
    </span>
  );
}

function TakeEditPanel({ take, onSaved }: { take: TakeState; onSaved: (updated: Partial<AdminTake>) => void }) {
  const [summary, setSummary]   = useState(take.summary ?? "");
  const [criteria, setCriteria] = useState(take.grading_criteria ?? "");
  const [boldness, setBoldness] = useState<string>(take.boldness_score != null ? String(take.boldness_score) : "");
  const [resDate, setResDate]   = useState(take.time_horizon_date ?? "");
  const [grade, setGrade]       = useState<string>(take.grade != null ? String(Math.round(take.grade)) : "");
  const [outcome, setOutcome]   = useState(take.outcome_status);
  const [notes, setNotes]       = useState(take.outcome_notes ?? "");
  const [saved, setSaved]       = useState(false);
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
          <textarea value={summary} onChange={e => setSummary(e.target.value)} rows={2} className={`${inputClass} resize-none`} placeholder="One-sentence summary…" />
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
        <textarea value={criteria} onChange={e => setCriteria(e.target.value)} rows={3} className={`${inputClass} resize-none`} placeholder="What would make this take TRUE?" />
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
          <input type="number" min={0} max={100} value={grade} onChange={e => setGrade(e.target.value)} className={inputClass} placeholder="e.g. 75" />
        </div>
        <div>
          <label className="block text-[10px] font-mono tracking-wider text-gray-500 mb-1 uppercase">Outcome Notes</label>
          <input type="text" value={notes} onChange={e => setNotes(e.target.value)} className={inputClass} placeholder="What actually happened?" />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button onClick={handleSave} disabled={isPending} className="px-4 py-1.5 rounded-lg bg-gray-900 text-white text-xs font-semibold hover:bg-gray-700 transition-colors disabled:opacity-50">
          {isPending ? "Saving…" : "Save changes"}
        </button>
        {saved && <span className="text-xs text-emerald-500">✓ Saved</span>}
      </div>
    </div>
  );
}

export default function ExpertTakesPanel({ expertId }: { expertId: string }) {
  const [takes, setTakes]       = useState<TakeState[] | null>(null);
  const [filter, setFilter]     = useState<Filter>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [, startLoad]           = useTransition();
  const [dupeStatus, setDupeStatus] = useState<"idle" | "checking" | "done" | "error">("idle");
  const [dupeGroups, setDupeGroups] = useState<DuplicateGroup[]>([]);
  const [dupeError, setDupeError]   = useState<string>("");

  useEffect(() => {
    startLoad(async () => {
      const all = await getTakesForExpert(expertId);
      setTakes(all.map(t => ({ ...t, gradeStatus: "idle", rateStatus: "idle" })));
    });
  }, [expertId]);

  function updateTake(takeId: string, updated: Partial<AdminTake>) {
    setTakes(prev => prev!.map(t => t.take_id === takeId ? { ...t, ...updated } : t));
  }

  function refreshTake(takeId: string) {
    startLoad(async () => {
      const all = await getTakesForExpert(expertId);
      setTakes(prev => prev!.map(t => {
        const fresh = all.find(a => a.take_id === t.take_id);
        if (!fresh) return t;
        return { ...fresh, gradeStatus: t.take_id === takeId ? "done" : t.gradeStatus, rateStatus: t.rateStatus, errorMsg: t.errorMsg };
      }));
    });
  }

  async function rateOne(takeId: string) {
    setTakes(prev => prev!.map(t => t.take_id === takeId ? { ...t, rateStatus: "rating" } : t));
    const result = await rateSingleTake(takeId);
    if (result.success) {
      refreshTake(takeId);
      setTakes(prev => prev!.map(t => t.take_id === takeId ? { ...t, rateStatus: "done" } : t));
    } else {
      setTakes(prev => prev!.map(t => t.take_id === takeId ? { ...t, rateStatus: "error", errorMsg: result.error } : t));
    }
  }

  async function gradeOne(takeId: string) {
    setTakes(prev => prev!.map(t => t.take_id === takeId ? { ...t, gradeStatus: "grading" } : t));
    const result = await gradeSingleTake(takeId);
    if (result.success) refreshTake(takeId);
    else setTakes(prev => prev!.map(t => t.take_id === takeId ? { ...t, gradeStatus: "error", errorMsg: result.error } : t));
  }

  async function deleteOne(takeId: string) {
    if (!confirm("Delete this take permanently? This cannot be undone.")) return;
    const result = await deleteTake(takeId);
    if (result.success) {
      setTakes(prev => prev!.filter(t => t.take_id !== takeId));
      if (expandedId === takeId) setExpandedId(null);
    } else {
      alert(`Delete failed: ${result.error}`);
    }
  }

  async function runDupeCheck() {
    setDupeStatus("checking");
    setDupeGroups([]);
    const result = await checkDuplicateTakes(expertId);
    if (result.success) {
      setDupeGroups(result.groups ?? []);
      setDupeStatus("done");
    } else {
      setDupeError(result.error ?? "Unknown error");
      setDupeStatus("error");
    }
  }

  function dismissDupeGroup(index: number) {
    setDupeGroups(prev => prev.filter((_, i) => i !== index));
  }

  async function deleteDupeTake(takeId: string, groupIndex: number) {
    if (!confirm("Delete this take permanently?")) return;
    const result = await deleteTake(takeId);
    if (result.success) {
      setTakes(prev => prev!.filter(t => t.take_id !== takeId));
      setDupeGroups(prev => {
        const updated = [...prev];
        updated[groupIndex] = {
          ...updated[groupIndex],
          takes: updated[groupIndex].takes.filter(t => t.take_id !== takeId),
        };
        // Remove group if only 1 take left
        return updated.filter(g => g.takes.length > 1);
      });
    }
  }

  const allTakes = takes ?? [];
  const filtered = allTakes.filter(t => {
    if (filter === "pending") return t.outcome_status === "pending";
    if (filter === "graded")  return t.outcome_status !== "pending";
    if (filter === "unrated") return t.rating_status !== "rated";
    if (filter === "no_date") return t.outcome_status === "pending" && !t.time_horizon_date;
    return true;
  });

  const counts = {
    all:     allTakes.length,
    pending: allTakes.filter(t => t.outcome_status === "pending").length,
    graded:  allTakes.filter(t => t.outcome_status !== "pending").length,
    unrated: allTakes.filter(t => t.rating_status !== "rated").length,
    no_date: allTakes.filter(t => t.outcome_status === "pending" && !t.time_horizon_date).length,
  };

  return (
    <div className="space-y-4">
      {/* Check for duplicates */}
      <div className="flex items-center gap-3">
        <button
          onClick={runDupeCheck}
          disabled={dupeStatus === "checking" || takes === null}
          className="rounded-lg border border-purple-300 text-purple-700 hover:border-purple-500 hover:bg-purple-50 px-4 py-1.5 text-xs font-semibold transition-colors disabled:opacity-50"
        >
          {dupeStatus === "checking" ? "Checking…" : "🔍 Check for duplicates"}
        </button>
        {dupeStatus === "done" && dupeGroups.length === 0 && (
          <span className="text-xs text-emerald-600">✓ No duplicates found</span>
        )}
        {dupeStatus === "error" && (
          <span className="text-xs text-red-500">Error: {dupeError}</span>
        )}
      </div>

      {/* Duplicate groups panel */}
      {dupeGroups.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs font-mono text-purple-700 uppercase tracking-wider">
            ⚠ {dupeGroups.length} duplicate group{dupeGroups.length > 1 ? "s" : ""} found — review and delete as needed
          </p>
          {dupeGroups.map((group, gi) => (
            <div key={gi} className="rounded-xl border-2 border-purple-300 bg-purple-50 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-purple-800">
                  {group.reason === "same_url" ? "🔗 Same source URL" : "🤖 Semantically similar"}
                  {group.reason === "same_url" && (
                    <span className="ml-2 font-normal text-purple-600 break-all">{group.label.replace("Same source URL: ", "")}</span>
                  )}
                </span>
                <button
                  onClick={() => dismissDupeGroup(gi)}
                  className="text-xs text-purple-500 hover:text-purple-800 underline"
                >
                  Dismiss
                </button>
              </div>
              <div className="space-y-2">
                {group.takes.map(t => {
                  const isGraded = t.outcome_status !== "pending";
                  const isScored = t.grade != null;
                  return (
                    <div key={t.take_id} className="flex items-start gap-3 rounded-lg bg-white border border-purple-200 p-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-gray-400 font-mono mb-0.5">{t.date_made}{t.source_url && ` · ${t.source_url}`}</p>
                        <p className="text-sm text-gray-700 leading-relaxed">"{t.raw_text.length > 200 ? t.raw_text.slice(0, 200) + "…" : t.raw_text}"</p>
                      </div>
                      <div className="shrink-0 flex flex-col items-end gap-2">
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <label className="flex items-center gap-1 cursor-default select-none">
                            <input type="checkbox" readOnly checked={isGraded} className="h-3 w-3 accent-emerald-600 pointer-events-none" />
                            Graded
                          </label>
                          <label className="flex items-center gap-1 cursor-default select-none">
                            <input type="checkbox" readOnly checked={isScored} className="h-3 w-3 accent-emerald-600 pointer-events-none" />
                            Scored
                          </label>
                        </div>
                        <button
                          onClick={() => deleteDupeTake(t.take_id, gi)}
                          className="rounded border border-red-200 text-red-500 hover:border-red-400 hover:bg-red-50 px-2 py-1 text-xs transition-colors"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {(["all", "pending", "graded", "unrated", "no_date"] as Filter[]).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              filter === f
                ? f === "no_date" ? "bg-gray-500 text-white" : "bg-gray-900 text-white"
                : f === "no_date" && counts.no_date > 0
                  ? "text-gray-600 border border-gray-400 hover:border-gray-600 hover:text-gray-800"
                  : "text-gray-500 hover:text-gray-900 border border-gray-300 hover:border-gray-500"
            }`}
          >
            {f === "no_date" ? "No Date" : f.charAt(0).toUpperCase() + f.slice(1)} <span className="opacity-60">({counts[f]})</span>
          </button>
        ))}
      </div>

      {takes === null && (
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
            const verdict   = STATUS_LABEL[take.outcome_status] ?? STATUS_LABEL.pending;
            const isGraded  = take.outcome_status !== "pending";
            const isExpanded = expandedId === take.take_id;

            return (
              <div key={take.take_id} className="px-5 py-4">
                <div className="flex items-start justify-between gap-4">
                  {/* Left: take text + meta */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-gray-500 text-xs font-mono">{take.date_made}</span>
                      {take.boldness_score != null && (
                        <span className="text-gray-400 text-xs">· B={take.boldness_score}</span>
                      )}
                      {take.source_url && (
                        <a
                          href={take.source_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={e => e.stopPropagation()}
                          className="text-xs text-blue-500 hover:text-blue-700 underline"
                        >
                          View source ↗
                        </a>
                      )}
                      {take.rating_status !== "rated" && take.grade == null && !(take.grading_criteria && take.time_horizon_date) && (
                        <span className="rounded px-1.5 py-0.5 text-[10px] font-mono bg-amber-100 text-amber-700 border border-amber-300">
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

                  {/* Right: badge + verdict + buttons */}
                  <div className="shrink-0 flex flex-col items-end gap-2">
                    {take.time_horizon_date && <ResolveBadge date={take.time_horizon_date} />}
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-xs font-bold" style={{ color: verdict.color }}>{verdict.label}</span>
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
                          isExpanded ? "border-gray-600 text-gray-900 bg-gray-100" : "border-gray-300 text-gray-500 hover:border-gray-500 hover:text-gray-800"
                        }`}
                      >
                        {isExpanded ? "Close" : "Edit"}
                      </button>

                      {/* Rate */}
                      {take.rating_status !== "rated" && !(take.grading_criteria && take.time_horizon_date) && take.rateStatus === "idle" && (
                        <button onClick={() => rateOne(take.take_id)} className="rounded-lg border border-blue-300 text-blue-600 hover:border-blue-500 hover:text-blue-800 px-3 py-1 text-xs transition-colors">
                          Rate it
                        </button>
                      )}
                      {take.rateStatus === "rating" && <span className="text-xs text-blue-400 animate-pulse">Rating…</span>}

                      {/* Grade */}
                      {take.gradeStatus === "idle" && (take.rating_status === "rated" || !!take.grading_criteria) && (
                        <button onClick={() => gradeOne(take.take_id)} className="rounded-lg border border-gray-300 text-gray-500 hover:border-gray-500 hover:text-gray-800 px-3 py-1 text-xs transition-colors">
                          {isGraded ? "Re-grade" : "Grade it"}
                        </button>
                      )}
                      {take.gradeStatus === "grading" && <span className="text-xs text-gray-400 animate-pulse">Grading…</span>}
                      {take.gradeStatus === "done"    && <span className="text-xs text-emerald-500">✓ Done</span>}
                      {take.gradeStatus === "error"   && <span className="text-xs text-red-400" title={take.errorMsg}>Failed</span>}

                      {/* Delete */}
                      <button
                        onClick={() => deleteOne(take.take_id)}
                        className="rounded-lg border border-red-200 text-red-400 hover:border-red-400 hover:text-red-600 hover:bg-red-50 px-2 py-1 text-xs transition-colors"
                        title="Delete take"
                      >
                        🗑
                      </button>
                    </div>
                  </div>
                </div>

                {take.gradeStatus === "error" && take.errorMsg && (
                  <p className="text-xs text-red-400 mt-1">{take.errorMsg}</p>
                )}

                {isExpanded && (
                  <TakeEditPanel take={take} onSaved={updated => updateTake(take.take_id, updated)} />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
