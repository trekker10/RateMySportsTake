import {
  TakeScoreConfig,
  DEFAULT_CONFIG,
  computeTakeScore,
  getBoldnessCredit,
  getRecencyWeight,
  calculateImpact,
  getVolumeMultiplier,
  getDecayMultiplier,
  type ScoredTake,
} from "@/lib/takescore";

// Re-export for convenience
export {
  getBoldnessCredit,
  getRecencyWeight,
  calculateImpact,
  getVolumeMultiplier,
  getDecayMultiplier,
};

// ─── Config ───────────────────────────────────────────────────────────────────

export interface FantasyTakeScoreConfig extends TakeScoreConfig {
  // Timing window modifiers (added to boldness-equivalent score)
  timing_preseason_mod: number;
  timing_post_draft_mod: number;
  timing_early_season_mod: number;
  timing_midseason_mod: number;
  timing_late_season_mod: number;
  timing_playoffs_mod: number;
  // ADP reference
  adp_reference_source: string;
  // Category definitions
  category_breakout_def: string;
  category_bust_def: string;
  category_sleeper_def: string;
  category_start_sit_def: string;
  category_waiver_def: string;
}

export const FANTASY_DEFAULT_CONFIG: FantasyTakeScoreConfig = {
  ...DEFAULT_CONFIG,
  timing_preseason_mod: 15,
  timing_post_draft_mod: 10,
  timing_early_season_mod: 5,
  timing_midseason_mod: 0,
  timing_late_season_mod: -10,
  timing_playoffs_mod: -15,
  adp_reference_source: "FantasyPros ECR",
  category_breakout_def:
    "A season-long prediction that a player will finish at least one full tier above their preseason ADP. Finishing top 12 when drafted outside top 24, or top 24 when drafted outside top 36.",
  category_bust_def:
    "A season-long prediction that a player drafted in rounds 1-2 will finish outside the top 24 at their position.",
  category_sleeper_def:
    "A season-long prediction on a player drafted outside top 100 overall who finishes as a top 20 option at their position.",
  category_start_sit_def:
    "A weekly prediction to start or sit a player. Start hit = top 12 at position that week. Sit hit = outside top 20 at position that week.",
  category_waiver_def:
    "A prediction on a player owned in fewer than 30% of leagues who finishes as a top 20 weekly scorer at their position that week.",
};

// ─── Timing windows ───────────────────────────────────────────────────────────

export const TIMING_WINDOWS: Array<{ value: string; label: string; modifier: number }> = [
  { value: "preseason",     label: "Preseason",       modifier: 15  },
  { value: "post_draft",    label: "Post-Draft",       modifier: 10  },
  { value: "early_season",  label: "Early Season",    modifier: 5   },
  { value: "midseason",     label: "Midseason",       modifier: 0   },
  { value: "late_season",   label: "Late Season",     modifier: -10 },
  { value: "playoffs",      label: "Playoffs",        modifier: -15 },
];

// ─── Categories ───────────────────────────────────────────────────────────────

export const TAKE_CATEGORIES: Array<{ value: string; label: string; description: string }> = [
  {
    value: "breakout",
    label: "Breakout Call",
    description:
      "Season-long prediction that a player will finish at least one full tier above their preseason ADP.",
  },
  {
    value: "bust",
    label: "Bust Call",
    description:
      "Season-long prediction that a player drafted in rounds 1-2 will finish outside the top 24 at their position.",
  },
  {
    value: "sleeper",
    label: "Sleeper Pick",
    description:
      "Season-long prediction on a player drafted outside top 100 overall who finishes as a top 20 option at their position.",
  },
  {
    value: "start_sit",
    label: "Start/Sit",
    description:
      "Weekly prediction to start or sit a player. Start hit = top 12 at position that week. Sit hit = outside top 20.",
  },
  {
    value: "waiver",
    label: "Waiver Wire Add",
    description:
      "Prediction on a player owned in fewer than 30% of leagues who finishes as a top 20 weekly scorer at their position.",
  },
];

// ─── Accuracy tiers ───────────────────────────────────────────────────────────

export const ACCURACY_TIERS: Array<{ score: number; label: string; description: string }> = [
  { score: 100, label: "Nailed It",           description: "Exactly right — player hit or exceeded the prediction" },
  { score: 75,  label: "Mostly Right",        description: "Core prediction correct, minor details off" },
  { score: 60,  label: "Directionally Right", description: "Right direction but fell short of the threshold" },
  { score: 50,  label: "Half Right",          description: "Mixed result — some elements correct, some wrong" },
  { score: 25,  label: "Mostly Wrong",        description: "Prediction mostly wrong but had some merit" },
  { score: 0,   label: "Wrong",               description: "Completely wrong or did not come close" },
];

// ─── Fantasy take interface ───────────────────────────────────────────────────

export interface FantasyScoredTake {
  fantasy_take_id: string;
  expert_id: string;
  category: string;
  raw_text: string;
  player_name: string | null;
  player_position: string | null;
  player_adp: number | null;
  timing_window: string | null;
  timing_modifier: number | null;
  boldness_score: number | null;
  accuracy_score: number | null;
  outcome_status: string;
  date_made: string;
  resolution_date: string | null;
  sport_season: string | null;
  impact_score: number | null;
  recency_weight: number | null;
  boldness_credit: number | null;
  format: "dynasty" | "redraft" | "both" | null;
  source_url: string | null;
  created_at: string | null;
  content_type: string | null;
}

// ─── Score computation ────────────────────────────────────────────────────────

/**
 * Suggest a boldness score based on ADP and timing window.
 * Higher ADP (later draft pick) + early timing = higher boldness suggestion.
 */
export function suggestBoldness(
  adp: number | null,
  timingWindow: string,
  cfg: FantasyTakeScoreConfig,
): number {
  // Base boldness from ADP — later picks are bolder calls
  let base = 50;
  if (adp !== null) {
    if (adp <= 12)  base = 20;
    else if (adp <= 24) base = 35;
    else if (adp <= 36) base = 50;
    else if (adp <= 60) base = 65;
    else if (adp <= 100) base = 75;
    else base = 85;
  }

  // Apply timing modifier
  const timingMod = getTimingModifier(timingWindow, cfg);
  const suggested = Math.max(0, Math.min(100, base + timingMod));
  return Math.round(suggested);
}

function getTimingModifier(timingWindow: string, cfg: FantasyTakeScoreConfig): number {
  switch (timingWindow) {
    case "preseason":    return cfg.timing_preseason_mod;
    case "post_draft":   return cfg.timing_post_draft_mod;
    case "early_season": return cfg.timing_early_season_mod;
    case "midseason":    return cfg.timing_midseason_mod;
    case "late_season":  return cfg.timing_late_season_mod;
    case "playoffs":     return cfg.timing_playoffs_mod;
    default:             return 0;
  }
}

/**
 * Map fantasy takes to ScoredTake[] and run computeTakeScore.
 */
export function computeFantasyTakeScore(
  takes: FantasyScoredTake[],
  cfg: FantasyTakeScoreConfig,
) {
  const scored: ScoredTake[] = takes.map(t => {
    // Determine outcome_status for scoring engine
    // 'resolved' with accuracy_score > 50 → confirmed_true (gets no boldness credit)
    // 'resolved' with accuracy_score <= 50 → confirmed_false (gets boldness credit)
    let outcomeStatus = t.outcome_status;
    if (t.outcome_status === "resolved") {
      outcomeStatus = (t.accuracy_score ?? 0) > 50 ? "confirmed_true" : "confirmed_false";
    }

    return {
      take_id: t.fantasy_take_id,
      date_made: t.date_made,
      accuracy_score: t.accuracy_score,
      boldness_score: t.boldness_score,
      outcome_status: outcomeStatus,
      impact_score: t.impact_score,
      boldness_credit: t.boldness_credit,
      recency_weight: t.recency_weight,
    };
  });

  return computeTakeScore(scored, cfg);
}

// ─── Accolades ────────────────────────────────────────────────────────────────

export interface FantasyAccoladeDefinition {
  key: string;
  emoji: string;
  label: string;
}

export const FANTASY_ACCOLADE_DEFS: FantasyAccoladeDefinition[] = [
  { key: "crystal_ball",    emoji: "🔮", label: "Crystal Ball"      },
  { key: "bust_whisperer",  emoji: "💀", label: "Bust Whisperer"    },
  { key: "waiver_wizard",   emoji: "📡", label: "Waiver Wizard"     },
  { key: "sharp_drafter",   emoji: "🎯", label: "Sharp Drafter"     },
  { key: "streaming_king",  emoji: "🚿", label: "Streaming King"    },
  { key: "fade_this_guru",  emoji: "🤦", label: "Fade This Guru"    },
  { key: "early_bird",      emoji: "📅", label: "Early Bird"        },
];

export interface FantasyExpertRow {
  expert_id: string;
  name: string;
  fantasy_overall_rating: number;
  fantasy_graded_takes: number;
  fantasy_boldness_avg: number;
  fantasy_accuracy_rate: number;
  fantasy_last_take_date: string | null;
  takes?: FantasyScoredTake[];
}

/**
 * Compute which fantasy accolades apply to an expert.
 */
export function computeFantasyAccolades(
  expertId: string,
  fantasyTakes: FantasyScoredTake[],
  allExperts: FantasyExpertRow[],
): string[] {
  const keys: string[] = [];

  const expertTakes = fantasyTakes.filter(t => t.expert_id === expertId);
  const resolvedTakes = expertTakes.filter(t => t.outcome_status === "resolved");
  const expert = allExperts.find(e => e.expert_id === expertId);

  if (!expert) return keys;

  // Crystal Ball — top breakout caller: ≥3 breakout takes resolved, avg accuracy ≥ 75
  const breakoutTakes = resolvedTakes.filter(t => t.category === "breakout");
  const breakoutAvg = breakoutTakes.length > 0
    ? breakoutTakes.reduce((s, t) => s + (t.accuracy_score ?? 0), 0) / breakoutTakes.length
    : 0;
  if (breakoutTakes.length >= 3 && breakoutAvg >= 75) keys.push("crystal_ball");

  // Bust Whisperer — ≥3 bust calls resolved, avg accuracy ≥ 75
  const bustTakes = resolvedTakes.filter(t => t.category === "bust");
  const bustAvg = bustTakes.length > 0
    ? bustTakes.reduce((s, t) => s + (t.accuracy_score ?? 0), 0) / bustTakes.length
    : 0;
  if (bustTakes.length >= 3 && bustAvg >= 75) keys.push("bust_whisperer");

  // Waiver Wizard — ≥5 waiver takes resolved, avg accuracy ≥ 70
  const waiverTakes = resolvedTakes.filter(t => t.category === "waiver");
  const waiverAvg = waiverTakes.length > 0
    ? waiverTakes.reduce((s, t) => s + (t.accuracy_score ?? 0), 0) / waiverTakes.length
    : 0;
  if (waiverTakes.length >= 5 && waiverAvg >= 70) keys.push("waiver_wizard");

  // Sharp Drafter — ≥5 total takes, avg accuracy across breakout/bust/sleeper ≥ 70
  const draftingTakes = resolvedTakes.filter(t => ["breakout", "bust", "sleeper"].includes(t.category));
  const draftingAvg = draftingTakes.length > 0
    ? draftingTakes.reduce((s, t) => s + (t.accuracy_score ?? 0), 0) / draftingTakes.length
    : 0;
  if (draftingTakes.length >= 5 && draftingAvg >= 70) keys.push("sharp_drafter");

  // Streaming King — ≥5 start/sit takes resolved, avg accuracy ≥ 70
  const startSitTakes = resolvedTakes.filter(t => t.category === "start_sit");
  const startSitAvg = startSitTakes.length > 0
    ? startSitTakes.reduce((s, t) => s + (t.accuracy_score ?? 0), 0) / startSitTakes.length
    : 0;
  if (startSitTakes.length >= 5 && startSitAvg >= 70) keys.push("streaming_king");

  // Fade This Guru — ≥10 graded takes, overall accuracy < 30
  if (expert.fantasy_graded_takes >= 10 && expert.fantasy_accuracy_rate < 30) keys.push("fade_this_guru");

  // Early Bird — ≥3 preseason or post_draft takes resolved with accuracy ≥ 75
  const earlyTakes = resolvedTakes.filter(t =>
    t.timing_window === "preseason" || t.timing_window === "post_draft"
  );
  const earlyAvg = earlyTakes.length > 0
    ? earlyTakes.reduce((s, t) => s + (t.accuracy_score ?? 0), 0) / earlyTakes.length
    : 0;
  if (earlyTakes.length >= 3 && earlyAvg >= 75) keys.push("early_bird");

  return keys;
}
