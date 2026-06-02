"use client";

import { useState, useTransition } from "react";
import { saveTakeScoreConfig, resetTakeScoreConfig } from "@/app/actions/takescore";
import { DEFAULT_CONFIG, scoreToGrade, type TakeScoreConfig } from "@/lib/takescore";

function Field({ label, value, onChange, tooltip }: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  tooltip?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-2 border-b border-zinc-800 last:border-0">
      <div className="flex-1">
        <p className="text-sm text-zinc-200">{label}</p>
        {tooltip && <p className="text-xs text-zinc-500 mt-0.5">{tooltip}</p>}
      </div>
      <input
        type="number"
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="w-24 rounded bg-zinc-800 border border-zinc-700 px-2 py-1 text-sm text-zinc-100 text-right focus:outline-none focus:border-zinc-500"
        step="any"
      />
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
      <h3 className="font-semibold text-zinc-100 mb-3">{title}</h3>
      {children}
    </div>
  );
}

export default function ScoringConfig({
  config,
  configHistory,
  adminEmail,
}: {
  config: TakeScoreConfig;
  configHistory: Array<{ id: string; changed_at: string; changed_by: string; changes: Record<string, unknown> }>;
  adminEmail: string;
}) {
  const [cfg, setCfg] = useState<TakeScoreConfig>(config);
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  function set(key: keyof Omit<TakeScoreConfig, "aggregation_method">, value: number) {
    setCfg(prev => ({ ...prev, [key]: value }));
    setSaved(false);
  }

  function setMethod(method: "mean" | "median") {
    setCfg(prev => ({ ...prev, aggregation_method: method }));
    setSaved(false);
  }

  function handleSave() {
    startTransition(async () => {
      await saveTakeScoreConfig(cfg, adminEmail);
      setSaved(true);
    });
  }

  function handleReset() {
    setCfg(DEFAULT_CONFIG);
    startTransition(async () => {
      await resetTakeScoreConfig(adminEmail);
      setSaved(true);
    });
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-4">
        <div className="text-sm text-zinc-400">
          {configHistory[0] && (
            <>Last saved {new Date(configHistory[0].changed_at).toLocaleString()} by {configHistory[0].changed_by}</>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleReset}
            disabled={isPending}
            className="px-4 py-2 rounded-lg border border-zinc-700 text-sm text-zinc-400 hover:text-zinc-200 hover:border-zinc-500 transition-colors disabled:opacity-50"
          >
            Reset to Defaults
          </button>
          <button
            onClick={handleSave}
            disabled={isPending}
            className="px-4 py-2 rounded-lg bg-white text-black text-sm font-semibold hover:bg-zinc-200 transition-colors disabled:opacity-50"
          >
            {isPending ? "Saving…" : saved ? "✓ Saved" : "Save Changes"}
          </button>
        </div>
      </div>

      {/* ── Aggregation method toggle ── */}
      <div className="rounded-xl border border-zinc-700 bg-zinc-900 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-zinc-100">Aggregation Method</p>
          <p className="text-xs text-zinc-400 mt-0.5">
            How per-take impact scores are combined into each analyst&apos;s overall TakeScore.
            Switching this recalculates every analyst&apos;s score — takes and grades are untouched.
          </p>
        </div>
        <div className="flex items-stretch border border-zinc-600 rounded-lg overflow-hidden shrink-0">
          <button
            type="button"
            onClick={() => setMethod("mean")}
            className="px-5 py-2.5 text-sm font-semibold transition-colors"
            style={{
              backgroundColor: cfg.aggregation_method !== "median" ? "#fff" : "transparent",
              color:           cfg.aggregation_method !== "median" ? "#000" : "#71717a",
            }}
          >
            Mean
          </button>
          <button
            type="button"
            onClick={() => setMethod("median")}
            className="px-5 py-2.5 text-sm font-semibold transition-colors border-l border-zinc-600"
            style={{
              backgroundColor: cfg.aggregation_method === "median" ? "#fff" : "transparent",
              color:           cfg.aggregation_method === "median" ? "#000" : "#71717a",
            }}
          >
            Median
          </button>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">

        <Section title="A — Accuracy Tier Values">
          <Field label="Nailed it (correct & specific)"   value={cfg.accuracy_nailed}       onChange={v => set("accuracy_nailed", v)} />
          <Field label="Mostly right"                      value={cfg.accuracy_mostly_right}  onChange={v => set("accuracy_mostly_right", v)} />
          <Field label="Half right"                        value={cfg.accuracy_half_right}    onChange={v => set("accuracy_half_right", v)} />
          <Field label="Mostly wrong"                      value={cfg.accuracy_mostly_wrong}  onChange={v => set("accuracy_mostly_wrong", v)} />
          <Field label="Completely wrong"                  value={cfg.accuracy_wrong}         onChange={v => set("accuracy_wrong", v)} />
        </Section>

        <Section title="BC — Boldness Credit (incorrect takes only)">
          <Field label="Moonshot threshold (B ≥)"    value={cfg.bc_moonshot_min}   onChange={v => set("bc_moonshot_min", v)} />
          <Field label="Moonshot credit value"        value={cfg.bc_moonshot_value} onChange={v => set("bc_moonshot_value", v)} />
          <Field label="Bold miss threshold (B ≥)"   value={cfg.bc_bold_min}       onChange={v => set("bc_bold_min", v)} />
          <Field label="Bold miss credit value"       value={cfg.bc_bold_value}     onChange={v => set("bc_bold_value", v)} />
          <Field label="Neutral miss threshold (B ≥)" value={cfg.bc_neutral_min}    onChange={v => set("bc_neutral_min", v)} />
          <Field label="Neutral miss value"            value={cfg.bc_neutral_value}  onChange={v => set("bc_neutral_value", v)} />
          <Field label="Safe take miss penalty"        value={cfg.bc_safe_value}     onChange={v => set("bc_safe_value", v)} />
        </Section>

        <Section title="R — Recency Weights">
          <Field label="Recent takes count"         value={cfg.recency_recent_count}    onChange={v => set("recency_recent_count", v)}    tooltip="How many of the most recent takes get the boosted weight" />
          <Field label="Recent weight"              value={cfg.recency_recent_weight}   onChange={v => set("recency_recent_weight", v)} />
          <Field label="Standard weight"            value={cfg.recency_standard_weight} onChange={v => set("recency_standard_weight", v)} />
          <Field label="Old take cutoff (days)"     value={cfg.recency_old_days}        onChange={v => set("recency_old_days", v)}        tooltip="Takes older than this many days get the reduced weight" />
          <Field label="Old take weight"            value={cfg.recency_old_weight}      onChange={v => set("recency_old_weight", v)} />
        </Section>

        <Section title="V — Volume Multiplier">
          <Field label="High-volume takes threshold"   value={cfg.vol_high_takes}        onChange={v => set("vol_high_takes", v)} />
          <Field label="High-volume boldness threshold" value={cfg.vol_high_boldness}     onChange={v => set("vol_high_boldness", v)} />
          <Field label="High-volume multiplier"        value={cfg.vol_high_mult}          onChange={v => set("vol_high_mult", v)} />
          <Field label="Mid-volume takes threshold"    value={cfg.vol_mid_takes}          onChange={v => set("vol_mid_takes", v)} />
          <Field label="Mid-volume boldness threshold" value={cfg.vol_mid_boldness}       onChange={v => set("vol_mid_boldness", v)} />
          <Field label="Mid-volume multiplier"         value={cfg.vol_mid_mult}           onChange={v => set("vol_mid_mult", v)} />
          <Field label="Low-volume takes threshold"    value={cfg.vol_low_takes}          onChange={v => set("vol_low_takes", v)} />
          <Field label="Low-volume multiplier"         value={cfg.vol_low_mult}           onChange={v => set("vol_low_mult", v)} />
          <Field label="Minimum (under threshold)"     value={cfg.vol_min_mult}           onChange={v => set("vol_min_mult", v)} />
          <Field label="High takes / low boldness"     value={cfg.vol_low_boldness_mult}  onChange={v => set("vol_low_boldness_mult", v)} />
        </Section>

        <Section title="D — Decay Multiplier (days inactive)">
          <Field label="0–30 days"   value={cfg.decay_30_mult}  onChange={v => set("decay_30_mult", v)} />
          <Field label="31–90 days"  value={cfg.decay_90_mult}  onChange={v => set("decay_90_mult", v)} />
          <Field label="91–180 days" value={cfg.decay_180_mult} onChange={v => set("decay_180_mult", v)} />
          <Field label="181–365 days" value={cfg.decay_365_mult} onChange={v => set("decay_365_mult", v)} />
          <Field label="365+ days"   value={cfg.decay_old_mult} onChange={v => set("decay_old_mult", v)} />
        </Section>

        <Section title="Engine Settings">
          <Field label="Rolling window (# of takes)"  value={cfg.rolling_window}        onChange={v => set("rolling_window", v)}        tooltip="How many takes factor into the rolling average" />
          <Field label="Normalization divisor"         value={cfg.normalization_divisor} onChange={v => set("normalization_divisor", v)} tooltip="Divides raw impact avg to fit 0–100 scale. Higher = lower scores overall." />
        </Section>

        <Section title="Grade Scale (score thresholds)">
          <p className="text-xs text-zinc-500 mb-3">
            Set the minimum score needed for each letter grade. Scores below the D threshold receive an F.
            Preview: {[100,75,65,55,45,35,25,15,5].map(s => (
              <span key={s} className="ml-2 font-mono">{s}→<strong>{scoreToGrade(s, cfg)}</strong></span>
            ))}
          </p>
          {([
            { key: "grade_a_min",      label: "A  (≥ this score)" },
            { key: "grade_bplus_min",  label: "B+ (≥ this score)" },
            { key: "grade_b_min",      label: "B  (≥ this score)" },
            { key: "grade_bminus_min", label: "B− (≥ this score)" },
            { key: "grade_cplus_min",  label: "C+ (≥ this score)" },
            { key: "grade_c_min",      label: "C  (≥ this score)" },
            { key: "grade_cminus_min", label: "C− (≥ this score)" },
            { key: "grade_d_min",      label: "D  (≥ this score, below = F)" },
          ] as const).map(({ key, label }) => (
            <Field key={key} label={label} value={cfg[key]} onChange={v => set(key, v)} />
          ))}
        </Section>
      </div>

      {/* Audit log */}
      {configHistory.length > 0 && (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
          <h3 className="font-semibold text-zinc-100 mb-3">Change History</h3>
          <div className="space-y-2">
            {configHistory.slice(0, 5).map(entry => (
              <div key={entry.id} className="text-xs text-zinc-500">
                <span className="text-zinc-300">{entry.changed_by}</span>
                {" · "}
                {new Date(entry.changed_at).toLocaleString()}
                {" · "}
                {Object.keys(entry.changes as object).length} field{Object.keys(entry.changes as object).length !== 1 ? "s" : ""} changed
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
