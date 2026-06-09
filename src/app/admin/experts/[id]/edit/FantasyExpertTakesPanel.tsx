"use client";

import { useState, useTransition, useEffect } from "react";
import {
  getFantasyTakesForExpert,
  rateSingleFantasyTake,
  gradeFantasyTakeSingle,
  deleteFantasyTake,
  saveFantasyTakeEdits,
} from "@/app/actions/fantasy-takes";
import type { FantasyScoredTake } from "@/lib/fantasy-takescore";

type TakeState = FantasyScoredTake & {
  gradeStatus: "idle" | "grading" | "done" | "error";
  rateStatus:  "idle" | "rating"  | "done" | "error";
  errorMsg?: string;
};

type Filter = "all" | "pending" | "resolved" | "unrated";

const OUTCOME_COLORS: Record<string, string> = {
  pending:  "#d97706",
  resolved: "#0a7a3b",
};

const OUTCOME_OPTIONS = [
  { value: "pending",  label: "Pending"  },
  { value: "resolved", label: "Resolved" },
];

const CATEGORY_LABELS: Record<string, string> = {
  breakout_call: "Breakout Call",
  bust_call:     "Bust Call",
  sleeper_pick:  "Sleeper Pick",
  start_sit:     "Start/Sit",
  waiver_add:    "Waiver Add",
  trade_advice:  "Trade Advice",
  draft_strategy:"Draft Strategy",
};
const formatCategory = (cat: string) =>
  CATEGORY_LABELS[cat] ?? cat.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());

const inputClass =
  "w-full rounded bg-white border border-gray-300 px-2.5 py-1.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-gray-500";

function ResolveBadge({ date }: { date: string }) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(date + "T00:00:00");
  const diffDays = Math.round((d.getTime() - today.getTime()) / 86400000);
  let bg = "#e5e7eb", fg = "#4b5563", prefix = "Resolves";
  if (diffDays < 0)        { bg = "#fef2f2"; fg = "#b91c1c"; prefix = "Overdue"; }
  else if (diffDays === 0) { bg = "#fff7ed"; fg = "#c2410c"; prefix = "Today";   }
  else if (diffDays <= 30) { bg = "#fffbeb"; fg = "#b45309"; prefix = "Soon";    }
  const label = d.toLocaleDateString("en-US", {
    month: "short", day: "numeric",
    year: diffDays < -300 || diffDays > 300 ? "numeric" : undefined,
  });
  return (
    <span className="rounded-full px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap" style={{ backgroundColor: bg, color: fg }}>
      {prefix} {label}
    </span>
  );
}

function FantasyTakeEditPanel({
  take,
  onSaved,
}: {
  take: TakeState;
  onSaved: (updated: Partial<FantasyScoredTake>) => void;
}) {
  const [boldness, setBoldness]   = useState<string>(take.boldness_score != null ? String(take.boldness_score) : "");
  const [accuracy, setAccuracy]   = useState<string>(take.accuracy_score != null ? String(take.accuracy_score) : "");
  const [resDate, setResDate]     = useState(take.resolution_date ?? "");
  const [outcome, setOutcome]     = useState(take.outcome_status);
  const [grCriteria, setGrCriteria] = useState((take as FantasyScoredTake & { grading_criteria?: string | null }).grading_criteria ?? "");
  const [saved, setSaved]         = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleSave() {
    startTransition(async () => {
      const result = await saveFantasyTakeEdits(take.fantasy_take_id, {
        boldness_score:  boldness !== "" ? Number(boldness) : null,
        accuracy_score:  accuracy !== "" ? Number(accuracy) : null,
        resolution_date: resDate || null,
        outcome_status:  outcome,
        grading_criteria: grCriteria.trim() || null,
      });
      if (result.success) {
        setSaved(true);
        onSaved({
          boldness_score:  boldness !== "" ? Number(boldness) : null,
          accuracy_score:  accuracy !== "" ? Number(accuracy) : null,
          resolution_date: resDate || null,
          outcome_status:  outcome,
        });
        setTimeout(() => setSaved(false), 3000);
      }
    });
  }

  return (
    <div className="mt-3 rounded-lg border border-gray-300 bg-white p-4 space-y-4">
      <div className="grid md:grid-cols-2 gap-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[10px] font-mono tracking-wider text-gray-500 mb-1 uppercase">Boldness (0–100)</label>
            <input type="number" min={0} max={100} value={boldness} onChange={e => setBoldness(e.target.value)} className={inputClass} placeholder="e.g. 65" />
          </div>
          <div>
            <label className="block text-[10px] font-mono tracking-wider text-gray-500 mb-1 uppercase">Accuracy (0–100)</label>
            <input type="number" min={0} max={100} value={accuracy} onChange={e => setAccuracy(e.target.value)} className={inputClass} placeholder="e.g. 75" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[10px] font-mono tracking-wider text-gray-500 mb-1 uppercase">Resolution Date</label>
            <input type="date" value={resDate} onChange={e => setResDate(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className="block text-[10px] font-mono tracking-wider text-gray-500 mb-1 uppercase">Outcome</label>
            <select value={outcome} onChange={e => setOutcome(e.target.value)} className={inputClass}>
              {OUTCOME_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
        </div>
      </div>

      <div>
        <label className="block text-[10px] font-mono tracking-wider text-gray-500 mb-1 uppercase">Grading Criteria</label>
        <textarea
          value={grCriteria}
          onChange={e => setGrCriteria(e.target.value)}
          rows={2}
          className={`${inputClass} resize-none`}
          placeholder="Take is TRUE if… Take is FALSE if…"
        />
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={isPending}
          className="px-4 py-1.5 rounded-lg bg-gray-900 text-white text-xs font-semibold hover:bg-gray-700 transition-colors disabled:opacity-50"
        >
          {isPending ? "Saving…" : "Save changes"}
        </button>
        {saved && <span className="text-xs text-emerald-500">✓ Saved</span>}
      </div>
    </div>
  );
}

export default function FantasyExpertTakesPanel({ expertId }: { expertId: string }) {
  const [takes, setTakes]           = useState<TakeState[] | null>(null);
  const [filter, setFilter]         = useState<Filter>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [, startLoad]               = useTransition();

  useEffect(() => {
    startLoad(async () => {
      const all = await getFantasyTakesForExpert(expertId);
      setTakes(all.map(t => ({ ...t, gradeStatus: "idle", rateStatus: "idle" })));
    });
  }, [expertId]);

  function updateTake(id: string, updated: Partial<FantasyScoredTake>) {
    setTakes(prev => prev!.map(t => t.fantasy_take_id === id ? { ...t, ...updated } : t));
  }

  async function rateOne(id: string) {
    setTakes(prev => prev!.map(t => t.fantasy_take_id === id ? { ...t, rateStatus: "rating" } : t));
    const result = await rateSingleFantasyTake(id);
    if (result.success) {
      setTakes(prev => prev!.map(t =>
        t.fantasy_take_id === id
          ? { ...t, rateStatus: "done",
              ...(result.boldness_score  != null ? { boldness_score:  result.boldness_score  } : {}),
              ...(result.grading_criteria != null ? { grading_criteria: result.grading_criteria } : {}),
            }
          : t
      ));
    } else {
      setTakes(prev => prev!.map(t => t.fantasy_take_id === id ? { ...t, rateStatus: "error", errorMsg: result.error } : t));
    }
  }

  async function gradeOne(id: string) {
    setTakes(prev => prev!.map(t => t.fantasy_take_id === id ? { ...t, gradeStatus: "grading" } : t));
    const result = await gradeFantasyTakeSingle(id);
    if (result.success) {
      // Refresh this take from server
      startLoad(async () => {
        const all = await getFantasyTakesForExpert(expertId);
        setTakes(prev => prev!.map(t => {
          const fresh = all.find(a => a.fantasy_take_id === t.fantasy_take_id);
          if (!fresh) return t;
          return { ...fresh, gradeStatus: t.fantasy_take_id === id ? "done" : t.gradeStatus, rateStatus: t.rateStatus };
        }));
      });
    } else {
      setTakes(prev => prev!.map(t => t.fantasy_take_id === id ? { ...t, gradeStatus: "error", errorMsg: result.error } : t));
    }
  }

  async function deleteOne(id: string) {
    if (!confirm("Delete this fantasy take permanently? This cannot be undone.")) return;
    const result = await deleteFantasyTake(id);
    if (result.success) {
      setTakes(prev => prev!.filter(t => t.fantasy_take_id !== id));
      if (expandedId === id) setExpandedId(null);
    } else {
      alert(`Delete failed: ${result.error}`);
    }
  }

  const allTakes = takes ?? [];
  const filtered = allTakes.filter(t => {
    if (filter === "pending")  return t.outcome_status === "pending";
    if (filter === "resolved") return t.outcome_status === "resolved";
    if (filter === "unrated")  return t.boldness_score == null;
    return true;
  });

  const counts = {
    all:      allTakes.length,
    pending:  allTakes.filter(t => t.outcome_status === "pending").length,
    resolved: allTakes.filter(t => t.outcome_status === "resolved").length,
    unrated:  allTakes.filter(t => t.boldness_score == null).length,
  };

  const filterLabels: Record<Filter, string> = {
    all: "All", pending: "Pending", resolved: "Resolved", unrated: "Unrated",
  };

  return (
    <div className="space-y-4">
      {/* Filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {(["all", "pending", "resolved", "unrated"] as Filter[]).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              filter === f
                ? "bg-gray-900 text-white"
                : "text-gray-500 hover:text-gray-900 border border-gray-300 hover:border-gray-500"
            }`}
          >
            {filterLabels[f]} <span className="opacity-60">({counts[f]})</span>
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
          {filtered.map(take => {
            const isExpanded = expandedId === take.fantasy_take_id;
            const outcomeColor = OUTCOME_COLORS[take.outcome_status] ?? "#6b7280";

            return (
              <div key={take.fantasy_take_id} className="px-5 py-4">
                <div className="flex items-start justify-between gap-4">
                  {/* Left: text + meta */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-gray-500 text-xs font-mono">{take.date_made}</span>
                      <span className="rounded px-1.5 py-0.5 text-[10px] font-semibold bg-green-800 text-white">
                        {formatCategory(take.category)}
                      </span>
                      {take.player_name && (
                        <span className="text-xs text-gray-500">{take.player_name}{take.player_position ? ` · ${take.player_position}` : ""}</span>
                      )}
                      {take.format && (
                        <span className="rounded px-1.5 py-0.5 text-[10px] bg-purple-100 text-purple-700">{take.format}</span>
                      )}
                      {take.boldness_score == null && (
                        <span className="rounded px-1.5 py-0.5 text-[10px] font-mono bg-amber-100 text-amber-700 border border-amber-300">
                          NOT RATED
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-700 leading-relaxed line-clamp-2">
                      &ldquo;{take.raw_text.length > 200 ? take.raw_text.slice(0, 200) + "…" : take.raw_text}&rdquo;
                    </p>
                  </div>

                  {/* Right: badge + buttons */}
                  <div className="shrink-0 flex flex-col items-end gap-2">
                    {take.resolution_date && <ResolveBadge date={take.resolution_date} />}
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold uppercase" style={{ color: outcomeColor }}>
                        {take.outcome_status}
                      </span>
                      {take.accuracy_score != null && (
                        <span className="font-black text-lg leading-none" style={{ color: take.accuracy_score >= 50 ? "#0a7a3b" : "#e2241a" }}>
                          {Math.round(take.accuracy_score)}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {/* Edit toggle */}
                      <button
                        onClick={() => setExpandedId(isExpanded ? null : take.fantasy_take_id)}
                        className={`rounded-lg border px-3 py-1 text-xs transition-colors ${
                          isExpanded
                            ? "border-gray-600 text-gray-900 bg-gray-100"
                            : "border-gray-300 text-gray-500 hover:border-gray-500 hover:text-gray-800"
                        }`}
                      >
                        {isExpanded ? "Close" : "Edit"}
                      </button>

                      {/* Rate */}
                      {take.boldness_score == null && take.rateStatus === "idle" && (
                        <button
                          onClick={() => rateOne(take.fantasy_take_id)}
                          className="rounded-lg border border-blue-300 text-blue-600 hover:border-blue-500 px-3 py-1 text-xs transition-colors"
                        >
                          Rate it ✦
                        </button>
                      )}
                      {take.rateStatus === "rating" && <span className="text-xs text-blue-400 animate-pulse">Rating…</span>}
                      {take.rateStatus === "done"   && <span className="text-xs text-emerald-500">✓ Rated</span>}

                      {/* Grade */}
                      {take.gradeStatus === "idle" && take.boldness_score != null && (
                        <button
                          onClick={() => gradeOne(take.fantasy_take_id)}
                          className="rounded-lg border border-gray-300 text-gray-500 hover:border-gray-500 px-3 py-1 text-xs transition-colors"
                        >
                          {take.outcome_status === "resolved" ? "Re-grade" : "Grade it"}
                        </button>
                      )}
                      {take.gradeStatus === "grading" && <span className="text-xs text-gray-400 animate-pulse">Grading…</span>}
                      {take.gradeStatus === "done"    && <span className="text-xs text-emerald-500">✓ Done</span>}
                      {take.gradeStatus === "error"   && <span className="text-xs text-red-400" title={take.errorMsg}>Failed</span>}

                      {/* Delete */}
                      <button
                        onClick={() => deleteOne(take.fantasy_take_id)}
                        className="rounded-lg border border-red-200 text-red-400 hover:border-red-400 hover:bg-red-50 px-2 py-1 text-xs transition-colors"
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
                  <FantasyTakeEditPanel
                    take={take}
                    onSaved={updated => updateTake(take.fantasy_take_id, updated)}
                  />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
