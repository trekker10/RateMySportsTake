"use client";

import { useState, useTransition } from "react";
import { saveFantasyConfig } from "@/app/actions/fantasy-takescore";
import { FANTASY_DEFAULT_CONFIG, type FantasyTakeScoreConfig } from "@/lib/fantasy-takescore";
import { scoreToGrade } from "@/lib/takescore";

function Field({
  label,
  value,
  onChange,
  tooltip,
}: {
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

function TextareaField({
  label,
  value,
  onChange,
  tooltip,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  tooltip?: string;
}) {
  return (
    <div className="py-2 border-b border-zinc-800 last:border-0 space-y-1">
      <p className="text-sm text-zinc-200">{label}</p>
      {tooltip && <p className="text-xs text-zinc-500">{tooltip}</p>}
      <textarea
        value={value}
        onChange={e => onChange(e.target.value)}
        rows={2}
        className="w-full rounded bg-zinc-800 border border-zinc-700 px-2 py-1.5 text-sm text-zinc-100 focus:outline-none focus:border-zinc-500 resize-none"
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

export default function FantasyScoringConfig({
  initial,
  configHistory,
  adminEmail,
}: {
  initial: FantasyTakeScoreConfig;
  configHistory: Array<{
    id: string;
    changed_at: string;
    changed_by: string;
    changes: Record<string, unknown>;
  }>;
  adminEmail: string;
}) {
  const [cfg, setCfg] = useState<FantasyTakeScoreConfig>(initial);
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  function setNum(key: keyof FantasyTakeScoreConfig, value: number) {
    setCfg(prev => ({ ...prev, [key]: value }));
    setSaved(false);
  }

  function setStr(key: keyof FantasyTakeScoreConfig, value: string) {
    setCfg(prev => ({ ...prev, [key]: value }));
    setSaved(false);
  }

  function handleSave() {
    startTransition(async () => {
      await saveFantasyConfig(cfg, adminEmail);
      setSaved(true);
    });
  }

  function handleReset() {
    setCfg(FANTASY_DEFAULT_CONFIG);
    startTransition(async () => {
      await saveFantasyConfig(FANTASY_DEFAULT_CONFIG, adminEmail);
      setSaved(true);
    });
  }

  return (
    <div className="space-y-5">
      {/* Save / reset row */}
      <div className="flex items-center justify-between gap-4">
        <div className="text-sm text-zinc-400">
          {configHistory[0] && (
            <>
              Last saved {new Date(configHistory[0].changed_at).toLocaleString()} by{" "}
              {configHistory[0].changed_by}
            </>
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

      <div className="grid md:grid-cols-2 gap-4">

        {/* 1 — Accuracy Tiers */}
        <Section title="A — Accuracy Tier Values">
          <Field label="Nailed it (100)" value={cfg.accuracy_nailed} onChange={v => setNum("accuracy_nailed", v)} />
          <Field label="Mostly right (75)" value={cfg.accuracy_mostly_right} onChange={v => setNum("accuracy_mostly_right", v)} />
          <Field label="Half right (50)" value={cfg.accuracy_half_right} onChange={v => setNum("accuracy_half_right", v)} />
          <Field label="Mostly wrong (25)" value={cfg.accuracy_mostly_wrong} onChange={v => setNum("accuracy_mostly_wrong", v)} />
          <Field label="Completely wrong (0)" value={cfg.accuracy_wrong} onChange={v => setNum("accuracy_wrong", v)} />
        </Section>

        {/* 2 — Timing Window Modifiers */}
        <Section title="Timing Window Boldness Modifiers">
          <Field label="Preseason" value={cfg.timing_preseason_mod} onChange={v => setNum("timing_preseason_mod", v)} tooltip="Added to boldness when take is made in preseason" />
          <Field label="Post-Draft" value={cfg.timing_post_draft_mod} onChange={v => setNum("timing_post_draft_mod", v)} />
          <Field label="Early Season" value={cfg.timing_early_season_mod} onChange={v => setNum("timing_early_season_mod", v)} />
          <Field label="Midseason" value={cfg.timing_midseason_mod} onChange={v => setNum("timing_midseason_mod", v)} />
          <Field label="Late Season" value={cfg.timing_late_season_mod} onChange={v => setNum("timing_late_season_mod", v)} />
          <Field label="Playoffs" value={cfg.timing_playoffs_mod} onChange={v => setNum("timing_playoffs_mod", v)} />
        </Section>

        {/* 3 — Boldness Credit */}
        <Section title="BC — Boldness Credit (incorrect takes only)">
          <Field label="Moonshot threshold (B ≥)" value={cfg.bc_moonshot_min} onChange={v => setNum("bc_moonshot_min", v)} />
          <Field label="Moonshot credit value" value={cfg.bc_moonshot_value} onChange={v => setNum("bc_moonshot_value", v)} />
          <Field label="Bold miss threshold (B ≥)" value={cfg.bc_bold_min} onChange={v => setNum("bc_bold_min", v)} />
          <Field label="Bold miss credit value" value={cfg.bc_bold_value} onChange={v => setNum("bc_bold_value", v)} />
          <Field label="Neutral miss threshold (B ≥)" value={cfg.bc_neutral_min} onChange={v => setNum("bc_neutral_min", v)} />
          <Field label="Neutral miss value" value={cfg.bc_neutral_value} onChange={v => setNum("bc_neutral_value", v)} />
          <Field label="Safe take miss penalty" value={cfg.bc_safe_value} onChange={v => setNum("bc_safe_value", v)} />
        </Section>

        {/* 4 — Volume Multiplier */}
        <Section title="V — Volume Multiplier">
          <Field label="High-volume takes threshold" value={cfg.vol_high_takes} onChange={v => setNum("vol_high_takes", v)} />
          <Field label="High-volume boldness threshold" value={cfg.vol_high_boldness} onChange={v => setNum("vol_high_boldness", v)} />
          <Field label="High-volume multiplier" value={cfg.vol_high_mult} onChange={v => setNum("vol_high_mult", v)} />
          <Field label="Mid-volume takes threshold" value={cfg.vol_mid_takes} onChange={v => setNum("vol_mid_takes", v)} />
          <Field label="Mid-volume boldness threshold" value={cfg.vol_mid_boldness} onChange={v => setNum("vol_mid_boldness", v)} />
          <Field label="Mid-volume multiplier" value={cfg.vol_mid_mult} onChange={v => setNum("vol_mid_mult", v)} />
          <Field label="Low-volume takes threshold" value={cfg.vol_low_takes} onChange={v => setNum("vol_low_takes", v)} />
          <Field label="Low-volume multiplier" value={cfg.vol_low_mult} onChange={v => setNum("vol_low_mult", v)} />
          <Field label="Minimum (under threshold)" value={cfg.vol_min_mult} onChange={v => setNum("vol_min_mult", v)} />
          <Field label="High takes / low boldness" value={cfg.vol_low_boldness_mult} onChange={v => setNum("vol_low_boldness_mult", v)} />
        </Section>

        {/* 5 — Decay Multiplier */}
        <Section title="D — Decay Multiplier (days inactive)">
          <Field label="0–30 days" value={cfg.decay_30_mult} onChange={v => setNum("decay_30_mult", v)} />
          <Field label="31–90 days" value={cfg.decay_90_mult} onChange={v => setNum("decay_90_mult", v)} />
          <Field label="91–180 days" value={cfg.decay_180_mult} onChange={v => setNum("decay_180_mult", v)} />
          <Field label="181–365 days" value={cfg.decay_365_mult} onChange={v => setNum("decay_365_mult", v)} />
          <Field label="365+ days" value={cfg.decay_old_mult} onChange={v => setNum("decay_old_mult", v)} />
        </Section>

        {/* 6 — Engine Settings */}
        <Section title="Engine Settings">
          <Field
            label="Rolling window (# of takes)"
            value={cfg.rolling_window}
            onChange={v => setNum("rolling_window", v)}
            tooltip="How many takes factor into the rolling average"
          />
          <Field
            label="Normalization divisor"
            value={cfg.normalization_divisor}
            onChange={v => setNum("normalization_divisor", v)}
            tooltip="Divides raw impact avg to fit 0–100 scale. Higher = lower scores overall."
          />
        </Section>

        {/* 7 — Grade Scale */}
        <Section title="Grade Scale (score thresholds)">
          <p className="text-xs text-zinc-500 mb-3">
            Preview:{" "}
            {[100, 75, 65, 55, 45, 35, 25, 15, 5].map(s => (
              <span key={s} className="ml-2 font-mono">
                {s}→<strong>{scoreToGrade(s, cfg)}</strong>
              </span>
            ))}
          </p>
          {(
            [
              { key: "grade_a_min",      label: "A  (≥ this score)" },
              { key: "grade_bplus_min",  label: "B+ (≥ this score)" },
              { key: "grade_b_min",      label: "B  (≥ this score)" },
              { key: "grade_bminus_min", label: "B− (≥ this score)" },
              { key: "grade_cplus_min",  label: "C+ (≥ this score)" },
              { key: "grade_c_min",      label: "C  (≥ this score)" },
              { key: "grade_cminus_min", label: "C− (≥ this score)" },
              { key: "grade_d_min",      label: "D  (≥ this score, below = F)" },
            ] as const
          ).map(({ key, label }) => (
            <Field key={key} label={label} value={cfg[key]} onChange={v => setNum(key, v)} />
          ))}
        </Section>

        {/* 8 — ADP Reference */}
        <Section title="ADP Reference Source">
          <div className="py-2 space-y-1">
            <p className="text-sm text-zinc-200">Reference Source</p>
            <input
              type="text"
              value={cfg.adp_reference_source}
              onChange={e => setStr("adp_reference_source", e.target.value)}
              className="w-full rounded bg-zinc-800 border border-zinc-700 px-2 py-1 text-sm text-zinc-100 focus:outline-none focus:border-zinc-500"
            />
          </div>
        </Section>

      </div>

      {/* 9 — Category Definitions */}
      <Section title="Category Definitions">
        <TextareaField
          label="Breakout Call"
          value={cfg.category_breakout_def}
          onChange={v => setStr("category_breakout_def", v)}
        />
        <TextareaField
          label="Bust Call"
          value={cfg.category_bust_def}
          onChange={v => setStr("category_bust_def", v)}
        />
        <TextareaField
          label="Sleeper Pick"
          value={cfg.category_sleeper_def}
          onChange={v => setStr("category_sleeper_def", v)}
        />
        <TextareaField
          label="Start/Sit"
          value={cfg.category_start_sit_def}
          onChange={v => setStr("category_start_sit_def", v)}
        />
        <TextareaField
          label="Waiver Wire Add"
          value={cfg.category_waiver_def}
          onChange={v => setStr("category_waiver_def", v)}
        />
      </Section>

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
                {Object.keys(entry.changes as object).length} field
                {Object.keys(entry.changes as object).length !== 1 ? "s" : ""} changed
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
