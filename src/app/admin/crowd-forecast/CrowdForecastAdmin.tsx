"use client";

import { useState } from "react";
import { setCrowdSetting, type CrowdSettings } from "@/app/actions/crowdSettings";

export default function CrowdForecastAdmin({ settings }: { settings: CrowdSettings }) {
  const [minVotes, setMinVotes]       = useState(settings.minVotes);
  const [minVotesDraft, setMinVotesDraft] = useState(String(settings.minVotes));
  const [saving, setSaving]           = useState(false);
  const [saved, setSaved]             = useState(false);

  async function save() {
    const val = parseInt(minVotesDraft, 10);
    if (isNaN(val) || val < 1) return;
    setSaving(true);
    await setCrowdSetting("crowd_forecast_min_votes", String(val));
    setMinVotes(val);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  const dirty = parseInt(minVotesDraft, 10) !== minVotes && !isNaN(parseInt(minVotesDraft, 10));

  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Crowd Forecast</h1>
        <p className="mt-1 text-gray-500">Configure how the voting panel behaves across the site.</p>
      </div>

      <section className="rounded-xl border border-gray-200 bg-white divide-y divide-gray-200">
        {/* Minimum votes threshold */}
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
              onChange={(e) => { setMinVotesDraft(e.target.value); setSaved(false); }}
              className="w-20 rounded-lg border border-gray-300 px-3 py-2 text-center text-lg font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <button
              onClick={save}
              disabled={saving || !dirty}
              className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-semibold disabled:opacity-40 hover:bg-emerald-700 transition-colors"
            >
              {saving ? "Saving…" : saved ? "✓ Saved" : "Save"}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
