"use client";

import { useState, useMemo } from "react";
import { setCrowdSetting, setVoteBoost, type CrowdSettings } from "@/app/actions/crowdSettings";

interface TakeStub {
  take_id: string;
  summary: string;
  expertName: string;
  boostWell: number;
  boostPoorly: number;
}

interface Props {
  settings: CrowdSettings;
  takes: TakeStub[];
}

export default function CrowdForecastAdmin({ settings, takes }: Props) {
  // ── Min-votes section ─────────────────────────────────────────────────────
  const [minVotes, setMinVotes]             = useState(settings.minVotes);
  const [minVotesDraft, setMinVotesDraft]   = useState(String(settings.minVotes));
  const [savingMin, setSavingMin]           = useState(false);
  const [savedMin, setSavedMin]             = useState(false);

  async function saveMinVotes() {
    const val = parseInt(minVotesDraft, 10);
    if (isNaN(val) || val < 1) return;
    setSavingMin(true);
    await setCrowdSetting("crowd_forecast_min_votes", String(val));
    setMinVotes(val);
    setSavingMin(false);
    setSavedMin(true);
    setTimeout(() => setSavedMin(false), 2500);
  }

  const minDirty = parseInt(minVotesDraft, 10) !== minVotes && !isNaN(parseInt(minVotesDraft, 10));

  // ── Boost section ─────────────────────────────────────────────────────────
  const [search, setSearch]             = useState("");
  const [selected, setSelected]         = useState<TakeStub | null>(null);
  const [boostWell, setBoostWell]       = useState("");
  const [boostPoorly, setBoostPoorly]   = useState("");
  const [savingBoost, setSavingBoost]   = useState(false);
  const [savedBoost, setSavedBoost]     = useState(false);
  const [boostError, setBoostError]     = useState<string | null>(null);

  const filtered = useMemo(() => {
    if (!search.trim()) return takes.slice(0, 20);
    const q = search.toLowerCase();
    return takes
      .filter((t) =>
        t.summary.toLowerCase().includes(q) ||
        t.expertName.toLowerCase().includes(q)
      )
      .slice(0, 20);
  }, [search, takes]);

  function selectTake(t: TakeStub) {
    setSelected(t);
    setSearch(t.expertName + " — " + t.summary.slice(0, 60));
    setBoostWell(String(t.boostWell));
    setBoostPoorly(String(t.boostPoorly));
  }

  async function saveBoost() {
    if (!selected) return;
    const w = parseInt(boostWell, 10);
    const p = parseInt(boostPoorly, 10);
    if (isNaN(w) || isNaN(p) || w < 0 || p < 0) {
      setBoostError("Enter non-negative integers for both boosts.");
      return;
    }
    setSavingBoost(true);
    setBoostError(null);
    try {
      await setVoteBoost(selected.take_id, w, p);
      setSavedBoost(true);
      setTimeout(() => setSavedBoost(false), 2500);
    } catch (e: any) {
      setBoostError(e?.message ?? "Failed to save boost.");
    } finally {
      setSavingBoost(false);
    }
  }

  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Crowd Forecast</h1>
        <p className="mt-1 text-gray-500">Configure voting panel behaviour and seed vote counts.</p>
      </div>

      {/* ── Min-votes threshold ── */}
      <section className="rounded-xl border border-gray-200 bg-white divide-y divide-gray-200">
        <div className="px-6 py-5 flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-8">
          <div className="flex-1">
            <p className="font-semibold text-gray-900">Minimum votes to reveal results</p>
            <p className="text-sm text-gray-500 mt-0.5">
              The crowd forecast bar and percentages stay hidden until this many votes have been cast.
              Currently <strong>{minVotes}</strong>.
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <input
              type="number"
              min={1}
              max={100}
              value={minVotesDraft}
              onChange={(e) => { setMinVotesDraft(e.target.value); setSavedMin(false); }}
              className="w-20 rounded-lg border border-gray-300 px-3 py-2 text-center text-lg font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <button
              onClick={saveMinVotes}
              disabled={savingMin || !minDirty}
              className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-semibold disabled:opacity-40 hover:bg-emerald-700 transition-colors"
            >
              {savingMin ? "Saving…" : savedMin ? "✓ Saved" : "Save"}
            </button>
          </div>
        </div>
      </section>

      {/* ── Boost votes by take ── */}
      <section className="rounded-xl border border-gray-200 bg-white divide-y divide-gray-200">
        <div className="px-6 py-4 bg-gray-50 rounded-t-xl">
          <p className="font-semibold text-gray-900">Seed Votes by Take</p>
          <p className="text-sm text-gray-500 mt-0.5">
            Add synthetic boost votes to a specific take. Real user votes stack on top.
            These are stored on the take itself — no fake accounts involved.
          </p>
        </div>

        <div className="px-6 py-5 space-y-4">
          {/* Take search */}
          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-1">Search takes</label>
            <input
              type="text"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setSelected(null); }}
              placeholder="Type analyst name or take text…"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            {/* Dropdown */}
            {search.trim() && !selected && filtered.length > 0 && (
              <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-64 overflow-y-auto">
                {filtered.map((t) => (
                  <button
                    key={t.take_id}
                    onClick={() => selectTake(t)}
                    className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b border-gray-100 last:border-0"
                  >
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">{t.expertName}</p>
                    <p className="text-sm text-gray-800 mt-0.5 line-clamp-2">{t.summary}</p>
                    {(t.boostWell > 0 || t.boostPoorly > 0) && (
                      <p className="text-xs text-emerald-600 mt-0.5">
                        Current boost: +{t.boostWell} well / +{t.boostPoorly} poorly
                      </p>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Boost inputs */}
          {selected && (
            <div className="space-y-3">
              <div className="p-3 bg-gray-50 rounded-lg text-sm text-gray-700">
                <span className="font-bold">{selected.expertName}</span> — {selected.summary.slice(0, 100)}{selected.summary.length > 100 ? "…" : ""}
              </div>
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ages Well boost</label>
                  <input
                    type="number"
                    min={0}
                    value={boostWell}
                    onChange={(e) => setBoostWell(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-center text-lg font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ages Poorly boost</label>
                  <input
                    type="number"
                    min={0}
                    value={boostPoorly}
                    onChange={(e) => setBoostPoorly(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-center text-lg font-bold focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>
              </div>
              {boostError && (
                <p className="text-sm text-red-600">{boostError}</p>
              )}
              <button
                onClick={saveBoost}
                disabled={savingBoost}
                className="w-full py-2.5 rounded-lg bg-gray-900 text-white text-sm font-semibold disabled:opacity-40 hover:bg-gray-700 transition-colors"
              >
                {savingBoost ? "Saving…" : savedBoost ? "✓ Boost saved!" : "Save boost"}
              </button>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
