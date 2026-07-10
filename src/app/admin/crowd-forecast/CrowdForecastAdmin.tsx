"use client";

import { useState, useMemo } from "react";
import { setCrowdSetting, setVoteBoost, type CrowdSettings } from "@/app/actions/crowdSettings";

interface TakeStub {
  take_id: string;
  summary: string;
  expertName: string;
  boostWell: number;
  boostPoorly: number;
  dateSubmitted: string;
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
  const [search, setSearch] = useState("");

  // Per-row draft state: takeId → { well, poorly }
  const [drafts, setDrafts] = useState<Record<string, { well: string; poorly: string }>>(() =>
    Object.fromEntries(takes.map((t) => [t.take_id, { well: String(t.boostWell), poorly: String(t.boostPoorly) }]))
  );
  const [rowSaving, setRowSaving]   = useState<Record<string, boolean>>({});
  const [rowSaved, setRowSaved]     = useState<Record<string, boolean>>({});
  const [rowError, setRowError]     = useState<Record<string, string>>({});

  const filtered = useMemo(() => {
    if (!search.trim()) return takes;
    const q = search.toLowerCase();
    return takes.filter((t) =>
      t.summary.toLowerCase().includes(q) ||
      t.expertName.toLowerCase().includes(q)
    );
  }, [search, takes]);

  function patchDraft(takeId: string, key: "well" | "poorly", val: string) {
    setDrafts((prev) => ({ ...prev, [takeId]: { ...prev[takeId], [key]: val } }));
    setRowSaved((prev) => ({ ...prev, [takeId]: false }));
    setRowError((prev) => ({ ...prev, [takeId]: "" }));
  }

  async function saveRow(t: TakeStub) {
    const draft = drafts[t.take_id] ?? { well: "0", poorly: "0" };
    const w = parseInt(draft.well, 10);
    const p = parseInt(draft.poorly, 10);
    if (isNaN(w) || isNaN(p) || w < 0 || p < 0) {
      setRowError((prev) => ({ ...prev, [t.take_id]: "Must be non-negative integers." }));
      return;
    }
    setRowSaving((prev) => ({ ...prev, [t.take_id]: true }));
    setRowError((prev) => ({ ...prev, [t.take_id]: "" }));
    try {
      await setVoteBoost(t.take_id, w, p);
      setRowSaved((prev) => ({ ...prev, [t.take_id]: true }));
      setTimeout(() => setRowSaved((prev) => ({ ...prev, [t.take_id]: false })), 2000);
    } catch (e: unknown) {
      setRowError((prev) => ({ ...prev, [t.take_id]: (e as Error)?.message ?? "Failed." }));
    } finally {
      setRowSaving((prev) => ({ ...prev, [t.take_id]: false }));
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
      <section className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex-1">
            <p className="font-semibold text-gray-900">Seed Votes by Take</p>
            <p className="text-sm text-gray-500 mt-0.5">
              Sorted newest first. Type to filter. Ages Well → green bar · Ages Poorly → red bar.
            </p>
          </div>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter by analyst or take…"
            className="w-full sm:w-64 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        {/* Column headers */}
        <div className="grid grid-cols-[1fr_72px_72px_80px] gap-3 px-4 py-2 bg-gray-50 border-b border-gray-100 text-[10px] font-bold uppercase tracking-widest text-gray-400">
          <span>Take</span>
          <span className="text-center text-emerald-600">Well</span>
          <span className="text-center text-red-500">Poorly</span>
          <span />
        </div>

        {/* Rows */}
        <div className="divide-y divide-gray-100 max-h-[600px] overflow-y-auto">
          {filtered.length === 0 ? (
            <p className="px-6 py-8 text-sm text-gray-400 text-center">No takes match your filter.</p>
          ) : filtered.map((t) => {
            const draft   = drafts[t.take_id] ?? { well: "0", poorly: "0" };
            const saving  = rowSaving[t.take_id] ?? false;
            const saved   = rowSaved[t.take_id] ?? false;
            const err     = rowError[t.take_id] ?? "";
            const hasBoost = (parseInt(draft.well, 10) > 0) || (parseInt(draft.poorly, 10) > 0);

            return (
              <div key={t.take_id} className="grid grid-cols-[1fr_72px_72px_80px] gap-3 items-center px-4 py-3 hover:bg-gray-50">
                {/* Take info */}
                <div className="min-w-0">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide truncate">
                    {t.expertName}
                    {t.dateSubmitted && (
                      <span className="ml-2 font-normal normal-case text-gray-300">
                        {new Date(t.dateSubmitted).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </span>
                    )}
                  </p>
                  <p className="text-sm text-gray-800 mt-0.5 line-clamp-2 leading-snug">{t.summary}</p>
                  {err && <p className="text-xs text-red-500 mt-0.5">{err}</p>}
                </div>

                {/* Well input */}
                <input
                  type="number"
                  min={0}
                  value={draft.well}
                  onChange={(e) => patchDraft(t.take_id, "well", e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && saveRow(t)}
                  className={`w-full border rounded-lg px-2 py-1.5 text-center text-sm font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500 ${hasBoost ? "border-emerald-300 bg-emerald-50" : "border-gray-300"}`}
                />

                {/* Poorly input */}
                <input
                  type="number"
                  min={0}
                  value={draft.poorly}
                  onChange={(e) => patchDraft(t.take_id, "poorly", e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && saveRow(t)}
                  className={`w-full border rounded-lg px-2 py-1.5 text-center text-sm font-bold focus:outline-none focus:ring-2 focus:ring-red-400 ${hasBoost ? "border-red-200 bg-red-50" : "border-gray-300"}`}
                />

                {/* Save button */}
                <button
                  onClick={() => saveRow(t)}
                  disabled={saving}
                  className={`py-1.5 px-2 rounded-lg text-xs font-semibold transition-colors ${
                    saved
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-gray-900 text-white hover:bg-gray-700 disabled:opacity-40"
                  }`}
                >
                  {saving ? "…" : saved ? "✓ Saved" : "Save"}
                </button>
              </div>
            );
          })}
        </div>

        <div className="px-4 py-2.5 border-t border-gray-100 bg-gray-50 text-xs text-gray-400">
          {filtered.length} take{filtered.length !== 1 ? "s" : ""} shown · Enter to save · boosts highlighted in green/red
        </div>
      </section>
    </div>
  );
}
