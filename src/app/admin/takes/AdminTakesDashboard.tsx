"use client";

import { useState, useTransition, useEffect, useRef, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { getAllTakesForAdmin, gradeSingleTake, type AdminTake } from "@/app/actions/grading";
import { saveTakeEdits, rateSingleTake, deleteTake } from "@/app/actions/takes";
import { getAllFantasyTakesAdmin, gradeFantasyTake, gradeFantasyTakeSingle, rateSingleFantasyTake, deleteFantasyTake, saveFantasyTakeEdits } from "@/app/actions/fantasy-takes";
import { searchPlayers, getPlayerByCanonicalName } from "@/app/actions/players";
import type { FantasyScoredTake } from "@/lib/fantasy-takescore";
import Link from "next/link";

// ── Player search typeahead ───────────────────────────────────────────────────
interface PlayerOption { player_id: string; canonical_name: string; aliases: string[] }

function PlayerSearchInput({
  onSelect,
}: {
  onSelect: (player: PlayerOption) => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PlayerOption[]>([]);
  const [open, setOpen] = useState(false);
  const [cursor, setCursor] = useState(-1);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  const runSearch = useCallback(async (q: string) => {
    if (!q.trim()) { setResults([]); setOpen(false); return; }
    const res = await searchPlayers(q);
    setResults(res);
    setOpen(res.length > 0);
    setCursor(-1);
  }, []);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const q = e.target.value;
    setQuery(q);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => runSearch(q), 300);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") { e.preventDefault(); setCursor(c => Math.min(c + 1, results.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setCursor(c => Math.max(c - 1, 0)); }
    else if (e.key === "Enter" && cursor >= 0) { e.preventDefault(); select(results[cursor]); }
    else if (e.key === "Escape") { setOpen(false); }
  }

  function select(player: PlayerOption) {
    onSelect(player);
    setQuery("");
    setResults([]);
    setOpen(false);
  }

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={wrapRef} className="relative min-w-[200px]">
      <div className="flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-2 focus-within:border-gray-500">
        <span className="text-gray-400 text-sm shrink-0">👤</span>
        <input
          type="text"
          value={query}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder="Filter by player…"
          className="flex-1 text-sm text-gray-900 placeholder-gray-400 focus:outline-none bg-transparent"
        />
      </div>
      {open && (
        <ul className="absolute z-50 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
          {results.map((p, i) => (
            <li key={p.player_id}>
              <button
                type="button"
                onMouseDown={() => select(p)}
                className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                  i === cursor ? "bg-gray-900 text-white" : "text-gray-800 hover:bg-gray-50"
                }`}
              >
                {p.canonical_name}
                {(p.aliases ?? []).length > 0 && (
                  <span className={`ml-1.5 text-xs ${i === cursor ? "text-gray-300" : "text-gray-400"}`}>
                    ({p.aliases.slice(0, 2).join(", ")}{p.aliases.length > 2 ? "…" : ""})
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

type TakeState = AdminTake & {
  gradeStatus: "idle" | "grading" | "done" | "error";
  rateStatus: "idle" | "rating" | "done" | "error";
  errorMsg?: string;
};
type Filter = "all" | "pending" | "graded" | "unrated" | "overdue";
type TakeTypeTab = "analyst" | "fantasy";

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
  const [playerTags, setPlayerTags] = useState<string[]>(take.player_tags ?? []);
  const [tagInput, setTagInput] = useState("");
  const [saved, setSaved] = useState(false);
  const [isPending, startTransition] = useTransition();

  function addTag() {
    const val = tagInput.trim();
    if (val && !playerTags.includes(val)) {
      setPlayerTags(prev => [...prev, val]);
    }
    setTagInput("");
  }

  function removeTag(tag: string) {
    setPlayerTags(prev => prev.filter(t => t !== tag));
  }

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
        player_tags: playerTags.length > 0 ? playerTags : null,
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
          player_tags: playerTags.length > 0 ? playerTags : null,
        });
        setTimeout(() => setSaved(false), 3000);
      }
    });
  }

  return (
    <div className="mt-3 rounded-lg border border-gray-300 bg-white p-4 space-y-4">
      {take.source_url && (
        <div className="flex items-center gap-2 px-3 py-2 rounded bg-gray-50 border border-gray-200">
          <span className="font-mono text-[10px] tracking-wider text-gray-400 uppercase shrink-0">
            {take.source_type === "tweet" ? "Tweet" : take.source_type ?? "Source"}
          </span>
          <a
            href={take.source_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-blue-600 hover:text-blue-800 hover:underline truncate"
          >
            {take.source_url}
          </a>
        </div>
      )}
      <div className="mb-3">
      <label className="block text-[10px] font-mono tracking-wider text-gray-500 mb-1 uppercase">Player Tags</label>
      <div className="flex flex-wrap gap-1 mb-2">
        {playerTags.map((tag) => (
          <span key={tag} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 border border-blue-200 text-xs text-blue-700">
            {tag}
            <button onClick={() => setPlayerTags(playerTags.filter(t => t !== tag))} className="hover:text-red-500">×</button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          type="text"
          value={tagInput}
          onChange={e => setTagInput(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter" && tagInput.trim()) { setPlayerTags([...playerTags, tagInput.trim()]); setTagInput(""); }}}
          placeholder="Add player name..."
          className="flex-1 text-sm border border-gray-300 rounded px-2 py-1"
        />
        <button onClick={() => { if (tagInput.trim()) { setPlayerTags([...playerTags, tagInput.trim()]); setTagInput(""); }}} className="px-3 py-1 text-xs bg-gray-100 border border-gray-300 rounded hover:bg-gray-200">Add</button>
      </div>
    </div>
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

      <div>
        <label className="block text-[10px] font-mono tracking-wider text-gray-500 mb-1 uppercase">Player Tags</label>
        <div className="flex flex-wrap gap-1 mb-2">
          {playerTags.map(tag => (
            <span key={tag} className="flex items-center gap-1 rounded-full bg-gray-100 border border-gray-300 px-2 py-0.5 text-xs text-gray-700">
              {tag}
              <button
                type="button"
                onClick={() => removeTag(tag)}
                className="text-gray-400 hover:text-gray-700 leading-none"
                aria-label={`Remove ${tag}`}
              >×</button>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={tagInput}
            onChange={e => setTagInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }}
            placeholder="e.g. LeBron James"
            className={`${inputClass} flex-1`}
          />
          <button
            type="button"
            onClick={addTag}
            className="px-3 py-1.5 rounded-lg border border-gray-300 text-xs text-gray-600 hover:border-gray-500 hover:text-gray-900 transition-colors whitespace-nowrap"
          >
            Add tag
          </button>
        </div>
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

function ResolveBadge({ date }: { date: string }) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(date + "T00:00:00");
  const diffDays = Math.round((d.getTime() - today.getTime()) / 86400000);

  let bg = "#e5e7eb";   // default gray
  let fg = "#4b5563";
  let prefix = "Resolves";

  if (diffDays < 0) {
    bg = "#fef2f2"; fg = "#b91c1c"; prefix = "Overdue";
  } else if (diffDays === 0) {
    bg = "#fff7ed"; fg = "#c2410c"; prefix = "Today";
  } else if (diffDays <= 30) {
    bg = "#fffbeb"; fg = "#b45309"; prefix = "Soon";
  }

  const label = d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: diffDays < -300 || diffDays > 300 ? "numeric" : undefined });

  return (
    <span
      className="rounded-full px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap"
      style={{ backgroundColor: bg, color: fg }}
    >
      {prefix} {label}
    </span>
  );
}

export default function AdminTakesDashboard() {
  const searchParams = useSearchParams();
  const [takeTypeTab, setTakeTypeTab] = useState<TakeTypeTab>("analyst");
  const [takes, setTakes] = useState<TakeState[] | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [isLoading, startLoad] = useTransition();
  const [gradingAll, setGradingAll] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<"date_submitted" | "date_made" | "time_horizon_date" | "expert_name" | "grade">("date_submitted");
  const [sortAsc, setSortAsc] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulking, setBulking] = useState(false);
  const [playerFilter, setPlayerFilter] = useState<PlayerOption | null>(null);

  // Load takes and resolve ?playerFilter= URL param
  useEffect(() => {
    startLoad(async () => {
      const all = await getAllTakesForAdmin();
      setTakes(all.map((t) => ({ ...t, gradeStatus: "idle", rateStatus: "idle" })));
      const pf = searchParams.get("playerFilter");
      if (pf) {
        const player = await getPlayerByCanonicalName(pf);
        if (player) setPlayerFilter(player);
      }
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

  async function rateOne(takeId: string) {
    setTakes(prev => prev!.map(t => t.take_id === takeId ? { ...t, rateStatus: "rating" } : t));
    const result = await rateSingleTake(takeId);
    if (result.success) {
      refreshTake(takeId);
      setTakes(prev => prev!.map(t => t.take_id === takeId ? { ...t, rateStatus: "done", rating_status: "rated" } : t));
    } else {
      setTakes(prev => prev!.map(t => t.take_id === takeId ? { ...t, rateStatus: "error", errorMsg: result.error } : t));
    }
  }

  function refreshTake(takeId: string) {
    startLoad(async () => {
      const all = await getAllTakesForAdmin();
      setTakes((prev) =>
        prev!.map((t) => {
          const fresh = all.find((a) => a.take_id === t.take_id);
          if (!fresh) return t;
          return {
            ...fresh,
            gradeStatus: t.take_id === takeId ? "done" : t.gradeStatus,
            rateStatus: t.rateStatus,
            // If we locally marked this as rated, keep that even if the server hasn't flushed yet
            rating_status: t.rateStatus === "done" ? "rated" : fresh.rating_status,
            errorMsg: t.errorMsg,
          };
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

  function toggleSelect(id: string) {
    setSelectedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }
  function deselectAll() { setSelectedIds(new Set()); }

  async function bulkDelete() {
    if (!confirm(`Permanently delete ${selectedIds.size} takes? This cannot be undone.`)) return;
    setBulking(true);
    for (const id of selectedIds) {
      const result = await deleteTake(id);
      if (result.success) setTakes(prev => prev!.filter(t => t.take_id !== id));
    }
    setSelectedIds(new Set());
    setBulking(false);
  }

  async function bulkRate() {
    setBulking(true);
    for (const id of [...selectedIds]) {
      setTakes(prev => prev!.map(t => t.take_id === id ? { ...t, rateStatus: "rating" } : t));
      const result = await rateSingleTake(id);
      if (result.success) { refreshTake(id); setTakes(prev => prev!.map(t => t.take_id === id ? { ...t, rateStatus: "done", rating_status: "rated" } : t)); }
      else setTakes(prev => prev!.map(t => t.take_id === id ? { ...t, rateStatus: "error" } : t));
    }
    setSelectedIds(new Set());
    setBulking(false);
  }

  async function bulkGrade() {
    setBulking(true);
    for (const id of [...selectedIds]) {
      setTakeGradeStatus(id, "grading");
      const result = await gradeSingleTake(id);
      if (result.success) refreshTake(id);
      else setTakeGradeStatus(id, "error", result.error);
    }
    setSelectedIds(new Set());
    setBulking(false);
  }

  const allTakes = takes ?? [];
  const today = new Date().toISOString().split("T")[0];

  // Build the set of names to match for the player filter (canonical + aliases)
  const playerFilterNames = playerFilter
    ? new Set([playerFilter.canonical_name, ...(playerFilter.aliases ?? [])].map(n => n.toLowerCase()))
    : null;

  const filtered = allTakes
    .filter((t) => {
      if (filter === "pending")  return t.outcome_status === "pending";
      if (filter === "graded")   return t.outcome_status !== "pending";
      if (filter === "unrated")  return t.rating_status !== "rated" && t.grade == null && !(t.grading_criteria && t.time_horizon_date);
      if (filter === "overdue")  return t.outcome_status === "pending" && !!t.time_horizon_date && t.time_horizon_date <= today;
      return true;
    })
    .filter((t) => {
      if (!playerFilterNames) return true;
      return (t.player_tags ?? []).some(tag => playerFilterNames.has(tag.toLowerCase()));
    })
    .filter((t) => {
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        t.expert_name.toLowerCase().includes(q) ||
        (t.summary ?? "").toLowerCase().includes(q) ||
        t.raw_text.toLowerCase().includes(q) ||
        (t.outcome_notes ?? "").toLowerCase().includes(q)
      );
    })
    .sort((a, b) => {
      let av: string | number = "";
      let bv: string | number = "";
      if (sortKey === "date_submitted")    { av = a.date_submitted ?? "";     bv = b.date_submitted ?? ""; }
      if (sortKey === "date_made")         { av = a.date_made ?? "";          bv = b.date_made ?? ""; }
      if (sortKey === "time_horizon_date") { av = a.time_horizon_date ?? "9999"; bv = b.time_horizon_date ?? "9999"; }
      if (sortKey === "expert_name")       { av = a.expert_name;              bv = b.expert_name; }
      if (sortKey === "grade")             { av = a.grade ?? -1;              bv = b.grade ?? -1; }
      if (typeof av === "string") return sortAsc ? av.localeCompare(bv as string) : (bv as string).localeCompare(av);
      return sortAsc ? (av - (bv as number)) : ((bv as number) - av);
    });

  function toggleSort(key: typeof sortKey) {
    if (sortKey === key) setSortAsc(p => !p);
    else { setSortKey(key); setSortAsc(key === "time_horizon_date"); }
  }

  const pendingGradeable = allTakes.filter(
    (t) => t.outcome_status === "pending" && t.rating_status === "rated" && t.gradeStatus === "idle"
  ).length;

  const counts = {
    all:     allTakes.length,
    pending: allTakes.filter((t) => t.outcome_status === "pending").length,
    graded:  allTakes.filter((t) => t.outcome_status !== "pending").length,
    unrated: allTakes.filter((t) => t.rating_status !== "rated" && t.grade == null && !(t.grading_criteria && t.time_horizon_date)).length,
    overdue: allTakes.filter((t) => t.outcome_status === "pending" && !!t.time_horizon_date && t.time_horizon_date <= today).length,
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
        {takeTypeTab === "analyst" && pendingGradeable > 0 && (
          <button
            onClick={gradeAllPending}
            disabled={gradingAll}
            className="shrink-0 rounded-lg bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-black hover:bg-emerald-400 disabled:opacity-50 transition-colors"
          >
            {gradingAll ? "Grading…" : `Grade all pending (${pendingGradeable})`}
          </button>
        )}
      </div>

      {/* Analyst / Fantasy tab switcher */}
      <div className="flex border-b-2 border-gray-200">
        <button
          onClick={() => setTakeTypeTab("analyst")}
          className={`px-5 py-2 font-mono text-[11px] tracking-widest uppercase font-semibold transition-colors border-b-2 -mb-0.5 ${
            takeTypeTab === "analyst"
              ? "border-gray-900 text-gray-900"
              : "border-transparent text-gray-400 hover:text-gray-700"
          }`}
        >
          Analyst Takes
        </button>
        <button
          onClick={() => setTakeTypeTab("fantasy")}
          className={`px-5 py-2 font-mono text-[11px] tracking-widest uppercase font-semibold transition-colors border-b-2 -mb-0.5 ${
            takeTypeTab === "fantasy"
              ? "text-white border-b-2"
              : "border-transparent text-gray-400 hover:text-gray-700"
          }`}
          style={takeTypeTab === "fantasy" ? { borderColor: "#15803d", color: "#15803d" } : {}}
        >
          Fantasy Takes
        </button>
      </div>

      {takeTypeTab === "fantasy" && <FantasyTakesPanel />}

      {takeTypeTab === "analyst" && <>

      {/* Search + player filter + sort */}
      <div className="flex flex-wrap gap-3 items-center">
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by analyst, take text, notes…"
          className="flex-1 min-w-[220px] rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-gray-500"
        />
        <PlayerSearchInput onSelect={(p) => setPlayerFilter(p)} />
        <div className="flex items-center gap-1 text-xs text-gray-500 font-mono">
          <span className="mr-1">SORT:</span>
          {([
            { key: "date_submitted",    label: "Date Added" },
            { key: "date_made",         label: "Date Made" },
            { key: "time_horizon_date", label: "Resolves" },
            { key: "expert_name",       label: "Analyst" },
            { key: "grade",             label: "Grade" },
          ] as const).map(({ key, label }) => (
            <button
              key={key}
              onClick={() => toggleSort(key)}
              className={`px-2 py-1 rounded border transition-colors ${
                sortKey === key
                  ? "border-gray-700 bg-gray-900 text-white"
                  : "border-gray-300 text-gray-500 hover:border-gray-500"
              }`}
            >
              {label}{sortKey === key ? (sortAsc ? " ↑" : " ↓") : ""}
            </button>
          ))}
        </div>
      </div>

      {/* Active player filter chip */}
      {playerFilter && (
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-900 text-white text-xs font-medium px-3 py-1.5">
            👤 {playerFilter.canonical_name}
            <button
              onClick={() => setPlayerFilter(null)}
              className="text-gray-300 hover:text-white leading-none ml-0.5 transition-colors"
              aria-label="Clear player filter"
            >
              ×
            </button>
          </span>
          <span className="text-xs text-gray-400">{filtered.length} take{filtered.length !== 1 ? "s" : ""}</span>
        </div>
      )}

      {/* Filter tabs + select-all */}
      <div className="flex items-center gap-2 flex-wrap">
        {(["all", "pending", "graded", "unrated", "overdue"] as Filter[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              filter === f
                ? f === "overdue" ? "bg-red-700 text-white" : "bg-gray-900 text-white"
                : f === "overdue" && counts.overdue > 0
                  ? "text-red-600 border border-red-300 hover:border-red-500 hover:text-red-700"
                  : "text-gray-500 hover:text-gray-900 border border-gray-300 hover:border-gray-500"
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)} <span className="opacity-60">({counts[f]})</span>
          </button>
        ))}
        {filtered.length > 0 && (
          <label className="ml-2 flex items-center gap-1.5 text-xs text-gray-500 cursor-pointer select-none">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-gray-400 accent-gray-900"
              checked={filtered.length > 0 && filtered.every(t => selectedIds.has(t.take_id))}
              onChange={() => {
                filtered.every(t => selectedIds.has(t.take_id))
                  ? deselectAll()
                  : setSelectedIds(new Set(filtered.map(t => t.take_id)));
              }}
            />
            Select all
          </label>
        )}
      </div>

      {/* Bulk action bar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 rounded-lg bg-gray-900 text-white px-4 py-2.5 flex-wrap">
          <span className="font-mono text-xs font-semibold">{selectedIds.size} selected</span>
          <button onClick={deselectAll} className="text-[11px] text-gray-400 hover:text-white underline">Deselect all</button>
          <div className="flex-1" />
          {bulking && <span className="text-xs text-gray-400 animate-pulse">Working…</span>}
          <button
            onClick={bulkRate}
            disabled={bulking}
            className="px-3 py-1.5 rounded bg-blue-600 hover:bg-blue-500 text-xs font-semibold disabled:opacity-40 transition-colors"
          >
            Rate Selected
          </button>
          <button
            onClick={bulkGrade}
            disabled={bulking}
            className="px-3 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold disabled:opacity-40 transition-colors"
          >
            Grade Selected
          </button>
          <button
            onClick={bulkDelete}
            disabled={bulking}
            className="px-3 py-1.5 rounded bg-red-600 hover:bg-red-500 text-xs font-semibold disabled:opacity-40 transition-colors"
          >
            Delete Selected
          </button>
        </div>
      )}

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
              <div key={take.take_id} className="px-4 py-3">
                {/* Top row: checkbox + name + meta + resolve badge + verdict + buttons — all wrapping */}
                <div className="flex items-start gap-2 flex-wrap">
                  <input
                    type="checkbox"
                    className="mt-1 h-4 w-4 rounded border-gray-400 accent-gray-900 shrink-0 cursor-pointer"
                    checked={selectedIds.has(take.take_id)}
                    onChange={() => toggleSelect(take.take_id)}
                  />

                  {/* Name + meta */}
                  <Link href={`/experts/${take.expert_id}`} className="font-semibold text-gray-900 hover:text-black text-sm">
                    {take.expert_name}
                  </Link>
                  <span className="text-gray-500 text-xs mt-0.5">{take.date_made}</span>
                  {take.boldness_score != null && (
                    <span className="text-gray-500 text-xs mt-0.5">· B={take.boldness_score}</span>
                  )}
                  {take.rating_status !== "rated" && take.grade == null && !(take.grading_criteria && take.time_horizon_date) && (
                    <span className="rounded px-1.5 py-0.5 text-[10px] font-mono bg-amber-900/40 text-amber-400 border border-amber-800">
                      NOT RATED YET
                    </span>
                  )}
                  {take.time_horizon_date && <ResolveBadge date={take.time_horizon_date} />}

                  {/* Verdict + score */}
                  <span className="font-mono text-xs font-bold mt-0.5" style={{ color: verdict.color }}>{verdict.label}</span>
                  {take.grade != null && (
                    <span className="font-black text-base leading-none mt-0.5" style={{ color: take.grade >= 60 ? "#0a7a3b" : "#e2241a" }}>
                      {Math.round(take.grade)}
                    </span>
                  )}

                  {/* Buttons */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : take.take_id)}
                      className={`rounded-lg border px-3 py-1 text-xs transition-colors ${
                        isExpanded ? "border-gray-600 text-gray-900 bg-gray-100" : "border-gray-300 text-gray-500 hover:border-gray-500 hover:text-gray-800"
                      }`}
                    >
                      {isExpanded ? "Close" : "Edit"}
                    </button>
                    <button
                      onClick={() => deleteOne(take.take_id)}
                      className="rounded-lg border border-red-200 text-red-400 hover:border-red-400 hover:text-red-600 hover:bg-red-50 px-2 py-1 text-xs transition-colors"
                      title="Delete take"
                    >🗑</button>
                    {take.rating_status !== "rated" && !(take.grading_criteria && take.time_horizon_date) && take.rateStatus === "idle" && (
                      <button onClick={() => rateOne(take.take_id)} className="rounded-lg border border-blue-300 text-blue-600 hover:border-blue-500 px-3 py-1 text-xs transition-colors">
                        Rate it
                      </button>
                    )}
                    {take.rateStatus === "rating" && <span className="text-xs text-blue-400 animate-pulse">Rating…</span>}
                    {take.rateStatus === "done" && take.rating_status !== "rated" && <span className="text-xs text-blue-400">✓ Rated</span>}
                    {take.rateStatus === "error" && <span className="text-xs text-red-400" title={take.errorMsg}>✗ Failed</span>}
                    {take.gradeStatus === "idle" && (take.rating_status === "rated" || !!take.grading_criteria) && (
                      <button onClick={() => gradeOne(take.take_id)} className="rounded-lg border border-gray-300 text-gray-500 hover:border-gray-500 px-3 py-1 text-xs transition-colors">
                        {isGraded ? "Re-grade" : "Grade it"}
                      </button>
                    )}
                    {take.gradeStatus === "grading" && <span className="text-xs text-gray-400 animate-pulse">Searching web…</span>}
                    {take.gradeStatus === "done" && <span className="text-xs text-emerald-400">✓ Done</span>}
                    {take.gradeStatus === "error" && <span className="text-xs text-red-400">Failed</span>}
                  </div>
                </div>

                {/* Take text — full width below */}
                <p className="mt-2 text-sm text-gray-700 leading-relaxed">
                  "{take.summary ?? take.raw_text}"
                </p>
                {take.player_tags && take.player_tags.length > 0 && (
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {take.player_tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full bg-gray-200 px-2 py-0.5 text-[11px] font-medium text-gray-700"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
                {isGraded && take.outcome_notes && (
                  <p className="mt-1 text-xs text-gray-500 italic">{take.outcome_notes}</p>
                )}
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

      </> }

      {takeTypeTab === "fantasy" && (
        <Link href="/admin" className="inline-block text-sm text-gray-500 hover:text-gray-800 transition-colors">
          ← Back to Admin
        </Link>
      )}
    </div>
  );
}

// ── Fantasy Takes Panel ───────────────────────────────────────────────────────

const FANTASY_CATEGORIES = [
  { value: "breakout_call", label: "Breakout Call" },
  { value: "bust_call",     label: "Bust Call" },
  { value: "sleeper_pick",  label: "Sleeper Pick" },
  { value: "start_sit",     label: "Start/Sit" },
  { value: "waiver_add",    label: "Waiver Add" },
];

const TIMING_WINDOWS = [
  { value: "",             label: "— None —" },
  { value: "preseason",    label: "Preseason" },
  { value: "post_draft",   label: "Post Draft" },
  { value: "early_season", label: "Early Season" },
  { value: "midseason",    label: "Midseason" },
  { value: "late_season",  label: "Late Season" },
  { value: "playoffs",     label: "Playoffs" },
];

const FANTASY_OUTCOME_OPTIONS = [
  { value: "pending",  label: "Pending" },
  { value: "resolved", label: "Resolved" },
];

function FantasyEditPanel({
  take,
  onSaved,
  onClose,
}: {
  take: FantasyTakeRow;
  onSaved: (updated: Partial<FantasyTakeRow>) => void;
  onClose: () => void;
}) {
  const [rawText,       setRawText]       = useState(take.raw_text ?? "");
  const [playerName,    setPlayerName]    = useState(take.player_name ?? "");
  const [playerPos,     setPlayerPos]     = useState(take.player_position ?? "");
  const [playerAdp,     setPlayerAdp]     = useState(take.player_adp != null ? String(take.player_adp) : "");
  const [category,      setCategory]      = useState(take.category ?? "breakout_call");
  const [timingWindow,  setTimingWindow]  = useState(take.timing_window ?? "");
  const [boldness,      setBoldness]      = useState(take.boldness_score != null ? String(take.boldness_score) : "");
  const [dateMade,      setDateMade]      = useState(take.date_made ?? "");
  const [resDate,       setResDate]       = useState(take.resolution_date ?? "");
  const [sportSeason,   setSportSeason]   = useState(take.sport_season ?? "");
  const [outcome,       setOutcome]       = useState(take.outcome_status ?? "pending");
  const [accuracy,      setAccuracy]      = useState(take.accuracy_score != null ? String(take.accuracy_score) : "");
  const [graderNote,      setGraderNote]      = useState((take as FantasyTakeRow & { grader_note?: string }).grader_note ?? "");
  const [gradingCriteria, setGradingCriteria] = useState((take as FantasyTakeRow & { grading_criteria?: string }).grading_criteria ?? "");
  // Pre-populate source URL from t.co link in raw_text if not explicitly stored
  const [sourceUrl, setSourceUrl] = useState(() => {
    if (take.source_url) return take.source_url;
    const match = (take.raw_text ?? "").match(/https?:\/\/t\.co\/\S+/);
    return match ? match[0] : "";
  });
  const [saved,           setSaved]           = useState(false);
  const [isPending,     startTransition]  = useTransition();

  function handleSave() {
    startTransition(async () => {
      const edits = {
        raw_text:        rawText.trim() || undefined,
        player_name:     playerName.trim() || null,
        player_position: playerPos.trim() || null,
        player_adp:      playerAdp !== "" ? Number(playerAdp) : null,
        category,
        timing_window:   timingWindow || null,
        boldness_score:  boldness !== "" ? Number(boldness) : null,
        date_made:       dateMade || undefined,
        resolution_date: resDate || null,
        sport_season:    sportSeason.trim() || null,
        outcome_status:  outcome,
        accuracy_score:   accuracy !== "" ? Number(accuracy) : null,
        grader_note:      graderNote.trim() || null,
        grading_criteria: gradingCriteria.trim() || null,
        source_url:       sourceUrl.trim() || null,
      };
      const result = await saveFantasyTakeEdits(take.fantasy_take_id, edits);
      if (result.success) {
        setSaved(true);
        onSaved({ ...edits, accuracy_score: accuracy !== "" ? Number(accuracy) : null } as Partial<FantasyTakeRow>);
        setTimeout(() => setSaved(false), 3000);
      }
    });
  }

  return (
    <div className="mt-3 rounded-lg border border-green-200 bg-white p-4 space-y-4">

      {/* Source link — clickable banner if set, editable input always */}
      {sourceUrl && (
        <div className="flex items-center gap-2 px-3 py-2 rounded bg-gray-50 border border-gray-200">
          <span className="font-mono text-[10px] tracking-wider text-gray-400 uppercase shrink-0">Tweet</span>
          <a href={sourceUrl} target="_blank" rel="noopener noreferrer"
            className="text-sm text-blue-600 hover:text-blue-800 hover:underline truncate">
            {sourceUrl}
          </a>
        </div>
      )}
      <div>
        <label className="block text-[10px] font-mono tracking-wider text-gray-500 mb-1 uppercase">
          Source URL (Tweet / Post)
        </label>
        <input type="url" value={sourceUrl} onChange={e => setSourceUrl(e.target.value)}
          className={inputClass} placeholder="https://x.com/…" />
      </div>

      {/* Take text + boldness + resolution date — mirrors analyst layout */}
      <div className="grid md:grid-cols-[1fr_auto] gap-3">
        <div>
          <label className="block text-[10px] font-mono tracking-wider text-gray-500 mb-1 uppercase">Take Text</label>
          <textarea value={rawText} onChange={e => setRawText(e.target.value)}
            rows={3} className={`${inputClass} resize-none`} />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-1 gap-3 md:w-48">
          <div>
            <label className="block text-[10px] font-mono tracking-wider text-gray-500 mb-1 uppercase">Boldness (0–100)</label>
            <input type="number" min={0} max={100} value={boldness} onChange={e => setBoldness(e.target.value)}
              className={inputClass} placeholder="e.g. 75" />
          </div>
          <div>
            <label className="block text-[10px] font-mono tracking-wider text-gray-500 mb-1 uppercase">Resolution Date</label>
            <input type="date" value={resDate} onChange={e => setResDate(e.target.value)} className={inputClass} />
          </div>
        </div>
      </div>

      {/* Grading criteria */}
      <div>
        <label className="block text-[10px] font-mono tracking-wider text-gray-500 mb-1 uppercase">Grading Criteria</label>
        <textarea value={gradingCriteria} onChange={e => setGradingCriteria(e.target.value)}
          rows={3} className={`${inputClass} resize-none`}
          placeholder="Take is TRUE if… Take is FALSE if…" />
      </div>

      {/* Classification: player + category + timing + season + date */}
      <div className="grid md:grid-cols-4 gap-3">
        <div>
          <label className="block text-[10px] font-mono tracking-wider text-gray-500 mb-1 uppercase">Player Name</label>
          <input type="text" value={playerName} onChange={e => setPlayerName(e.target.value)}
            className={inputClass} placeholder="e.g. CeeDee Lamb" />
        </div>
        <div>
          <label className="block text-[10px] font-mono tracking-wider text-gray-500 mb-1 uppercase">Position</label>
          <input type="text" value={playerPos} onChange={e => setPlayerPos(e.target.value)}
            className={inputClass} placeholder="WR / RB / QB…" />
        </div>
        <div>
          <label className="block text-[10px] font-mono tracking-wider text-gray-500 mb-1 uppercase">ADP</label>
          <input type="number" value={playerAdp} onChange={e => setPlayerAdp(e.target.value)}
            className={inputClass} placeholder="e.g. 24.5" />
        </div>
        <div>
          <label className="block text-[10px] font-mono tracking-wider text-gray-500 mb-1 uppercase">Category</label>
          <select value={category} onChange={e => setCategory(e.target.value)} className={inputClass}>
            {FANTASY_CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </div>
      </div>
      <div className="grid md:grid-cols-3 gap-3">
        <div>
          <label className="block text-[10px] font-mono tracking-wider text-gray-500 mb-1 uppercase">Timing Window</label>
          <select value={timingWindow} onChange={e => setTimingWindow(e.target.value)} className={inputClass}>
            {TIMING_WINDOWS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-[10px] font-mono tracking-wider text-gray-500 mb-1 uppercase">Sport / Season</label>
          <input type="text" value={sportSeason} onChange={e => setSportSeason(e.target.value)}
            className={inputClass} placeholder="e.g. 2026 NFL" />
        </div>
        <div>
          <label className="block text-[10px] font-mono tracking-wider text-gray-500 mb-1 uppercase">Date Made</label>
          <input type="date" value={dateMade} onChange={e => setDateMade(e.target.value)} className={inputClass} />
        </div>
      </div>

      {/* Outcome + accuracy + grader note — matches analyst bottom section */}
      <div className="border-t border-gray-200 pt-4 grid md:grid-cols-3 gap-3">
        <div>
          <label className="block text-[10px] font-mono tracking-wider text-gray-500 mb-1 uppercase">Outcome</label>
          <select value={outcome} onChange={e => setOutcome(e.target.value)} className={inputClass}>
            {FANTASY_OUTCOME_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-[10px] font-mono tracking-wider text-gray-500 mb-1 uppercase">Accuracy Score (0–100)</label>
          <input type="number" min={0} max={100} value={accuracy} onChange={e => setAccuracy(e.target.value)}
            className={inputClass} placeholder="e.g. 75" />
        </div>
        <div>
          <label className="block text-[10px] font-mono tracking-wider text-gray-500 mb-1 uppercase">Grader Note</label>
          <input type="text" value={graderNote} onChange={e => setGraderNote(e.target.value)} className={inputClass} placeholder="What actually happened?" />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={isPending}
          className="px-4 py-1.5 rounded-lg text-white text-xs font-semibold transition-colors disabled:opacity-50"
          style={{ backgroundColor: "#15803d" }}
        >
          {isPending ? "Saving…" : "Save changes"}
        </button>
        <button onClick={onClose} className="px-4 py-1.5 rounded-lg border border-gray-300 text-xs text-gray-500 hover:text-gray-800 transition-colors">
          Cancel
        </button>
        {saved && <span className="text-xs text-emerald-600">✓ Saved</span>}
      </div>
    </div>
  );
}

const CATEGORY_LABELS: Record<string, string> = {
  breakout_call: "Breakout Call", bust_call: "Bust Call",
  sleeper_pick: "Sleeper Pick", start_sit: "Start/Sit", waiver_add: "Waiver Add",
};

const ACCURACY_TIERS = [
  { score: 100, label: "Nailed It" },
  { score: 75,  label: "Mostly Right" },
  { score: 60,  label: "Directionally Right" },
  { score: 50,  label: "Half Right" },
  { score: 25,  label: "Mostly Wrong" },
  { score: 0,   label: "Wrong" },
];

type FantasyTakeRow = FantasyScoredTake & { expert_name: string; avatar_url: string | null };

function FantasyTakesPanel() {
  const [takes, setTakes] = useState<FantasyTakeRow[] | null>(null);
  const [isLoading, startLoad] = useTransition();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "pending" | "resolved" | "overdue" | "teasers">("all");
  const [gradingId, setGradingId] = useState<string | null>(null);
  const [gradeNote, setGradeNote] = useState<Record<string, string>>({});
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editExpandedId, setEditExpandedId] = useState<string | null>(null);
  const [aiGradingId, setAiGradingId] = useState<string | null>(null);
  const [aiGradeError, setAiGradeError] = useState<Record<string, string>>({});
  const [aiRatingId, setAiRatingId] = useState<string | null>(null);
  const [aiRateError, setAiRateError] = useState<Record<string, string>>({});
  const [selectedFIds, setSelectedFIds] = useState<Set<string>>(new Set());
  const [fBulking, setFBulking] = useState(false);
  const [gradingAllFantasy, setGradingAllFantasy] = useState(false);
  const [gradingAllProgress, setGradingAllProgress] = useState<{ done: number; total: number } | null>(null);
  const [ratingAllFantasy, setRatingAllFantasy] = useState(false);
  const [ratingAllProgress, setRatingAllProgress] = useState<{ done: number; total: number } | null>(null);
  const [fSortKey, setFSortKey] = useState<"created_at" | "date_made" | "resolution_date" | "expert_name">("created_at");
  const [fSortAsc, setFSortAsc] = useState(false);

  function toggleFSort(key: typeof fSortKey) {
    if (fSortKey === key) setFSortAsc(p => !p);
    else { setFSortKey(key); setFSortAsc(key === "resolution_date"); }
  }

  useEffect(() => {
    startLoad(async () => {
      const all = await getAllFantasyTakesAdmin();
      setTakes(all as FantasyTakeRow[]);
    });
  }, []);

  async function handleGrade(takeId: string, score: number) {
    setGradingId(takeId);
    const result = await gradeFantasyTake(takeId, score, gradeNote[takeId] ?? "");
    if (result.success) {
      setTakes(prev =>
        prev!.map(t => t.fantasy_take_id === takeId
          ? { ...t, outcome_status: "resolved", accuracy_score: score }
          : t
        )
      );
      setExpandedId(null);
      setEditExpandedId(null);
    }
    setGradingId(null);
  }

  function updateFantasyTake(takeId: string, updated: Partial<FantasyTakeRow>) {
    setTakes(prev => prev!.map(t => t.fantasy_take_id === takeId ? { ...t, ...updated } : t));
  }

  async function handleAiGrade(takeId: string) {
    setAiGradingId(takeId);
    setAiGradeError(prev => { const n = { ...prev }; delete n[takeId]; return n; });
    const result = await gradeFantasyTakeSingle(takeId);
    if (result.success && result.accuracy_score != null) {
      setTakes(prev =>
        prev!.map(t => t.fantasy_take_id === takeId
          ? { ...t, outcome_status: "resolved", accuracy_score: result.accuracy_score! }
          : t
        )
      );
      setExpandedId(null);
    } else {
      setAiGradeError(prev => ({ ...prev, [takeId]: result.error ?? "AI grading failed" }));
    }
    setAiGradingId(null);
  }

  async function handleAiRate(takeId: string) {
    setAiRatingId(takeId);
    setAiRateError(prev => { const n = { ...prev }; delete n[takeId]; return n; });
    const result = await rateSingleFantasyTake(takeId);
    if (result.success && result.boldness_score != null) {
      setTakes(prev =>
        prev!.map(t => t.fantasy_take_id === takeId
          ? { ...t, boldness_score: result.boldness_score!, } as FantasyTakeRow
          : t
        )
      );
    } else {
      setAiRateError(prev => ({ ...prev, [takeId]: result.error ?? "AI rating failed" }));
    }
    setAiRatingId(null);
  }

  async function rateAllUnratedFantasy() {
    if (!takes) return;
    const unrated = takes.filter(t => t.boldness_score == null);
    if (unrated.length === 0) return;
    setRatingAllFantasy(true);
    setRatingAllProgress({ done: 0, total: unrated.length });
    for (let i = 0; i < unrated.length; i++) {
      const take = unrated[i];
      setAiRatingId(take.fantasy_take_id);
      const result = await rateSingleFantasyTake(take.fantasy_take_id);
      if (result.success && result.boldness_score != null) {
        setTakes(prev =>
          prev!.map(t => t.fantasy_take_id === take.fantasy_take_id
            ? { ...t, boldness_score: result.boldness_score!, } as FantasyTakeRow
            : t
          )
        );
      }
      setRatingAllProgress({ done: i + 1, total: unrated.length });
    }
    setAiRatingId(null);
    setRatingAllFantasy(false);
    setRatingAllProgress(null);
  }

  async function handleDelete(takeId: string) {
    if (!confirm("Delete this fantasy take permanently?")) return;
    const result = await deleteFantasyTake(takeId);
    if (result.success) setTakes(prev => prev!.filter(t => t.fantasy_take_id !== takeId));
  }

  function toggleFSelect(id: string) {
    setSelectedFIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }
  function deselectFAll() { setSelectedFIds(new Set()); }

  async function bulkFDelete() {
    if (!confirm(`Permanently delete ${selectedFIds.size} fantasy takes?`)) return;
    setFBulking(true);
    for (const id of [...selectedFIds]) {
      const result = await deleteFantasyTake(id);
      if (result.success) setTakes(prev => prev!.filter(t => t.fantasy_take_id !== id));
    }
    setSelectedFIds(new Set());
    setFBulking(false);
  }

  async function bulkFAiGrade() {
    setFBulking(true);
    for (const id of [...selectedFIds]) {
      setAiGradingId(id);
      const result = await gradeFantasyTakeSingle(id);
      if (result.success && result.accuracy_score != null) {
        setTakes(prev => prev!.map(t => t.fantasy_take_id === id
          ? { ...t, outcome_status: "resolved", accuracy_score: result.accuracy_score! } : t));
      } else {
        setAiGradeError(prev => ({ ...prev, [id]: result.error ?? "Failed" }));
      }
    }
    setAiGradingId(null);
    setSelectedFIds(new Set());
    setFBulking(false);
  }

  async function gradeAllPendingFantasy() {
    if (!takes) return;
    const pending = takes.filter(t => t.outcome_status === "pending");
    if (pending.length === 0) return;
    setGradingAllFantasy(true);
    setGradingAllProgress({ done: 0, total: pending.length });
    for (let i = 0; i < pending.length; i++) {
      const take = pending[i];
      setAiGradingId(take.fantasy_take_id);
      const result = await gradeFantasyTakeSingle(take.fantasy_take_id);
      if (result.success && result.accuracy_score != null) {
        setTakes(prev => prev!.map(t => t.fantasy_take_id === take.fantasy_take_id
          ? { ...t, outcome_status: "resolved", accuracy_score: result.accuracy_score! } : t));
      } else {
        setAiGradeError(prev => ({ ...prev, [take.fantasy_take_id]: result.error ?? "Failed" }));
      }
      setGradingAllProgress({ done: i + 1, total: pending.length });
    }
    setAiGradingId(null);
    setGradingAllFantasy(false);
    setGradingAllProgress(null);
  }

  const allTakes = takes ?? [];
  const todayF = new Date().toISOString().split("T")[0];

  const filtered = allTakes
    .filter(t => {
      if (filter === "pending")  return t.outcome_status === "pending" && (t as FantasyTakeRow).content_type !== "teaser_list";
      if (filter === "resolved") return t.outcome_status === "resolved";
      if (filter === "overdue")  return t.outcome_status === "pending" && !!t.resolution_date && t.resolution_date <= todayF;
      if (filter === "teasers")  return (t as FantasyTakeRow).content_type === "teaser_list";
      return true;
    })
    .filter(t => {
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        t.expert_name.toLowerCase().includes(q) ||
        t.raw_text.toLowerCase().includes(q) ||
        (t.player_name ?? "").toLowerCase().includes(q)
      );
    })
    .sort((a, b) => {
      let av = "";
      let bv = "";
      if (fSortKey === "created_at")       { av = a.created_at ?? "";          bv = b.created_at ?? ""; }
      if (fSortKey === "date_made")        { av = a.date_made ?? "";            bv = b.date_made ?? ""; }
      if (fSortKey === "resolution_date")  { av = a.resolution_date ?? "9999";  bv = b.resolution_date ?? "9999"; }
      if (fSortKey === "expert_name")      { av = a.expert_name;                bv = b.expert_name; }
      return fSortAsc ? av.localeCompare(bv) : bv.localeCompare(av);
    });

  const counts = {
    all:      allTakes.length,
    pending:  allTakes.filter(t => t.outcome_status === "pending" && (t as FantasyTakeRow).content_type !== "teaser_list").length,
    resolved: allTakes.filter(t => t.outcome_status === "resolved").length,
    overdue:  allTakes.filter(t => t.outcome_status === "pending" && !!t.resolution_date && t.resolution_date <= todayF).length,
    teasers:  allTakes.filter(t => (t as FantasyTakeRow).content_type === "teaser_list").length,
  };

  return (
    <div className="space-y-5">
      {/* Header row — search + grade-all button */}
      <div className="flex items-center gap-3">
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by guru, player, or take text…"
          className="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-gray-500"
        />
        {(() => {
          const unratedCount = (takes ?? []).filter(t => t.boldness_score == null).length;
          return unratedCount > 0 ? (
            <button
              onClick={rateAllUnratedFantasy}
              disabled={ratingAllFantasy || gradingAllFantasy || fBulking || aiGradingId !== null || aiRatingId !== null}
              className="shrink-0 rounded-lg px-4 py-2 text-sm font-semibold transition-colors disabled:opacity-50"
              style={{ backgroundColor: "#2563eb", color: "#fff" }}
            >
              {ratingAllFantasy && ratingAllProgress
                ? `Rating… ${ratingAllProgress.done}/${ratingAllProgress.total}`
                : `Rate all unrated (${unratedCount})`}
            </button>
          ) : null;
        })()}
        {counts.pending > 0 && (
          <button
            onClick={gradeAllPendingFantasy}
            disabled={gradingAllFantasy || ratingAllFantasy || fBulking || aiGradingId !== null || aiRatingId !== null}
            className="shrink-0 rounded-lg px-4 py-2 text-sm font-semibold text-white transition-colors disabled:opacity-50"
            style={{ backgroundColor: "#15803d" }}
          >
            {gradingAllFantasy && gradingAllProgress
              ? `Grading… ${gradingAllProgress.done}/${gradingAllProgress.total}`
              : `AI grade all pending (${counts.pending})`}
          </button>
        )}
      </div>

      {/* Sort bar */}
      <div className="flex items-center gap-1 text-xs text-gray-500 font-mono">
        <span className="mr-1">SORT:</span>
        {([
          { key: "created_at",      label: "Date Added" },
          { key: "date_made",       label: "Date Made" },
          { key: "resolution_date", label: "Resolves" },
          { key: "expert_name",     label: "Guru" },
        ] as const).map(({ key, label }) => (
          <button
            key={key}
            onClick={() => toggleFSort(key)}
            className={`px-2 py-1 rounded border transition-colors ${
              fSortKey === key
                ? "border-gray-700 bg-gray-900 text-white"
                : "border-gray-300 text-gray-500 hover:border-gray-500"
            }`}
          >
            {label}{fSortKey === key ? (fSortAsc ? " ↑" : " ↓") : ""}
          </button>
        ))}
      </div>

      {/* Filter tabs + select-all */}
      <div className="flex items-center gap-2 flex-wrap">
        {(["all", "pending", "resolved", "overdue", "teasers"] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              filter === f
                ? f === "overdue" ? "bg-red-700 text-white"
                  : f === "teasers" ? "bg-orange-600 text-white"
                  : "text-white"
                : f === "overdue" && counts.overdue > 0
                  ? "text-red-600 border border-red-300 hover:border-red-500 hover:text-red-700"
                  : f === "teasers" && counts.teasers > 0
                    ? "text-orange-600 border border-orange-300 hover:border-orange-500 hover:text-orange-700"
                    : "text-gray-500 hover:text-gray-900 border border-gray-300 hover:border-gray-500"
            }`}
            style={filter === f && f !== "overdue" && f !== "teasers" ? { backgroundColor: "#15803d" } : {}}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)} <span className="opacity-70">({counts[f]})</span>
          </button>
        ))}
        {filtered.length > 0 && (
          <label className="ml-2 flex items-center gap-1.5 text-xs text-gray-500 cursor-pointer select-none">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-gray-400 accent-emerald-700"
              checked={filtered.length > 0 && filtered.every(t => selectedFIds.has(t.fantasy_take_id))}
              onChange={() => {
                filtered.every(t => selectedFIds.has(t.fantasy_take_id))
                  ? deselectFAll()
                  : setSelectedFIds(new Set(filtered.map(t => t.fantasy_take_id)));
              }}
            />
            Select all
          </label>
        )}
      </div>

      {/* Fantasy bulk action bar */}
      {selectedFIds.size > 0 && (
        <div className="flex items-center gap-3 rounded-lg text-white px-4 py-2.5 flex-wrap" style={{ backgroundColor: "#15803d" }}>
          <span className="font-mono text-xs font-semibold">{selectedFIds.size} selected</span>
          <button
            onClick={() => setSelectedFIds(new Set(filtered.map(t => t.fantasy_take_id)))}
            className="text-[11px] text-green-200 hover:text-white underline"
          >Select all</button>
          <button onClick={deselectFAll} className="text-[11px] text-green-200 hover:text-white underline">Deselect all</button>
          <div className="flex-1" />
          {fBulking && <span className="text-xs text-green-200 animate-pulse">Working…</span>}
          <button
            onClick={bulkFAiGrade}
            disabled={fBulking}
            className="px-3 py-1.5 rounded bg-blue-600 hover:bg-blue-500 text-xs font-semibold disabled:opacity-40 transition-colors"
          >
            AI Grade Selected
          </button>
          <button
            onClick={bulkFDelete}
            disabled={fBulking}
            className="px-3 py-1.5 rounded bg-red-600 hover:bg-red-500 text-xs font-semibold disabled:opacity-40 transition-colors"
          >
            Delete Selected
          </button>
        </div>
      )}

      {isLoading && takes === null && (
        <div className="rounded-xl border border-gray-300 p-8 text-center text-gray-400" style={{ backgroundColor: "#f0fdf4" }}>
          Loading fantasy takes…
        </div>
      )}

      {takes !== null && filtered.length === 0 && (
        <div className="rounded-xl border border-gray-300 p-8 text-center text-gray-400" style={{ backgroundColor: "#f0fdf4" }}>
          No fantasy takes in this category.
        </div>
      )}

      {filtered.length > 0 && (
        <div className="rounded-xl border-2 divide-y divide-gray-200" style={{ borderColor: "#15803d", backgroundColor: "#f0fdf4" }}>
          {filtered.map(take => {
            const isGradeExpanded = expandedId === take.fantasy_take_id;
            const isEditExpanded  = editExpandedId === take.fantasy_take_id;
            const isResolved = take.outcome_status === "resolved";

            return (
              <div key={take.fantasy_take_id} className="px-5 py-4">
                <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  className="mt-1 h-4 w-4 rounded border-gray-400 accent-emerald-700 shrink-0 cursor-pointer"
                  checked={selectedFIds.has(take.fantasy_take_id)}
                  onChange={() => toggleFSelect(take.fantasy_take_id)}
                />
                <div className="flex-1 flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Link href={`/experts/${take.expert_id}`} className="font-semibold text-gray-900 hover:text-black text-sm">
                        {take.expert_name}
                      </Link>
                      <span className="text-gray-400 text-xs">·</span>
                      <span className="text-gray-500 text-xs">{take.date_made}</span>
                      <span className="rounded-full px-2 py-0.5 text-[10px] font-bold text-white" style={{ backgroundColor: "#15803d" }}>
                        {CATEGORY_LABELS[take.category] ?? take.category}
                      </span>
                      {(take as FantasyTakeRow).content_type === "teaser_list" && (
                        <span className="rounded-full px-2 py-0.5 text-[10px] font-bold text-white bg-orange-500">
                          Teaser — No Players
                        </span>
                      )}
                      {take.player_name && (
                        <span className="text-gray-700 text-xs font-semibold">
                          {take.player_name}{take.player_position ? ` (${take.player_position})` : ""}
                        </span>
                      )}
                      {take.timing_window && (
                        <span className="text-gray-400 text-xs">{take.timing_window.replace(/_/g, " ")}</span>
                      )}
                      {(take as FantasyTakeRow & { format?: string }).format && (take as FantasyTakeRow & { format?: string }).format !== "both" && (
                        <span className="rounded px-1.5 py-0.5 text-[10px] font-mono"
                          style={{
                            backgroundColor: (take as FantasyTakeRow & { format?: string }).format === "dynasty" ? "#ede9fe" : "#e0f2fe",
                            color: (take as FantasyTakeRow & { format?: string }).format === "dynasty" ? "#7c3aed" : "#0284c7"
                          }}>
                          {(take as FantasyTakeRow & { format?: string }).format}
                        </span>
                      )}
                    </div>

                    <p className="mt-1.5 text-sm text-gray-700 leading-relaxed line-clamp-2">
                      "{take.raw_text}"
                    </p>

                    <div className="mt-1 flex items-center gap-2 flex-wrap text-xs text-gray-400 font-mono">
                      {take.sport_season && <span>{take.sport_season}</span>}
                      {take.boldness_score != null && <span>· Boldness {take.boldness_score}</span>}
                    </div>
                  </div>

                  <div className="shrink-0 flex flex-col items-end gap-2">
                    {take.resolution_date && !isResolved && (
                      <ResolveBadge date={take.resolution_date} />
                    )}
                    <span className="font-mono text-xs font-black" style={{ color: isResolved ? "#15803d" : "#d97706" }}>
                      {isResolved
                        ? take.accuracy_score != null ? `${take.accuracy_score}% ACC` : "RESOLVED"
                        : "PENDING"}
                    </span>

                    <div className="flex items-center gap-2 flex-wrap justify-end">
                      {/* Rate it button — sets boldness + grading criteria */}
                      {aiRatingId !== take.fantasy_take_id && (
                        <button
                          onClick={() => handleAiRate(take.fantasy_take_id)}
                          disabled={aiRatingId !== null || aiGradingId !== null}
                          className="rounded-lg border px-3 py-1 text-xs transition-colors disabled:opacity-40"
                          style={{ borderColor: "#93c5fd", color: "#2563eb" }}
                          title={take.boldness_score != null ? "Re-rate (boldness + criteria)" : "Rate this take"}
                        >
                          {take.boldness_score != null ? "Re-rate ✦" : "Rate it ✦"}
                        </button>
                      )}
                      {aiRatingId === take.fantasy_take_id && (
                        <span className="text-xs animate-pulse" style={{ color: "#2563eb" }}>Rating…</span>
                      )}
                      {aiRateError[take.fantasy_take_id] && (
                        <span className="text-xs text-red-500">{aiRateError[take.fantasy_take_id]}</span>
                      )}

                      {/* AI Grade it button — only for unresolved non-teasers */}
                      {!isResolved && (take as FantasyTakeRow).content_type !== "teaser_list" && aiGradingId !== take.fantasy_take_id && (
                        <button
                          onClick={() => handleAiGrade(take.fantasy_take_id)}
                          disabled={aiGradingId !== null || aiRatingId !== null}
                          className="rounded-lg border border-blue-300 text-blue-600 hover:border-blue-500 hover:text-blue-800 hover:bg-blue-50 px-3 py-1 text-xs transition-colors disabled:opacity-40"
                        >
                          Grade it ✦
                        </button>
                      )}
                      {aiGradingId === take.fantasy_take_id && (
                        <span className="text-xs text-blue-500 animate-pulse">Searching…</span>
                      )}
                      {/* Manual Grade panel toggle — hidden for teasers */}
                      {!isResolved && (take as FantasyTakeRow).content_type !== "teaser_list" && (
                        <button
                          onClick={() => { setExpandedId(isGradeExpanded ? null : take.fantasy_take_id); setEditExpandedId(null); }}
                          className={`rounded-lg border px-3 py-1 text-xs transition-colors ${
                            isGradeExpanded
                              ? "border-green-600 text-green-800 bg-green-50"
                              : "border-gray-300 text-gray-500 hover:border-gray-500"
                          }`}
                        >
                          {isGradeExpanded ? "Close" : "Grade"}
                        </button>
                      )}
                      {/* Edit button — always available */}
                      <button
                        onClick={() => { setEditExpandedId(isEditExpanded ? null : take.fantasy_take_id); setExpandedId(null); }}
                        className={`rounded-lg border px-3 py-1 text-xs transition-colors ${
                          isEditExpanded
                            ? "border-gray-600 text-gray-900 bg-gray-100"
                            : "border-gray-300 text-gray-500 hover:border-gray-500 hover:text-gray-800"
                        }`}
                      >
                        {isEditExpanded ? "Close" : "Edit"}
                      </button>
                      {/* Delete */}
                      <button
                        onClick={() => handleDelete(take.fantasy_take_id)}
                        className="rounded-lg border border-red-200 text-red-400 hover:border-red-400 hover:text-red-600 hover:bg-red-50 px-2 py-1 text-xs transition-colors"
                        title="Delete"
                      >
                        🗑
                      </button>
                    </div>
                    {aiGradeError[take.fantasy_take_id] && (
                      <p className="text-[10px] text-red-400 text-right max-w-[200px]">
                        {aiGradeError[take.fantasy_take_id]}
                      </p>
                    )}
                  </div>
                </div>

                </div>{/* end flex items-start gap-3 */}

                {/* Grade panel — stacks below the row */}
                {isGradeExpanded && (
                  <div className="mt-3 rounded-lg border border-green-200 bg-white p-4 space-y-3">
                    <p className="text-xs font-mono text-gray-500 uppercase tracking-wider">Grade this take</p>
                    <div className="flex flex-wrap gap-2">
                      {ACCURACY_TIERS.map(tier => (
                        <button
                          key={tier.score}
                          onClick={() => handleGrade(take.fantasy_take_id, tier.score)}
                          disabled={gradingId === take.fantasy_take_id}
                          className="px-3 py-1.5 rounded-lg border text-xs font-semibold transition-colors disabled:opacity-50 hover:text-white"
                          style={{ borderColor: "#15803d", color: "#15803d" }}
                          onMouseEnter={e => { (e.target as HTMLElement).style.backgroundColor = "#15803d"; (e.target as HTMLElement).style.color = "white"; }}
                          onMouseLeave={e => { (e.target as HTMLElement).style.backgroundColor = ""; (e.target as HTMLElement).style.color = "#15803d"; }}
                        >
                          {tier.score}% — {tier.label}
                        </button>
                      ))}
                    </div>
                    <input
                      type="text"
                      placeholder="Grader note (optional)…"
                      value={gradeNote[take.fantasy_take_id] ?? ""}
                      onChange={e => setGradeNote(prev => ({ ...prev, [take.fantasy_take_id]: e.target.value }))}
                      className="w-full rounded border border-gray-300 px-3 py-1.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none"
                    />
                    {gradingId === take.fantasy_take_id && (
                      <p className="text-xs text-green-600 animate-pulse">Saving…</p>
                    )}
                  </div>
                )}

                {/* Edit panel — stacks below the row */}
                {isEditExpanded && (
                  <FantasyEditPanel
                    take={take}
                    onSaved={(updated) => updateFantasyTake(take.fantasy_take_id, updated)}
                    onClose={() => setEditExpandedId(null)}
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
