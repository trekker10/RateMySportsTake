"use client";

import { useState, useTransition } from "react";
import { gradeFantasyTake } from "@/app/actions/fantasy-takes";
import { TAKE_CATEGORIES, ACCURACY_TIERS } from "@/lib/fantasy-takescore";
import type { FantasyScoredTake } from "@/lib/fantasy-takescore";

type PendingTake = FantasyScoredTake & { expert_name: string; avatar_url: string | null };

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

function TakeGrader({ take, onGraded }: { take: PendingTake; onGraded: () => void }) {
  const [selected, setSelected] = useState<number | null>(null);
  const [note, setNote] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleGrade() {
    if (selected === null) return;
    setError(null);
    startTransition(async () => {
      const result = await gradeFantasyTake(take.fantasy_take_id, selected, note);
      if (result.success) {
        onGraded();
      } else {
        setError(result.error ?? "Unknown error");
      }
    });
  }

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5 space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <CategoryBadge category={take.category} />
            <span className="text-sm font-semibold text-zinc-100">{take.expert_name}</span>
            {take.sport_season && (
              <span className="text-xs text-zinc-500">{take.sport_season}</span>
            )}
          </div>
          {take.player_name && (
            <div className="text-xs text-zinc-400">
              <span className="font-semibold text-zinc-300">{take.player_name}</span>
              {take.player_position && <span className="ml-1">({take.player_position})</span>}
              {take.player_adp != null && (
                <span className="ml-2 text-zinc-500">ADP {take.player_adp}</span>
              )}
            </div>
          )}
        </div>
        <div className="text-right text-xs text-zinc-500 space-y-0.5">
          <div>Made: {take.date_made}</div>
          {take.resolution_date && <div>Due: <span className="text-zinc-300">{take.resolution_date}</span></div>}
          {take.boldness_score != null && (
            <div>Boldness: <span className="text-zinc-300">{take.boldness_score}</span></div>
          )}
          {take.timing_window && <div className="capitalize">{take.timing_window.replace(/_/g, " ")}</div>}
        </div>
      </div>

      {/* Take text */}
      <p className="text-sm text-zinc-300 bg-zinc-800 rounded-lg px-4 py-3 italic">
        &ldquo;{take.raw_text}&rdquo;
      </p>

      {/* Accuracy tier buttons */}
      <div>
        <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Grade this take</p>
        <div className="flex flex-wrap gap-2">
          {ACCURACY_TIERS.map(tier => (
            <button
              key={tier.score}
              type="button"
              onClick={() => setSelected(tier.score)}
              title={tier.description}
              className={`px-3 py-2 rounded-lg text-sm font-semibold border transition-colors ${
                selected === tier.score
                  ? "border-green-500 bg-green-900/50 text-green-300"
                  : "border-zinc-700 bg-zinc-800 text-zinc-300 hover:border-zinc-500 hover:text-zinc-100"
              }`}
            >
              {tier.score} — {tier.label}
            </button>
          ))}
        </div>
        {selected !== null && (
          <p className="mt-1.5 text-xs text-zinc-500">
            {ACCURACY_TIERS.find(t => t.score === selected)?.description}
          </p>
        )}
      </div>

      {/* Grader note */}
      <div className="space-y-1">
        <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
          Grader Note (optional)
        </label>
        <textarea
          value={note}
          onChange={e => setNote(e.target.value)}
          rows={2}
          placeholder="Explain the outcome…"
          className="w-full rounded bg-zinc-800 border border-zinc-700 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-zinc-500 resize-none"
        />
      </div>

      {error && (
        <p className="text-sm text-red-400">{error}</p>
      )}

      {/* Submit */}
      <button
        onClick={handleGrade}
        disabled={isPending || selected === null}
        className="rounded-lg px-5 py-2 text-sm font-semibold transition-colors disabled:opacity-50"
        style={{ backgroundColor: "#15803d", color: "#fff" }}
      >
        {isPending ? "Grading…" : "Mark Resolved"}
      </button>
    </div>
  );
}

export default function FantasyGradingPanel({ pendingTakes }: { pendingTakes: PendingTake[] }) {
  const [takes, setTakes] = useState<PendingTake[]>(pendingTakes);

  function handleGraded(fantasyTakeId: string) {
    setTakes(prev => prev.filter(t => t.fantasy_take_id !== fantasyTakeId));
  }

  if (takes.length === 0) {
    return (
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 py-16 text-center">
        <p className="text-zinc-400 text-lg font-semibold">All caught up!</p>
        <p className="text-zinc-500 text-sm mt-1">No pending fantasy takes past their resolution date.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-zinc-400">
        {takes.length} take{takes.length !== 1 ? "s" : ""} pending grading.
      </p>
      {takes.map(take => (
        <TakeGrader
          key={take.fantasy_take_id}
          take={take}
          onGraded={() => handleGraded(take.fantasy_take_id)}
        />
      ))}
    </div>
  );
}
