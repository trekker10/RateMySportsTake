"use client";

import { useState, useEffect, useTransition } from "react";
import { addFantasyTake } from "@/app/actions/fantasy-takes";
import { TAKE_CATEGORIES, TIMING_WINDOWS, suggestBoldness, FANTASY_DEFAULT_CONFIG } from "@/lib/fantasy-takescore";

const POSITIONS = ["QB", "RB", "WR", "TE", "K", "DEF", "FLEX"];

export default function FantasyTakeEntry({
  experts,
}: {
  experts: { expert_id: string; name: string }[];
}) {
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<{ success: boolean; message: string } | null>(null);

  const [expertId, setExpertId] = useState("");
  const [category, setCategory] = useState("breakout");
  const [rawText, setRawText] = useState("");
  const [playerName, setPlayerName] = useState("");
  const [playerPosition, setPlayerPosition] = useState("");
  const [playerAdp, setPlayerAdp] = useState<string>("");
  const [timingWindow, setTimingWindow] = useState("preseason");
  const [boldnessScore, setBoldnessScore] = useState<string>("50");
  const [boldnessManual, setBoldnessManual] = useState(false);
  const [dateMade, setDateMade] = useState(new Date().toISOString().split("T")[0]);
  const [resolutionDate, setResolutionDate] = useState("");
  const [sportSeason, setSportSeason] = useState("2025 NFL");

  // Auto-suggest boldness when ADP or timing changes (unless manually overridden)
  useEffect(() => {
    if (boldnessManual) return;
    const adp = playerAdp ? Number(playerAdp) : null;
    const suggested = suggestBoldness(adp, timingWindow, FANTASY_DEFAULT_CONFIG);
    setBoldnessScore(String(suggested));
  }, [playerAdp, timingWindow, boldnessManual]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus(null);

    startTransition(async () => {
      const result = await addFantasyTake({
        expert_id: expertId,
        category,
        raw_text: rawText,
        player_name: playerName || undefined,
        player_position: playerPosition || undefined,
        player_adp: playerAdp ? Number(playerAdp) : null,
        timing_window: timingWindow,
        boldness_score: boldnessScore ? Number(boldnessScore) : undefined,
        date_made: dateMade,
        resolution_date: resolutionDate || undefined,
        sport_season: sportSeason || undefined,
      });

      if (result.success) {
        setStatus({ success: true, message: "Take added and score recalculated." });
        setRawText("");
        setPlayerName("");
        setPlayerPosition("");
        setPlayerAdp("");
        setBoldnessManual(false);
      } else {
        setStatus({ success: false, message: result.error ?? "Unknown error" });
      }
    });
  }

  const selectedTiming = TIMING_WINDOWS.find(t => t.value === timingWindow);

  return (
    <div className="max-w-2xl">
      <form onSubmit={handleSubmit} className="rounded-xl border border-zinc-800 bg-zinc-900 p-6 space-y-5">
        <h2 className="font-semibold text-zinc-100 text-lg">Add Fantasy Take</h2>

        {/* Expert */}
        <div className="space-y-1">
          <label className="block text-sm text-zinc-300">Analyst *</label>
          <select
            required
            value={expertId}
            onChange={e => setExpertId(e.target.value)}
            className="w-full rounded bg-zinc-800 border border-zinc-700 px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-zinc-500"
          >
            <option value="">Select analyst…</option>
            {experts.map(e => (
              <option key={e.expert_id} value={e.expert_id}>
                {e.name}
              </option>
            ))}
          </select>
        </div>

        {/* Category */}
        <div className="space-y-1">
          <label className="block text-sm text-zinc-300">Category *</label>
          <select
            required
            value={category}
            onChange={e => setCategory(e.target.value)}
            className="w-full rounded bg-zinc-800 border border-zinc-700 px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-zinc-500"
          >
            {TAKE_CATEGORIES.map(c => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
          <p className="text-xs text-zinc-500">
            {TAKE_CATEGORIES.find(c => c.value === category)?.description}
          </p>
        </div>

        {/* Take text */}
        <div className="space-y-1">
          <label className="block text-sm text-zinc-300">Take Text *</label>
          <textarea
            required
            value={rawText}
            onChange={e => setRawText(e.target.value)}
            rows={3}
            placeholder="What did this analyst predict?"
            className="w-full rounded bg-zinc-800 border border-zinc-700 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-zinc-500 resize-none"
          />
        </div>

        {/* Player info */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="block text-sm text-zinc-300">Player Name</label>
            <input
              type="text"
              value={playerName}
              onChange={e => setPlayerName(e.target.value)}
              placeholder="e.g. Puka Nacua"
              className="w-full rounded bg-zinc-800 border border-zinc-700 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-zinc-500"
            />
          </div>
          <div className="space-y-1">
            <label className="block text-sm text-zinc-300">Position</label>
            <select
              value={playerPosition}
              onChange={e => setPlayerPosition(e.target.value)}
              className="w-full rounded bg-zinc-800 border border-zinc-700 px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-zinc-500"
            >
              <option value="">—</option>
              {POSITIONS.map(p => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* ADP */}
        <div className="space-y-1">
          <label className="block text-sm text-zinc-300">Player ADP (FantasyPros ECR)</label>
          <input
            type="number"
            value={playerAdp}
            onChange={e => { setPlayerAdp(e.target.value); setBoldnessManual(false); }}
            min={1}
            max={999}
            step="0.1"
            placeholder="e.g. 45.2"
            className="w-full rounded bg-zinc-800 border border-zinc-700 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-zinc-500"
          />
        </div>

        {/* Timing window */}
        <div className="space-y-1">
          <label className="block text-sm text-zinc-300">Timing Window</label>
          <select
            value={timingWindow}
            onChange={e => { setTimingWindow(e.target.value); setBoldnessManual(false); }}
            className="w-full rounded bg-zinc-800 border border-zinc-700 px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-zinc-500"
          >
            {TIMING_WINDOWS.map(t => (
              <option key={t.value} value={t.value}>
                {t.label} ({t.modifier >= 0 ? "+" : ""}{t.modifier} boldness modifier)
              </option>
            ))}
          </select>
          {selectedTiming && (
            <p className="text-xs text-zinc-500">
              Modifier: {selectedTiming.modifier >= 0 ? "+" : ""}{selectedTiming.modifier} applied to boldness scoring
            </p>
          )}
        </div>

        {/* Boldness */}
        <div className="space-y-1">
          <label className="flex items-center gap-2 text-sm text-zinc-300">
            Boldness Score (0–100)
            {!boldnessManual && (
              <span className="text-[10px] text-green-400 font-semibold uppercase tracking-wider">
                auto-suggested
              </span>
            )}
          </label>
          <div className="flex items-center gap-3">
            <input
              type="number"
              value={boldnessScore}
              onChange={e => { setBoldnessScore(e.target.value); setBoldnessManual(true); }}
              min={0}
              max={100}
              className="w-32 rounded bg-zinc-800 border border-zinc-700 px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-zinc-500"
            />
            {boldnessManual && (
              <button
                type="button"
                onClick={() => setBoldnessManual(false)}
                className="text-xs text-zinc-500 hover:text-zinc-300 underline"
              >
                reset to suggestion
              </button>
            )}
          </div>
          <p className="text-xs text-zinc-500">
            0 = safe consensus pick · 100 = extreme moonshot call
          </p>
        </div>

        {/* Dates */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="block text-sm text-zinc-300">Date Made *</label>
            <input
              type="date"
              required
              value={dateMade}
              onChange={e => setDateMade(e.target.value)}
              className="w-full rounded bg-zinc-800 border border-zinc-700 px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-zinc-500"
            />
          </div>
          <div className="space-y-1">
            <label className="block text-sm text-zinc-300">Resolution Date</label>
            <input
              type="date"
              value={resolutionDate}
              onChange={e => setResolutionDate(e.target.value)}
              className="w-full rounded bg-zinc-800 border border-zinc-700 px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-zinc-500"
            />
          </div>
        </div>

        {/* Sport season */}
        <div className="space-y-1">
          <label className="block text-sm text-zinc-300">Sport Season</label>
          <input
            type="text"
            value={sportSeason}
            onChange={e => setSportSeason(e.target.value)}
            placeholder="e.g. 2025 NFL"
            className="w-full rounded bg-zinc-800 border border-zinc-700 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-zinc-500"
          />
        </div>

        {/* Status */}
        {status && (
          <div
            className={`rounded-lg px-4 py-3 text-sm font-medium ${
              status.success
                ? "bg-green-900/50 text-green-300 border border-green-800"
                : "bg-red-900/50 text-red-300 border border-red-800"
            }`}
          >
            {status.success ? "✓ " : "✗ "}
            {status.message}
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={isPending || !expertId || !rawText}
          className="w-full rounded-lg py-2.5 text-sm font-semibold transition-colors disabled:opacity-50"
          style={{ backgroundColor: "#15803d", color: "#fff" }}
        >
          {isPending ? "Adding…" : "Add Fantasy Take"}
        </button>
      </form>
    </div>
  );
}
