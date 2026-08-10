"use client";

import { useState } from "react";
import FantasyTakeLogSection from "./FantasyTakeLogSection";
import PlayerBoard from "./PlayerBoard";
import type { PlayerBoardRow } from "@/app/actions/player-board";
import Link from "next/link";

type FantasyTake = {
  fantasy_take_id: string;
  category: string;
  raw_text: string | null;
  player_name: string | null;
  player_position: string | null;
  timing_window: string | null;
  boldness_score: number | null;
  outcome_status: string;
  accuracy_score: number | null;
  grader_note?: string | null;
  date_made: string;
  resolution_date: string | null;
  sport_season: string | null;
};

const FANTASY_VERDICT_FILTERS = ["all", "right", "wrong", "pending"] as const;
type FantasyVerdictFilter = typeof FANTASY_VERDICT_FILTERS[number];

type Tab = "board" | "log";

interface Props {
  takes: FantasyTake[];
  playerBoardRows: PlayerBoardRow[];
  fantasyVerdict: FantasyVerdictFilter;
  expertId: string;        // used for filter links
  expertSlugOrId: string;  // slug or uuid — used in hrefs
}

export default function FantasyAnalystTabs({
  takes,
  playerBoardRows,
  fantasyVerdict,
  expertSlugOrId,
}: Props) {
  const [tab, setTab] = useState<Tab>("board");

  const filteredTakes = takes.filter(ft => {
    if (fantasyVerdict === "right")   return ft.outcome_status === "resolved" && (ft.accuracy_score ?? 0) >= 50;
    if (fantasyVerdict === "wrong")   return ft.outcome_status === "resolved" && (ft.accuracy_score ?? 0) < 50;
    if (fantasyVerdict === "pending") return ft.outcome_status !== "resolved";
    return true;
  });

  return (
    <div>
      {/* ── Tab bar ── */}
      <div className="flex border-b-2 border-gray-900 mb-0">
        <button
          onClick={() => setTab("board")}
          className={`px-5 py-3 font-mono text-[11px] tracking-[0.18em] uppercase font-bold transition-colors border-r-2 border-gray-900 ${
            tab === "board"
              ? "bg-gray-900 text-white"
              : "bg-white text-gray-500 hover:text-gray-900 hover:bg-gray-50"
          }`}
        >
          Player Board
        </button>
        <button
          onClick={() => setTab("log")}
          className={`px-5 py-3 font-mono text-[11px] tracking-[0.18em] uppercase font-bold transition-colors ${
            tab === "log"
              ? "bg-gray-900 text-white"
              : "bg-white text-gray-500 hover:text-gray-900 hover:bg-gray-50"
          }`}
        >
          Call Log
        </button>
      </div>

      {/* ── Tab content ── */}
      {tab === "board" && (
        <PlayerBoard rows={playerBoardRows} />
      )}

      {tab === "log" && (
        <div>
          {/* Verdict filter chips */}
          <div className="flex flex-wrap items-baseline gap-3 mb-3 mt-3">
            {FANTASY_VERDICT_FILTERS.map((v) => (
              <Link
                key={v}
                href={`/experts/${expertSlugOrId}?fv=${v}`}
                onClick={() => setTab("log")}
                className={`px-3 py-1 font-mono text-[11px] tracking-widest uppercase border-2 transition-colors ${
                  fantasyVerdict === v
                    ? "text-white border-gray-900"
                    : "bg-white text-gray-500 border-gray-300 hover:border-gray-600"
                }`}
                style={fantasyVerdict === v ? { backgroundColor: "#15803d", borderColor: "#15803d" } : {}}
              >
                {v}
              </Link>
            ))}
          </div>
          <FantasyTakeLogSection takes={filteredTakes} />
        </div>
      )}
    </div>
  );
}
