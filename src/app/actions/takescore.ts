"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { checkIsAdmin } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import {
  computeTakeScore,
  getBoldnessCredit,
  getRecencyWeight,
  calculateImpact,
  computeAutoAccolades,
  DEFAULT_CONFIG,
  type TakeScoreConfig,
  type ExpertSnapshot,
} from "@/lib/takescore";

// ─── Config ───────────────────────────────────────────────────────────────────

export async function getTakeScoreConfig(): Promise<TakeScoreConfig> {
  const supabase = createAdminClient();
  const { data } = await supabase.from("take_score_config").select("*").eq("id", "default").single();
  // Merge with defaults so new fields work even before DB migration
  return { ...DEFAULT_CONFIG, ...(data ?? {}) } as TakeScoreConfig;
}

export async function saveTakeScoreConfig(
  cfg: Partial<TakeScoreConfig>,
  adminEmail: string,
): Promise<void> {
  const isAdmin = await checkIsAdmin();
  if (!isAdmin) throw new Error("Unauthorized");

  const supabase = createAdminClient();
  const prev = await getTakeScoreConfig();
  const changes: Record<string, { from: unknown; to: unknown }> = {};
  for (const key of Object.keys(cfg) as (keyof TakeScoreConfig)[]) {
    if (cfg[key] !== undefined && cfg[key] !== prev[key]) {
      changes[key] = { from: prev[key], to: cfg[key] };
    }
  }

  await supabase.from("take_score_config").update({
    ...cfg,
    updated_at: new Date().toISOString(),
    updated_by: adminEmail,
  }).eq("id", "default");

  if (Object.keys(changes).length > 0) {
    await supabase.from("config_change_log").insert({
      changed_by: adminEmail,
      changes,
    });
  }

  // Recalculate all scores with new config
  await recalculateAllTakeScores();
  revalidatePath("/admin/takescore");
}

export async function resetTakeScoreConfig(adminEmail: string): Promise<void> {
  await saveTakeScoreConfig(DEFAULT_CONFIG, adminEmail);
}

export async function getConfigHistory(): Promise<Array<{
  id: string;
  changed_at: string;
  changed_by: string;
  changes: Record<string, { from: unknown; to: unknown }>;
}>> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("config_change_log")
    .select("*")
    .order("changed_at", { ascending: false })
    .limit(20);
  return data ?? [];
}

// ─── Scoring engine ───────────────────────────────────────────────────────────

export async function recalculateTakeScore(expertId: string): Promise<void> {
  const supabase = createAdminClient();
  const cfg = await getTakeScoreConfig();

  const { data: takes } = await supabase
    .from("takes")
    .select("take_id, date_made, accuracy_score, boldness_score, outcome_status, impact_score")
    .eq("expert_id", expertId)
    .order("date_made", { ascending: false });

  if (!takes) return;

  const result = computeTakeScore(takes, cfg);

  // Update per-take impact scores
  const sorted = [...takes].sort(
    (a, b) => new Date(b.date_made).getTime() - new Date(a.date_made).getTime(),
  );
  const graded = sorted.filter(t => t.accuracy_score !== null && t.boldness_score !== null);
  const window = graded.slice(0, cfg.rolling_window);

  for (let i = 0; i < window.length; i++) {
    const take = window[i];
    const A = take.accuracy_score!;
    const B = take.boldness_score!;
    const isCorrect = take.outcome_status === "confirmed_true";
    const BC = getBoldnessCredit(B, isCorrect, cfg);
    const R = getRecencyWeight(i + 1, take.date_made, cfg);
    const impact = calculateImpact(A, B, BC, R);

    await supabase.from("takes").update({
      boldness_credit: BC,
      recency_weight: R,
      impact_score: Math.round(impact * 100) / 100,
    }).eq("take_id", take.take_id);
  }

  const lastTake = sorted[0];
  const lastTakeDate = lastTake ? new Date(lastTake.date_made) : null;

  const expertUpdate: Record<string, unknown> = {
    boldness_avg: result.avgBoldness,
    volume_mult: result.volumeMultiplier,
    decay_mult: result.decayMultiplier,
    avg_impact: result.perTake.length > 0
      ? result.perTake.reduce((s, t) => s + t.impact, 0) / result.perTake.length
      : 0,
    last_take_date: lastTakeDate?.toISOString().split("T")[0] ?? null,
  };

  // Only overwrite overall_rating if the new engine actually has graded takes to work with.
  // Avoids zeroing out existing scores for analysts whose takes predate the new columns.
  if (result.gradedTakes > 0) {
    expertUpdate.overall_rating = result.takeScore;
  }

  await supabase.from("experts").update(expertUpdate).eq("expert_id", expertId);
}

export async function recalculateAllTakeScores(): Promise<void> {
  const supabase = createAdminClient();
  const { data: experts } = await supabase.from("experts").select("expert_id");
  for (const e of experts ?? []) {
    await recalculateTakeScore(e.expert_id);
  }
  await syncAllAccolades();
}

// ─── Take entry & grading ─────────────────────────────────────────────────────

export async function submitAdminTake(formData: {
  expert_id: string;
  raw_text: string;
  date_made: string;
  boldness_score: number;
  sport: string;
  predicted_outcome: string;
  time_horizon_date?: string;
  source_url?: string;
}): Promise<{ success: boolean; error?: string }> {
  const isAdmin = await checkIsAdmin();
  if (!isAdmin) return { success: false, error: "Unauthorized" };

  const supabase = createAdminClient();

  const { error } = await supabase.from("takes").insert({
    expert_id: formData.expert_id,
    raw_text: formData.raw_text,
    date_made: formData.date_made,
    boldness_score: formData.boldness_score,
    sport: formData.sport || null,
    grading_criteria: formData.predicted_outcome,
    time_horizon_date: formData.time_horizon_date || null,
    source_url: formData.source_url || null,
    source_type: "other",
    outcome_status: "pending",
    rating_status: "rated",
  });

  if (error) return { success: false, error: error.message };

  await recalculateTakeScore(formData.expert_id);
  revalidatePath("/admin/takescore");
  revalidatePath(`/experts/${formData.expert_id}`);
  return { success: true };
}

export async function gradeAdminTake(
  takeId: string,
  accuracyScore: number,
  outcomeStatus: string,
  outcomeNotes?: string,
): Promise<{ success: boolean; error?: string }> {
  const isAdmin = await checkIsAdmin();
  if (!isAdmin) return { success: false, error: "Unauthorized" };

  const supabase = createAdminClient();
  const { data: take } = await supabase.from("takes").select("expert_id").eq("take_id", takeId).single();
  if (!take) return { success: false, error: "Take not found" };

  await supabase.from("takes").update({
    accuracy_score: accuracyScore,
    grade: accuracyScore,
    outcome_status: outcomeStatus,
    outcome_notes: outcomeNotes || null,
    outcome_date: new Date().toISOString().split("T")[0],
  }).eq("take_id", takeId);

  await recalculateTakeScore(take.expert_id);
  revalidatePath("/admin/takescore");
  revalidatePath(`/experts/${take.expert_id}`);
  return { success: true };
}

export async function getPendingAdminTakes(): Promise<Array<{
  take_id: string;
  expert_id: string;
  expert_name: string;
  raw_text: string;
  grading_criteria: string | null;
  date_made: string;
  time_horizon_date: string | null;
  boldness_score: number | null;
  sport: string | null;
  outcome_status: string;
}>> {
  const supabase = createAdminClient();
  const today = new Date().toISOString().split("T")[0];
  const { data } = await supabase
    .from("takes")
    .select("take_id, expert_id, raw_text, grading_criteria, date_made, time_horizon_date, boldness_score, sport, outcome_status, experts(name)")
    .eq("outcome_status", "pending")
    .not("time_horizon_date", "is", null)
    .lte("time_horizon_date", today)
    .order("time_horizon_date", { ascending: true });

  return (data ?? []).map(t => ({
    take_id: t.take_id,
    expert_id: t.expert_id,
    raw_text: t.raw_text,
    grading_criteria: t.grading_criteria,
    date_made: t.date_made,
    time_horizon_date: t.time_horizon_date,
    boldness_score: t.boldness_score,
    sport: t.sport,
    outcome_status: t.outcome_status,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expert_name: (t.experts as any)?.name ?? "Unknown",
  }));
}

// ─── Analyst dashboard ────────────────────────────────────────────────────────

export interface AnalystDashboardRow {
  expert_id: string;
  name: string;
  avatar_url: string | null;
  takeScore: number;
  totalTakes: number;
  gradedTakes: number;
  avgBoldness: number;
  avgAccuracy: number;
  volumeMult: number;
  decayMult: number;
  lastTakeDate: string | null;
  accolades: string[];
}

export async function getAnalystDashboard(): Promise<AnalystDashboardRow[]> {
  const supabase = createAdminClient();
  const { data: experts } = await supabase
    .from("experts")
    .select("expert_id, name, avatar_url, overall_rating, total_takes, graded_takes, boldness_avg, accuracy_rate, volume_mult, decay_mult, last_take_date")
    .order("overall_rating", { ascending: false });

  const { data: accolades } = await supabase
    .from("expert_accolades")
    .select("expert_id, key");

  const accoladeMap: Record<string, string[]> = {};
  for (const a of accolades ?? []) {
    if (!accoladeMap[a.expert_id]) accoladeMap[a.expert_id] = [];
    accoladeMap[a.expert_id].push(a.key);
  }

  return (experts ?? []).map(e => ({
    expert_id: e.expert_id,
    name: e.name,
    avatar_url: e.avatar_url,
    takeScore: e.overall_rating ?? 0,
    totalTakes: e.total_takes ?? 0,
    gradedTakes: e.graded_takes ?? 0,
    avgBoldness: e.boldness_avg ?? 0,
    avgAccuracy: e.accuracy_rate ?? 0,
    volumeMult: e.volume_mult ?? 0.6,
    decayMult: e.decay_mult ?? 1.0,
    lastTakeDate: e.last_take_date ?? null,
    accolades: accoladeMap[e.expert_id] ?? [],
  }));
}

export async function getAnalystTakeDetail(expertId: string) {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("takes")
    .select("take_id, raw_text, summary, date_made, boldness_score, accuracy_score, boldness_credit, recency_weight, impact_score, outcome_status, outcome_notes, sport")
    .eq("expert_id", expertId)
    .order("date_made", { ascending: false });
  return data ?? [];
}

// ─── Accolades ────────────────────────────────────────────────────────────────

export async function syncAllAccolades(): Promise<void> {
  const supabase = createAdminClient();
  const { data: experts } = await supabase
    .from("experts")
    .select("expert_id, overall_rating, graded_takes, accuracy_rate, boldness_avg, last_take_date");

  const { data: allTakes } = await supabase
    .from("takes")
    .select("take_id, expert_id, date_made, accuracy_score, boldness_score, outcome_status, impact_score");

  const { data: manualAccolades } = await supabase
    .from("expert_accolades")
    .select("expert_id, key")
    .eq("is_manual", true);

  const manualKeys = new Set((manualAccolades ?? []).map(a => `${a.expert_id}:${a.key}`));

  const snaps: ExpertSnapshot[] = (experts ?? []).map(e => {
    const takes = (allTakes ?? []).filter(t => t.expert_id === e.expert_id);
    const lastTake = takes.sort((a, b) => new Date(b.date_made).getTime() - new Date(a.date_made).getTime())[0];
    const daysSinceLast = lastTake
      ? (Date.now() - new Date(lastTake.date_made).getTime()) / 86_400_000
      : 999;
    return {
      expert_id: e.expert_id,
      takeScore: e.overall_rating ?? 0,
      gradedTakes: e.graded_takes ?? 0,
      avgAccuracy: e.accuracy_rate ?? 0,
      avgBoldness: e.boldness_avg ?? 0,
      daysSinceLast,
      takes,
    };
  });

  for (const snap of snaps) {
    const autoKeys = computeAutoAccolades(snap, snaps);

    // Remove old auto accolades not in new set
    await supabase
      .from("expert_accolades")
      .delete()
      .eq("expert_id", snap.expert_id)
      .eq("is_manual", false)
      .not("key", "in", `(${autoKeys.map(k => `"${k}"`).join(",")})`);

    // Insert new ones (ignore conflicts — preserves earned_at)
    for (const key of autoKeys) {
      if (!manualKeys.has(`${snap.expert_id}:${key}`)) {
        const def = (await import("@/lib/takescore")).ACCOLADE_DEFS.find(d => d.key === key);
        if (!def) continue;
        await supabase.from("expert_accolades").upsert({
          expert_id: snap.expert_id,
          key,
          label: def.label,
          emoji: def.emoji,
          is_manual: false,
        }, { onConflict: "expert_id,key", ignoreDuplicates: true });
      }
    }
  }
}

export async function getAccoladesAdmin(): Promise<Array<{
  expert_id: string;
  expert_name: string;
  avatar_url: string | null;
  accolades: Array<{ key: string; emoji: string; label: string; is_manual: boolean; earned_at: string }>;
}>> {
  const supabase = createAdminClient();
  const { data: experts } = await supabase.from("experts").select("expert_id, name, avatar_url").order("name");
  const { data: accolades } = await supabase.from("expert_accolades").select("*").order("earned_at");

  return (experts ?? []).map(e => ({
    expert_id: e.expert_id,
    expert_name: e.name,
    avatar_url: e.avatar_url,
    accolades: (accolades ?? []).filter(a => a.expert_id === e.expert_id).map(a => ({
      key: a.key,
      emoji: a.emoji,
      label: a.label,
      is_manual: a.is_manual,
      earned_at: a.earned_at,
    })),
  }));
}

export async function setFlipFlopper(expertId: string, assign: boolean): Promise<void> {
  const isAdmin = await checkIsAdmin();
  if (!isAdmin) throw new Error("Unauthorized");

  const supabase = createAdminClient();
  if (assign) {
    await supabase.from("expert_accolades").upsert({
      expert_id: expertId,
      key: "flip_flopper",
      label: "Flip Flopper",
      emoji: "🔄",
      is_manual: true,
    }, { onConflict: "expert_id,key" });
  } else {
    await supabase.from("expert_accolades")
      .delete()
      .eq("expert_id", expertId)
      .eq("key", "flip_flopper");
  }
  revalidatePath("/admin/takescore");
}
