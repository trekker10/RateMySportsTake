"use client";

import { useState, useEffect, useTransition } from "react";
import { getAnalystDashboard, getAnalystTakeDetail, recalculateAllTakeScores, type AnalystDashboardRow } from "@/app/actions/takescore";
import Link from "next/link";
import Avatar from "@/components/Avatar";

type SortKey = keyof Pick<AnalystDashboardRow, "takeScore" | "totalTakes" | "gradedTakes" | "avgBoldness" | "avgAccuracy" | "volumeMult" | "decayMult">;

export default function AnalystDashboard() {
  const [rows, setRows] = useState<AnalystDashboardRow[]>([]);
  const [sortKey, setSortKey] = useState<SortKey>("takeScore");
  const [sortAsc, setSortAsc] = useState(false);
  const [detail, setDetail] = useState<string | null>(null);
  const [detailTakes, setDetailTakes] = useState<Awaited<ReturnType<typeof getAnalystTakeDetail>>>([]);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    startTransition(async () => {
      const data = await getAnalystDashboard();
      setRows(data);
    });
  }, []);

  function handleSort(key: SortKey) {
    if (sortKey === key) setSortAsc(p => !p);
    else { setSortKey(key); setSortAsc(false); }
  }

  function openDetail(expertId: string) {
    setDetail(expertId);
    startTransition(async () => {
      const { getAnalystTakeDetail: fn } = await import("@/app/actions/takescore");
      const data = await fn(expertId);
      setDetailTakes(data);
    });
  }

  function handleRecalcAll() {
    startTransition(async () => {
      await recalculateAllTakeScores();
      const data = await getAnalystDashboard();
      setRows(data);
    });
  }

  const sorted = [...rows].sort((a, b) => {
    const av = a[sortKey] as number;
    const bv = b[sortKey] as number;
    return sortAsc ? av - bv : bv - av;
  });

  const SortBtn = ({ label, k }: { label: string; k: SortKey }) => (
    <button onClick={() => handleSort(k)} className="flex items-center gap-1 font-mono text-[10px] tracking-wider text-zinc-400 hover:text-zinc-200 transition-colors">
      {label}
      {sortKey === k && <span>{sortAsc ? "↑" : "↓"}</span>}
    </button>
  );

  if (detail) {
    const analyst = rows.find(r => r.expert_id === detail);
    return (
      <div className="space-y-4">
        <button onClick={() => setDetail(null)} className="text-sm text-zinc-400 hover:text-zinc-200 transition-colors">
          ← Back to dashboard
        </button>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-zinc-700 overflow-hidden flex items-center justify-center text-sm font-bold">
            <Avatar name={analyst?.name ?? ""} avatarUrl={analyst?.avatar_url} className="w-full h-full object-cover" textClassName="text-sm font-bold text-zinc-300" />
          </div>
          <div>
            <p className="font-bold text-zinc-100">{analyst?.name}</p>
            <p className="text-sm text-zinc-400">TakeScore: <span className="text-white font-black">{Math.round(analyst?.takeScore ?? 0)}<span className="text-xs font-normal text-zinc-500">/100</span></span> · V: {analyst?.volumeMult} · D: {analyst?.decayMult}</p>
          </div>
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-900 overflow-hidden">
          <div className="grid px-4 py-2.5 bg-zinc-800 text-zinc-400 font-mono text-[10px] tracking-wider"
            style={{ gridTemplateColumns: "1fr 50px 50px 50px 50px 80px 1fr" }}>
            <div>TAKE</div><div>A</div><div>B</div><div>BC</div><div>R</div><div>IMPACT</div><div>OUTCOME</div>
          </div>
          {detailTakes.length === 0 && (
            <p className="px-4 py-6 text-center text-zinc-500 text-sm">No graded takes yet.</p>
          )}
          {detailTakes.map((t, i) => (
            <div key={t.take_id}
              className="grid px-4 py-3 text-sm items-start"
              style={{ gridTemplateColumns: "1fr 50px 50px 50px 50px 80px 1fr", borderTop: i > 0 ? "1px solid #27272a" : undefined }}
            >
              <p className="text-zinc-300 text-xs pr-2 line-clamp-2">{t.summary ?? t.raw_text}</p>
              <p className="text-zinc-200 font-mono">{t.accuracy_score ?? "—"}</p>
              <p className="text-zinc-200 font-mono">{t.boldness_score ?? "—"}</p>
              <p className={`font-mono ${(t.boldness_credit ?? 0) > 0 ? "text-emerald-400" : (t.boldness_credit ?? 0) < 0 ? "text-red-400" : "text-zinc-500"}`}>
                {t.boldness_credit != null ? (t.boldness_credit >= 0 ? `+${t.boldness_credit}` : t.boldness_credit) : "—"}
              </p>
              <p className="text-zinc-400 font-mono">{t.recency_weight ?? "—"}</p>
              <p className="font-black text-zinc-100">{t.impact_score != null ? t.impact_score.toFixed(1) : "—"}</p>
              <p className="text-xs text-zinc-500">{t.outcome_status.replace(/_/g, " ")}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-zinc-400">{rows.length} analysts · sortable by any column</p>
        <button
          onClick={handleRecalcAll}
          disabled={isPending}
          className="px-4 py-2 rounded-lg border border-zinc-700 text-sm text-zinc-300 hover:border-zinc-500 hover:text-zinc-100 transition-colors disabled:opacity-50"
        >
          {isPending ? "Recalculating…" : "Recalculate All"}
        </button>
      </div>

      <div className="rounded-xl border border-zinc-800 bg-zinc-900 overflow-hidden overflow-x-auto">
        {/* Header */}
        <div className="grid px-4 py-2.5 bg-zinc-800 min-w-[700px]"
          style={{ gridTemplateColumns: "200px 80px 60px 70px 80px 70px 70px 100px" }}>
          <div className="font-mono text-[10px] tracking-wider text-zinc-400">ANALYST</div>
          <SortBtn label="SCORE" k="takeScore" />
          <SortBtn label="TAKES" k="totalTakes" />
          <SortBtn label="GRADED" k="gradedTakes" />
          <SortBtn label="AVG BOLD" k="avgBoldness" />
          <SortBtn label="VOL" k="volumeMult" />
          <SortBtn label="DECAY" k="decayMult" />
          <div className="font-mono text-[10px] tracking-wider text-zinc-400">LAST TAKE</div>
        </div>

        {sorted.map((row, i) => (
          <button
            key={row.expert_id}
            onClick={() => openDetail(row.expert_id)}
            className="w-full grid px-4 py-3 hover:bg-zinc-800/50 transition-colors text-left min-w-[700px]"
            style={{ gridTemplateColumns: "200px 80px 60px 70px 80px 70px 70px 100px", borderTop: i > 0 ? "1px solid #27272a" : undefined }}
          >
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-7 h-7 rounded-full bg-zinc-700 shrink-0 overflow-hidden flex items-center justify-center text-xs font-bold text-zinc-300">
                <Avatar name={row.name} avatarUrl={row.avatar_url} className="w-full h-full object-cover" textClassName="text-xs font-bold text-zinc-300" />
              </div>
              <span className="text-sm font-semibold text-zinc-100 truncate">{row.name}</span>
            </div>
            <div className="font-black text-lg text-zinc-100">{Math.round(row.takeScore)}<span className="text-xs font-normal text-zinc-500">/100</span></div>
            <div className="text-sm text-zinc-300">{row.totalTakes}</div>
            <div className="text-sm text-zinc-300">{row.gradedTakes}</div>
            <div className="text-sm text-zinc-300">{row.avgBoldness.toFixed(1)}</div>
            <div className="text-sm text-zinc-400">{row.volumeMult.toFixed(2)}×</div>
            <div className="text-sm text-zinc-400">{row.decayMult.toFixed(2)}×</div>
            <div className="text-xs text-zinc-500">{row.lastTakeDate ?? "—"}</div>
          </button>
        ))}
        {rows.length === 0 && !isPending && (
          <p className="px-4 py-8 text-center text-zinc-500 text-sm">No analysts yet.</p>
        )}
      </div>
    </div>
  );
}
