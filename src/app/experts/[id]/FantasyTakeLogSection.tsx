"use client";

import { useState } from "react";
import Link from "next/link";
import ShareReceiptButton from "@/components/ShareReceiptButton";

const INITIAL_COUNT = 4;

const CATEGORY_LABELS: Record<string, string> = {
  breakout_call: "Breakout Call",
  bust_call: "Bust Call",
  sleeper_pick: "Sleeper Pick",
  start_sit: "Start/Sit",
  waiver_add: "Waiver Add",
};

function formatCategory(cat: string) {
  return CATEGORY_LABELS[cat] ?? cat.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function fvTag(take: { outcome_status: string; accuracy_score: number | null }) {
  if (take.outcome_status !== "resolved") return { label: "PENDING", bg: "#e5e7eb", text: "#4b5563" };
  const s = take.accuracy_score;
  if (s == null)  return { label: "RESOLVED",           bg: "#6b7280", text: "#fff" };
  if (s >= 75)    return { label: "NAILED IT",           bg: "#0a7a3b", text: "#fff" };
  if (s >= 60)    return { label: "MOSTLY RIGHT",        bg: "#15803d", text: "#fff" };
  if (s >= 50)    return { label: "DIRECTIONALLY RIGHT", bg: "#d97706", text: "#fff" };
  if (s >= 25)    return { label: "HALF RIGHT",          bg: "#ea580c", text: "#fff" };
  if (s > 0)      return { label: "MOSTLY WRONG",        bg: "#dc2626", text: "#fff" };
  return                 { label: "WRONG",               bg: "#991b1b", text: "#fff" };
}

export type FantasyTake = {
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

interface Props {
  takes: FantasyTake[];
}

export default function FantasyTakeLogSection({ takes }: Props) {
  const [showAll, setShowAll] = useState(false);

  const visible = showAll ? takes : takes.slice(0, INITIAL_COUNT);
  const hiddenCount = takes.length - INITIAL_COUNT;

  if (takes.length === 0) {
    return (
      <div className="bg-white border-2 border-gray-200 px-6 py-12 text-center italic text-gray-400">
        No takes for this filter.
      </div>
    );
  }

  return (
    <>
      <div className="space-y-3">
        {visible.map((ft) => {
          const v = fvTag(ft);
          const filed = new Date(ft.date_made)
            .toLocaleDateString("en-US", { month: "short", year: "2-digit" })
            .toUpperCase();

          return (
            <div key={ft.fantasy_take_id} className="bg-white border-2 border-gray-900 overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between gap-4 px-4 py-3 border-b border-gray-200">
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className="rounded-full px-2 py-0.5 text-[10px] font-bold text-white shrink-0"
                    style={{ backgroundColor: "#15803d" }}
                  >
                    {formatCategory(ft.category)}
                  </span>
                  <p className="font-mono text-[10px] tracking-wider text-gray-400 uppercase truncate">
                    Filed {filed}{ft.sport_season ? ` · ${ft.sport_season}` : ""}
                  </p>
                </div>
                <span
                  className="font-mono text-[10px] tracking-wider px-2 py-1 font-semibold shrink-0"
                  style={{ backgroundColor: v.bg, color: v.text }}
                >
                  {v.label}
                </span>
              </div>

              {/* Quote */}
              <div className="px-4 py-4" style={{ backgroundColor: "#f5f1e9" }}>
                {ft.player_name && (
                  <p
                    className="font-black text-sm uppercase tracking-wide mb-1.5"
                    style={{ color: "#15803d" }}
                  >
                    {ft.player_name}{ft.player_position ? ` · ${ft.player_position}` : ""}
                  </p>
                )}
                <p className="italic text-lg leading-snug text-gray-800 whitespace-pre-wrap">
                  &ldquo;{ft.raw_text}&rdquo;
                </p>
              </div>

              {/* Footer */}
              <div className="px-4 py-3 border-t border-gray-200 space-y-2">
                {ft.grader_note && (
                  <p className="font-mono text-[10px] tracking-wider text-gray-400 uppercase">
                    OUTCOME{" "}
                    <span className="font-normal normal-case tracking-normal text-gray-600 italic ml-1">
                      {ft.grader_note}
                    </span>
                  </p>
                )}
                <div className="flex flex-wrap items-center gap-3 text-[10px] font-mono text-gray-400">
                  <span>{ft.date_made}</span>
                  {ft.timing_window && <span>· {ft.timing_window.replace(/_/g, " ")}</span>}
                  {ft.boldness_score != null && <span>· Boldness {ft.boldness_score}</span>}
                  {ft.resolution_date && <span>· Resolves {ft.resolution_date}</span>}
                </div>
                <div className="flex flex-wrap gap-2 pt-1">
                  <Link
                    href={`/fantasy-takes/${ft.fantasy_take_id}`}
                    className="px-3 py-1.5 border border-gray-300 font-mono text-[10px] tracking-wider text-gray-600 hover:border-gray-700 hover:text-gray-900 transition-colors uppercase"
                  >
                    See Full Context
                  </Link>
                  <ShareReceiptButton
                    takeId={ft.fantasy_take_id}
                    imageUrl={`/api/fantasy-receipt/${ft.fantasy_take_id}`}
                    className="px-3 py-1.5 border border-gray-300 font-mono text-[10px] tracking-wider text-gray-600 hover:border-gray-700 hover:text-gray-900 transition-colors uppercase"
                  >
                    Share Receipt
                  </ShareReceiptButton>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Load-more row */}
      {!showAll && hiddenCount > 0 && (
        <button
          onClick={() => setShowAll(true)}
          className="mt-3 w-full bg-white border-2 border-gray-900 px-5 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors group"
        >
          <span className="italic text-gray-500 text-sm">
            See all {takes.length} takes
          </span>
          <span className="text-gray-400 group-hover:text-gray-700 transition-colors">→</span>
        </button>
      )}
    </>
  );
}
