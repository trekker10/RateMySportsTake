export interface TakeScoreConfig {
  accuracy_nailed: number;
  accuracy_mostly_right: number;
  accuracy_half_right: number;
  accuracy_mostly_wrong: number;
  accuracy_wrong: number;
  bc_moonshot_min: number;
  bc_moonshot_value: number;
  bc_bold_min: number;
  bc_bold_value: number;
  bc_neutral_min: number;
  bc_neutral_value: number;
  bc_safe_value: number;
  recency_recent_count: number;
  recency_recent_weight: number;
  recency_standard_weight: number;
  recency_old_days: number;
  recency_old_weight: number;
  vol_high_takes: number;
  vol_high_boldness: number;
  vol_high_mult: number;
  vol_mid_takes: number;
  vol_mid_boldness: number;
  vol_mid_mult: number;
  vol_low_takes: number;
  vol_low_mult: number;
  vol_min_mult: number;
  vol_low_boldness_mult: number;
  decay_30_mult: number;
  decay_90_mult: number;
  decay_180_mult: number;
  decay_365_mult: number;
  decay_old_mult: number;
  rolling_window: number;
  normalization_divisor: number;
  // Grade scale thresholds (score must be >= threshold to earn that grade)
  grade_a_min: number;
  grade_bplus_min: number;
  grade_b_min: number;
  grade_bminus_min: number;
  grade_cplus_min: number;
  grade_c_min: number;
  grade_cminus_min: number;
  grade_d_min: number;
}

export const DEFAULT_CONFIG: TakeScoreConfig = {
  accuracy_nailed: 100,
  accuracy_mostly_right: 75,
  accuracy_half_right: 50,
  accuracy_mostly_wrong: 25,
  accuracy_wrong: 0,
  bc_moonshot_min: 90,
  bc_moonshot_value: 15,
  bc_bold_min: 70,
  bc_bold_value: 8,
  bc_neutral_min: 40,
  bc_neutral_value: 0,
  bc_safe_value: -10,
  recency_recent_count: 5,
  recency_recent_weight: 1.5,
  recency_standard_weight: 1.0,
  recency_old_days: 730,
  recency_old_weight: 0.7,
  vol_high_takes: 20,
  vol_high_boldness: 25,
  vol_high_mult: 1.0,
  vol_mid_takes: 10,
  vol_mid_boldness: 25,
  vol_mid_mult: 0.9,
  vol_low_takes: 5,
  vol_low_mult: 0.75,
  vol_min_mult: 0.60,
  vol_low_boldness_mult: 0.85,
  decay_30_mult: 1.0,
  decay_90_mult: 0.95,
  decay_180_mult: 0.85,
  decay_365_mult: 0.75,
  decay_old_mult: 0.65,
  rolling_window: 20,
  normalization_divisor: 2.0,
  grade_a_min: 80,
  grade_bplus_min: 70,
  grade_b_min: 60,
  grade_bminus_min: 50,
  grade_cplus_min: 40,
  grade_c_min: 30,
  grade_cminus_min: 20,
  grade_d_min: 10,
};

export function scoreToGrade(score: number, cfg?: Partial<TakeScoreConfig>): string {
  const c = { ...DEFAULT_CONFIG, ...(cfg ?? {}) };
  if (score >= c.grade_a_min)      return "A";
  if (score >= c.grade_bplus_min)  return "B+";
  if (score >= c.grade_b_min)      return "B";
  if (score >= c.grade_bminus_min) return "B−";
  if (score >= c.grade_cplus_min)  return "C+";
  if (score >= c.grade_c_min)      return "C";
  if (score >= c.grade_cminus_min) return "C−";
  if (score >= c.grade_d_min)      return "D";
  return "F";
}

export function gradeColor(grade: string): string {
  if (grade === "A")  return "#0a7a3b";
  if (grade === "B+") return "#16a34a";
  if (grade === "B")  return "#4b8c3f";
  if (grade === "B−") return "#92400e";
  if (grade === "C+") return "#b45309";
  if (grade === "C")  return "#c2410c";
  if (grade === "C−") return "#dc2626";
  if (grade === "D")  return "#b91c1c";
  return "#991b1b"; // F
}

export interface ScoredTake {
  take_id: string;
  date_made: string;
  accuracy_score: number | null;
  boldness_score: number | null;
  outcome_status: string;
  impact_score?: number | null;
  boldness_credit?: number | null;
  recency_weight?: number | null;
}

export function getBoldnessCredit(boldness: number, isCorrect: boolean, cfg: TakeScoreConfig): number {
  if (isCorrect) return 0;
  if (boldness >= cfg.bc_moonshot_min) return cfg.bc_moonshot_value;
  if (boldness >= cfg.bc_bold_min)     return cfg.bc_bold_value;
  if (boldness >= cfg.bc_neutral_min)  return cfg.bc_neutral_value;
  return cfg.bc_safe_value;
}

export function getRecencyWeight(positionInWindow: number, dateMade: string, cfg: TakeScoreConfig): number {
  const daysOld = (Date.now() - new Date(dateMade).getTime()) / 86_400_000;
  if (daysOld > cfg.recency_old_days)            return cfg.recency_old_weight;
  if (positionInWindow <= cfg.recency_recent_count) return cfg.recency_recent_weight;
  return cfg.recency_standard_weight;
}

export function calculateImpact(A: number, B: number, BC: number, R: number): number {
  return (A * (1 + B / 100) + BC) * R;
}

export function getVolumeMultiplier(totalTakes: number, avgBoldness: number, cfg: TakeScoreConfig): number {
  if (totalTakes >= cfg.vol_high_takes && avgBoldness >= cfg.vol_high_boldness) return cfg.vol_high_mult;
  if (totalTakes >= cfg.vol_high_takes)                                          return cfg.vol_low_boldness_mult;
  if (totalTakes >= cfg.vol_mid_takes && avgBoldness >= cfg.vol_mid_boldness)   return cfg.vol_mid_mult;
  if (totalTakes >= cfg.vol_low_takes)                                           return cfg.vol_low_mult;
  return cfg.vol_min_mult;
}

export function getDecayMultiplier(daysSinceLastTake: number, cfg: TakeScoreConfig): number {
  if (daysSinceLastTake <= 30)  return cfg.decay_30_mult;
  if (daysSinceLastTake <= 90)  return cfg.decay_90_mult;
  if (daysSinceLastTake <= 180) return cfg.decay_180_mult;
  if (daysSinceLastTake <= 365) return cfg.decay_365_mult;
  return cfg.decay_old_mult;
}

export interface TakeScoreResult {
  takeScore: number;
  volumeMultiplier: number;
  decayMultiplier: number;
  avgBoldness: number;
  avgAccuracy: number;
  gradedTakes: number;
  perTake: Array<{ take_id: string; impact: number; BC: number; R: number }>;
}

export function computeTakeScore(
  allTakes: ScoredTake[],
  cfg: TakeScoreConfig,
): TakeScoreResult {
  const sorted = [...allTakes].sort(
    (a, b) => new Date(b.date_made).getTime() - new Date(a.date_made).getTime(),
  );

  const graded = sorted.filter(t => t.accuracy_score !== null && t.boldness_score !== null);

  const avgBoldness =
    allTakes.length > 0
      ? allTakes.reduce((s, t) => s + (t.boldness_score ?? 0), 0) / allTakes.length
      : 0;

  const avgAccuracy =
    graded.length > 0
      ? graded.reduce((s, t) => s + (t.accuracy_score ?? 0), 0) / graded.length
      : 0;

  if (graded.length === 0) {
    return {
      takeScore: 0,
      volumeMultiplier: cfg.vol_min_mult,
      decayMultiplier: cfg.decay_old_mult,
      avgBoldness: Math.round(avgBoldness * 10) / 10,
      avgAccuracy: 0,
      gradedTakes: 0,
      perTake: [],
    };
  }

  const lastTakeDate = new Date(sorted[0].date_made);
  const daysSinceLast = (Date.now() - lastTakeDate.getTime()) / 86_400_000;

  const window = graded.slice(0, cfg.rolling_window);
  const perTake: TakeScoreResult["perTake"] = [];
  let impactSum = 0;

  window.forEach((take, idx) => {
    const A  = take.accuracy_score!;
    const B  = take.boldness_score!;
    const isCorrect = take.outcome_status === "confirmed_true";
    const BC = getBoldnessCredit(B, isCorrect, cfg);
    const R  = getRecencyWeight(idx + 1, take.date_made, cfg);
    const impact = calculateImpact(A, B, BC, R);
    impactSum += impact;
    perTake.push({ take_id: take.take_id, impact, BC, R });
  });

  const rawAvg = impactSum / window.length;
  const V = getVolumeMultiplier(allTakes.length, avgBoldness, cfg);
  const D = getDecayMultiplier(daysSinceLast, cfg);
  const takeScore = Math.min(100, Math.max(0, (rawAvg / cfg.normalization_divisor) * V * D));

  return {
    takeScore: Math.round(takeScore * 10) / 10,
    volumeMultiplier: V,
    decayMultiplier: D,
    avgBoldness: Math.round(avgBoldness * 10) / 10,
    avgAccuracy: Math.round(avgAccuracy * 10) / 10,
    gradedTakes: graded.length,
    perTake,
  };
}

// ─── Accolades ───────────────────────────────────────────────────────────────

export interface AccoladeDefinition {
  key: string;
  emoji: string;
  label: string;
  isManual?: boolean;
}

export const ACCOLADE_DEFS: AccoladeDefinition[] = [
  { key: "elite_analyst",       emoji: "🏆", label: "Elite Analyst" },
  { key: "sharp_mind",          emoji: "📈", label: "Sharp Mind" },
  { key: "fading_fast",         emoji: "📉", label: "Fading Fast" },
  { key: "take_landfill",       emoji: "🗑️", label: "Take Landfill" },
  { key: "dead_eye",            emoji: "🎯", label: "Dead Eye" },
  { key: "lock_of_century",     emoji: "💸", label: "Lock of the Century" },
  { key: "fade_this_guy",       emoji: "🤡", label: "Fade This Guy" },
  { key: "broken_clock",        emoji: "⏳", label: "Broken Clock" },
  { key: "scorched_earth",      emoji: "🔥", label: "Scorched Earth" },
  { key: "on_a_heater",         emoji: "📈", label: "On a Heater" },
  { key: "in_freefall",         emoji: "📉", label: "In Freefall" },
  { key: "flip_flopper",        emoji: "🔄", label: "Flip Flopper", isManual: true },
  { key: "consistent_diamond",  emoji: "💎", label: "Consistent Diamond" },
  { key: "inactive",            emoji: "⚠️", label: "Inactive" },
];

export interface ExpertSnapshot {
  expert_id: string;
  takeScore: number;
  gradedTakes: number;
  avgAccuracy: number;
  avgBoldness: number;
  daysSinceLast: number;
  recentScoreChange?: number;
  takes: ScoredTake[];
}

export function computeAutoAccolades(snap: ExpertSnapshot, allSnaps: ExpertSnapshot[]): string[] {
  const keys: string[] = [];
  const ranked = [...allSnaps]
    .filter(s => s.gradedTakes > 0)
    .sort((a, b) => b.takeScore - a.takeScore);
  const total = ranked.length;
  const idx = ranked.findIndex(s => s.expert_id === snap.expert_id);
  const pct = total > 0 && idx !== -1 ? (idx + 1) / total : null;

  if (pct !== null && total >= 5) {
    if (pct <= 0.10) keys.push("elite_analyst");
    else if (pct <= 0.25) keys.push("sharp_mind");
    if (pct >= 0.90) keys.push("take_landfill");
    else if (pct >= 0.75) keys.push("fading_fast");
  }

  // Dead Eye — highest accuracy on site
  const maxAccuracy = Math.max(...allSnaps.filter(s => s.gradedTakes >= 5).map(s => s.avgAccuracy));
  if (snap.gradedTakes >= 5 && snap.avgAccuracy >= maxAccuracy && maxAccuracy > 0) keys.push("dead_eye");

  // Lock of the Century — any take with impact >= 180 that was correct
  const hasLock = snap.takes.some(t => (t.impact_score ?? 0) >= 180 && t.outcome_status === "confirmed_true");
  if (hasLock) keys.push("lock_of_century");

  // Fade This Guy
  if (snap.gradedTakes >= 10 && snap.avgAccuracy < 25) keys.push("fade_this_guy");

  // Broken Clock
  if (snap.gradedTakes >= 15 && snap.avgAccuracy >= 20 && snap.avgAccuracy <= 35) keys.push("broken_clock");

  // Scorched Earth
  if (snap.gradedTakes >= 10 && snap.avgBoldness > 80) keys.push("scorched_earth");

  // On a Heater / In Freefall
  if (snap.recentScoreChange !== undefined) {
    if (snap.recentScoreChange >= 15) keys.push("on_a_heater");
    if (snap.recentScoreChange <= -15) keys.push("in_freefall");
  }

  // Consistent Diamond
  if (snap.gradedTakes >= 20) {
    const last20 = [...snap.takes]
      .filter(t => t.impact_score !== null)
      .sort((a, b) => new Date(b.date_made).getTime() - new Date(a.date_made).getTime())
      .slice(0, 20);
    if (last20.length === 20) {
      const impacts = last20.map(t => t.impact_score ?? 0);
      const variance = Math.max(...impacts) - Math.min(...impacts);
      if (variance <= 10) keys.push("consistent_diamond");
    }
  }

  // Inactive
  if (snap.daysSinceLast >= 365) keys.push("inactive");

  return keys;
}
