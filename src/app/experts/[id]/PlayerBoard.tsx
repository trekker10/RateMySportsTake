"use client";

import { useState } from "react";
import type { PlayerBoardRow } from "@/app/actions/player-board";

const POSITIONS = ["All", "QB", "RB", "WR", "TE"] as const;
type PosFilter = typeof POSITIONS[number];

function RatingCell({ rating }: { rating: number | null }) {
  if (rating == null) return <span className="text-gray-300">—</span>;
  if (rating === 5) return (
    <span className="inline-flex items-center gap-1.5">
      <span className="font-black text-green-600" style={{ fontSize: 18, lineHeight: 1 }}>↑↑</span>
      <span className="font-mono text-[10px] font-bold text-green-700 uppercase tracking-wide">Buy</span>
      <span className="text-[9px] font-bold bg-green-100 text-green-700 border border-green-300 px-1.5 py-0.5 rounded-full uppercase tracking-wide">Breakout</span>
    </span>
  );
  if (rating === 4) return (
    <span className="inline-flex items-center gap-1.5">
      <span className="font-black text-green-500" style={{ fontSize: 18, lineHeight: 1 }}>↑</span>
      <span className="font-mono text-[10px] font-bold text-green-600 uppercase tracking-wide">Buy</span>
    </span>
  );
  if (rating === 3) return (
    <span className="inline-flex items-center gap-1.5">
      <span className="font-black text-gray-400" style={{ fontSize: 18, lineHeight: 1 }}>→</span>
      <span className="font-mono text-[10px] font-bold text-gray-400 uppercase tracking-wide">Neutral</span>
    </span>
  );
  if (rating === 2) return (
    <span className="inline-flex items-center gap-1.5">
      <span className="font-black text-red-500" style={{ fontSize: 18, lineHeight: 1 }}>↓</span>
      <span className="font-mono text-[10px] font-bold text-red-600 uppercase tracking-wide">Avoid</span>
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="font-black text-red-600" style={{ fontSize: 18, lineHeight: 1 }}>↓↓</span>
      <span className="font-mono text-[10px] font-bold text-red-700 uppercase tracking-wide">Avoid</span>
      <span className="text-[9px] font-bold bg-red-100 text-red-700 border border-red-300 px-1.5 py-0.5 rounded-full uppercase tracking-wide">Bust</span>
    </span>
  );
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
}

export default function PlayerBoard({ rows }: { rows: PlayerBoardRow[] }) {
  const [pos, setPos] = useState<PosFilter>("All");

  const filtered = pos === "All" ? rows : rows.filter(r => r.player_position === pos);

  if (rows.length === 0) {
    return (
      <div className="bg-white border-2 border-gray-900 p-5 mt-4">
        <p className="font-mono text-[11px] tracking-[0.18em] text-gray-400 uppercase mb-2">Player Board</p>
        <p className="italic text-sm text-gray-400">No player ratings yet — extract takes from Instagram videos to populate this board.</p>
      </div>
    );
  }

  return (
    <div className="bg-white border-2 border-gray-900 mt-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-b-2 border-gray-900">
        <p className="font-mono text-[11px] tracking-[0.18em] text-gray-400 uppercase">Player Board</p>
        <div className="flex gap-1">
          {POSITIONS.map(p => (
            <button
              key={p}
              onClick={() => setPos(p)}
              className={`px-2.5 py-1 font-mono text-[10px] tracking-widest uppercase border transition-colors ${
                pos === p
                  ? "bg-gray-900 text-white border-gray-900"
                  : "bg-white text-gray-500 border-gray-300 hover:border-gray-600"
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <p className="italic text-sm text-gray-400 px-5 py-4">No {pos} ratings yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left px-5 py-2.5 font-mono text-[10px] tracking-widest text-gray-400 uppercase">Player</th>
                <th className="text-left px-3 py-2.5 font-mono text-[10px] tracking-widest text-gray-400 uppercase">Pos</th>
                <th className="text-left px-3 py-2.5 font-mono text-[10px] tracking-widest text-gray-400 uppercase">Team</th>
                <th className="text-left px-3 py-2.5 font-mono text-[10px] tracking-widest text-gray-400 uppercase">Rating</th>
                <th className="text-left px-3 py-2.5 font-mono text-[10px] tracking-widest text-gray-400 uppercase hidden md:table-cell">ADP</th>
                <th className="text-left px-3 py-2.5 font-mono text-[10px] tracking-widest text-gray-400 uppercase hidden md:table-cell">Date</th>
                <th className="px-3 py-2.5"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row, i) => (
                <tr key={row.fantasy_take_id} className={`border-b border-gray-100 ${i % 2 === 0 ? "bg-white" : "bg-gray-50"} hover:bg-yellow-50 transition-colors`}>
                  <td className="px-5 py-3 font-semibold text-gray-900">{row.player_name ?? "—"}</td>
                  <td className="px-3 py-3">
                    <span className="font-mono text-[10px] font-bold text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                      {row.player_position ?? "—"}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-gray-600 font-mono text-xs">{row.team ?? "—"}</td>
                  <td className="px-3 py-3"><RatingCell rating={row.player_rating} /></td>
                  <td className="px-3 py-3 text-gray-400 font-mono text-xs hidden md:table-cell">
                    {row.player_adp != null ? row.player_adp.toFixed(1) : "—"}
                  </td>
                  <td className="px-3 py-3 text-gray-400 text-xs hidden md:table-cell">{formatDate(row.date_made)}</td>
                  <td className="px-3 py-3 text-right">
                    {row.source_url ? (
                      <a
                        href={row.source_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-gray-400 hover:text-gray-900 transition-colors"
                        title="Source video"
                      >
                        <svg className="w-4 h-4 inline" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                          <path d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4"/>
                          <path d="M14 4h6m0 0v6m0-6L10 14"/>
                        </svg>
                      </a>
                    ) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="px-5 py-2 text-[10px] font-mono text-gray-300 uppercase tracking-wider border-t border-gray-100">
        {filtered.length} player{filtered.length !== 1 ? "s" : ""} · most recent rating per player
      </p>
    </div>
  );
}
