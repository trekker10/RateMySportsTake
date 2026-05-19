"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";

const SPORTS = ["NBA", "NFL", "MLB", "NHL", "Soccer", "CFB", "CBB", "MMA", "Golf", "Tennis"];

const VERDICT_FILTERS = [
  { label: "WRONG ONLY", value: "wrong" },
  { label: "RIGHT ONLY",  value: "right" },
  { label: "PENDING",     value: "pending" },
];

export default function TakesSearch() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [q, setQ]           = useState(searchParams.get("q") ?? "");
  const [sport, setSport]   = useState(searchParams.get("sport") ?? "");
  const [verdict, setVerdict] = useState(searchParams.get("verdict") ?? "");
  const [isPending, startTransition] = useTransition();

  function push(overrides: { q?: string; sport?: string; verdict?: string }) {
    const next = { q, sport, verdict, ...overrides };
    const params = new URLSearchParams();
    if (next.q.trim())   params.set("q", next.q.trim());
    if (next.sport)      params.set("sport", next.sport);
    if (next.verdict)    params.set("verdict", next.verdict);
    startTransition(() => router.push(`/takes?${params.toString()}`));
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    push({});
  }

  function removeSport()  { setSport("");  push({ sport: "" }); }
  function removeVerdict(){ setVerdict(""); push({ verdict: "" }); }

  const activeFilters = [
    sport   && { key: "sport",   label: sport,                  onRemove: removeSport },
    verdict && { key: "verdict", label: VERDICT_FILTERS.find(v => v.value === verdict)?.label ?? verdict, onRemove: removeVerdict },
  ].filter(Boolean) as { key: string; label: string; onRemove: () => void }[];

  return (
    <div className="space-y-3">
      {/* Search bar */}
      <form onSubmit={handleSearch} className="flex items-stretch border-2 border-gray-900 bg-white">
        <div className="flex items-center px-4 border-r-2 border-gray-900 shrink-0">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
            <circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" />
          </svg>
        </div>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="search takes, topics, players…"
          className="flex-1 px-4 py-4 bg-transparent text-gray-900 placeholder-gray-400 focus:outline-none text-base min-w-0"
        />
        <div className="flex items-center border-l-2 border-gray-900 shrink-0">
          <button
            type="submit"
            className="px-3 py-2 bg-gray-900 text-white font-mono text-[11px] tracking-widest"
          >
            TAKES
          </button>
          <button
            type="button"
            onClick={() => { startTransition(() => router.push(`/experts?q=${encodeURIComponent(q)}`)); }}
            className="px-3 py-2 font-mono text-[11px] tracking-widest text-gray-400 hover:text-gray-700 transition-colors"
          >
            ANALYSTS
          </button>
        </div>
      </form>

      {/* Filters row */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-mono text-[10px] tracking-[0.15em] text-gray-400 uppercase">Filters:</span>

        {/* Active filters */}
        {activeFilters.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={f.onRemove}
            className="flex items-center gap-1 px-2.5 py-1 border border-gray-700 bg-white font-mono text-[10px] tracking-wider text-gray-700 hover:bg-gray-50"
          >
            {f.label} <span className="text-gray-400 ml-0.5">✕</span>
          </button>
        ))}

        {/* Sport chips */}
        {SPORTS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => { const next = sport === s ? "" : s; setSport(next); push({ sport: next }); }}
            className={`px-2.5 py-1 font-mono text-[10px] tracking-wider border transition-colors ${
              sport === s
                ? "bg-gray-900 text-white border-gray-900"
                : "bg-white text-gray-500 border-gray-300 hover:border-gray-600"
            }`}
          >
            {s}
          </button>
        ))}

        {/* Verdict filters */}
        {VERDICT_FILTERS.map((vf) => (
          <button
            key={vf.value}
            type="button"
            onClick={() => { const next = verdict === vf.value ? "" : vf.value; setVerdict(next); push({ verdict: next }); }}
            className={`px-2.5 py-1 font-mono text-[10px] tracking-wider border transition-colors ${
              verdict === vf.value
                ? "bg-gray-900 text-white border-gray-900"
                : "bg-white text-gray-500 border-gray-300 hover:border-gray-600"
            }`}
          >
            {vf.label}
          </button>
        ))}

        {isPending && <span className="font-mono text-[10px] text-gray-400 ml-2">…</span>}
      </div>
    </div>
  );
}
