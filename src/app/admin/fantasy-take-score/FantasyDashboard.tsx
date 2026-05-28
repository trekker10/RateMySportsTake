"use client";

import React, { useState } from "react";
import { scoreToGrade, gradeColor } from "@/lib/takescore";
import { FANTASY_DEFAULT_CONFIG, TAKE_CATEGORIES, FANTASY_ACCOLADE_DEFS } from "@/lib/fantasy-takescore";
import { getFantasyTakesForExpert } from "@/app/actions/fantasy-takes";
import type { FantasyDashboardRow } from "@/app/actions/fantasy-takescore";
import type { FantasyScoredTake } from "@/lib/fantasy-takescore";

const CATEGORY_COLORS: Record<string, string> = {
  breakout:  "bg-green-900 text-green-300",
  bust:      "bg-red-900 text-red-300",
  sleeper:   "bg-purple-900 text-purple-300",
  start_sit: "bg-blue-900 text-blue-300",
  waiver:    "bg-yellow-900 text-yellow-300",
};

function CategoryBadge({ category }: { category: string }) {
  const catDef = TAKE_CATEGORIES.find(c => c.value === category);
  const color = CATEGORY_COLORS[category] ?? "bg-zinc-800 text-zinc-400";
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider ${color}`}>
      {catDef?.label ?? category}
    </span>
  );
}

function AccoladePip({ accoladeKey }: { accoladeKey: string }) {
  const def = FANTASY_ACCOLADE_DEFS.find(d => d.key === accoladeKey);
  if (!def) return null;
  return (
    <span title={def.label} className="text-base cursor-default">
      {def.emoji}
    </span>
  );
}

type SortKey = "fantasy_overall_rating" | "fantasy_graded_takes" | "fantasy_boldness_avg" | "fantasy_accuracy_rate";

export default function FantasyDashboard({ experts }: { experts: FantasyDashboardRow[] }) {
  const [sortKey, setSortKey] = useState<SortKey>("fantasy_overall_rating");
  const [sortAsc, setSortAsc] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [expandedTakes, setExpandedTakes] = useState<FantasyScoredTake[]>([]);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const sorted = [...experts].sort((a, b) => {
    const av = a[sortKey] ?? 0;
    const bv = b[sortKey] ?? 0;
    return sortAsc ? (av as number) - (bv as number) : (bv as number) - (av as number);
  });

  function handleSort(key: SortKey) {
    if (sortKey === key) setSortAsc(prev => !prev);
    else { setSortKey(key); setSortAsc(false); }
  }

  async function handleRowClick(expertId: string) {
    if (expandedId === expertId) {
      setExpandedId(null);
      setExpandedTakes([]);
      return;
    }
    setLoadingId(expertId);
    try {
      const takes = await getFantasyTakesForExpert(expertId);
      setExpandedTakes(takes);
      setExpandedId(expertId);
    } finally {
      setLoadingId(null);
    }
  }

  function SortHeader({ label, field }: { label: string; field: SortKey }) {
    const active = sortKey === field;
    return (
      <th
        className="px-3 py-2 text-left text-xs font-semibold text-zinc-400 uppercase tracking-wider cursor-pointer hover:text-zinc-200 select-none"
        onClick={() => handleSort(field)}
      >
        {label} {active ? (sortAsc ? "↑" : "↓") : ""}
      </th>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-800">
              <th className="px-3 py-2 text-left text-xs font-semibold text-zinc-400 uppercase tracking-wider w-10">#</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-zinc-400 uppercase tracking-wider">Analyst</th>
              <SortHeader label="F-Score" field="fantasy_overall_rating" />
              <SortHeader label="Takes" field="fantasy_graded_takes" />
              <SortHeader label="Avg Bold" field="fantasy_boldness_avg" />
              <SortHeader label="Avg Acc" field="fantasy_accuracy_rate" />
              <th className="px-3 py-2 text-left text-xs font-semibold text-zinc-400 uppercase tracking-wider">Last Take</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-zinc-400 uppercase tracking-wider">Accolades</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((expert, i) => {
              const grade = expert.fantasy_overall_rating > 0
                ? scoreToGrade(expert.fantasy_overall_rating, FANTASY_DEFAULT_CONFIG)
                : "—";
              const color = expert.fantasy_overall_rating > 0
                ? gradeColor(grade)
                : "#6b7280";
              const isExpanded = expandedId === expert.expert_id;
              const isLoading = loadingId === expert.expert_id;

              return (
                <React.Fragment key={expert.expert_id}>
                  <tr
                    className={`border-b border-zinc-800 cursor-pointer transition-colors ${
                      isExpanded ? "bg-zinc-800" : "hover:bg-zinc-800/50"
                    }`}
                    onClick={() => handleRowClick(expert.expert_id)}
                  >
                    <td className="px-3 py-3 text-zinc-500 text-xs">{i + 1}</td>
                    <td className="px-3 py-3">
                      <span className="font-medium text-zinc-100">{expert.name}</span>
                      {expert.is_fantasy_guru && (
                        <span className="ml-2 text-[10px] text-green-400 font-semibold">GURU</span>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      <span className="font-black text-lg leading-none" style={{ color }}>
                        {grade}
                      </span>
                      {expert.fantasy_overall_rating > 0 && (
                        <span className="ml-1 text-xs text-zinc-500">
                          ({Math.round(expert.fantasy_overall_rating * 10) / 10})
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-zinc-300">{expert.fantasy_graded_takes}</td>
                    <td className="px-3 py-3 text-zinc-300">{Math.round(expert.fantasy_boldness_avg)}</td>
                    <td className="px-3 py-3 text-zinc-300">
                      {expert.fantasy_accuracy_rate > 0
                        ? `${Math.round(expert.fantasy_accuracy_rate)}%`
                        : "—"}
                    </td>
                    <td className="px-3 py-3 text-zinc-400 text-xs">
                      {expert.fantasy_last_take_date ?? "—"}
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex gap-0.5">
                        {expert.accolades.map(k => (
                          <AccoladePip key={k} accoladeKey={k} />
                        ))}
                      </div>
                    </td>
                  </tr>

                  {isExpanded && (
                    <tr className="bg-zinc-900/80">
                      <td colSpan={8} className="px-4 pb-4 pt-2">
                        {isLoading ? (
                          <p className="text-sm text-zinc-500 py-2">Loading takes…</p>
                        ) : expandedTakes.length === 0 ? (
                          <p className="text-sm text-zinc-500 italic py-2">No fantasy takes yet.</p>
                        ) : (
                          <div className="space-y-2">
                            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                              Take History ({expandedTakes.length})
                            </p>
                            <div className="space-y-1.5 max-h-80 overflow-y-auto pr-1">
                              {expandedTakes.map(take => (
                                <div
                                  key={take.fantasy_take_id}
                                  className="flex items-start gap-3 text-xs bg-zinc-800 rounded-lg px-3 py-2"
                                >
                                  <CategoryBadge category={take.category} />
                                  <div className="flex-1 min-w-0">
                                    {take.player_name && (
                                      <span className="font-semibold text-zinc-200 mr-1">
                                        {take.player_name}
                                        {take.player_position && (
                                          <span className="text-zinc-500 ml-1">({take.player_position})</span>
                                        )}
                                      </span>
                                    )}
                                    <span className="text-zinc-400 line-clamp-1">{take.raw_text}</span>
                                  </div>
                                  <div className="flex items-center gap-3 shrink-0 text-zinc-500">
                                    {take.player_adp && (
                                      <span>ADP {take.player_adp}</span>
                                    )}
                                    <span>Bold {take.boldness_score ?? "—"}</span>
                                    <span>
                                      Acc{" "}
                                      {take.accuracy_score != null
                                        ? `${take.accuracy_score}%`
                                        : "pending"}
                                    </span>
                                    {take.impact_score != null && (
                                      <span>Impact {Math.round(take.impact_score * 10) / 10}</span>
                                    )}
                                    {take.timing_window && (
                                      <span className="text-zinc-600">{take.timing_window}</span>
                                    )}
                                    <span className="text-zinc-600">{take.date_made}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>

        {sorted.length === 0 && (
          <div className="py-12 text-center text-zinc-500 italic">
            No analysts with fantasy takes yet.
          </div>
        )}
      </div>
    </div>
  );
}
