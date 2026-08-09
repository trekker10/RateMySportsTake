"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { checkIsAdmin } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import {
  FANTASY_DEFAULT_CONFIG,
  computeFantasyTakeScore,
  computeFantasyAccolades,
  FANTASY_ACCOLADE_DEFS,
  getBoldnessCredit,
  getRecencyWeight,
  calculateImpact,
  type FantasyTakeScoreConfig,
  type FantasyScoredTake,
  type FantasyExpertRow,
} from "@/lib/fantasy-takescore";

// ─── Config ───────────────────────────────────────────────────────────────────

export async function getFantasyConfig(): Promise<FantasyTakeScoreConfig> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("fantasy_take_score_config")
    .select("*")
    .eq("id", "default")
    .single();
  // Strip null/undefined DB values before merging so defaults are never overridden by nulls
  const dbValues = Object.fromEntries(
    Object.entries(data ?? {}).filter(([, v]) => v != null),
  );
  return { ...FANTASY_DEFAULT_CONFIG, ...dbValues } as FantasyTakeScoreConfig;
}

export async function saveFantasyConfig(
  cfg: Partial<FantasyTakeScoreConfig>,
  adminEmail: string,
): Promise<void> {
  const isAdmin = await checkIsAdmin();
  if (!isAdmin) throw new Error("Unauthorized");

  const supabase = createAdminClient();
  const prev = await getFantasyConfig();
  const changes: Record<string, { from: unknown; to: unknown }> = {};
  for (const key of Object.keys(cfg) as (keyof FantasyTakeScoreConfig)[]) {
    if (cfg[key] !== undefined && cfg[key] !== prev[key]) {
      changes[key] = { from: prev[key], to: cfg[key] };
    }
  }

  await supabase
    .from("fantasy_take_score_config")
    .update({
      ...cfg,
      updated_at: new Date().toISOString(),
      updated_by: adminEmail,
    })
    .eq("id", "default");

  if (Object.keys(changes).length > 0) {
    await supabase.from("fantasy_config_change_log").insert({
      changed_by: adminEmail,
      changes,
    });
  }

  await recalculateAllFantasyScores();

  revalidatePath("/admin/fantasy-take-score");
  revalidatePath("/experts");
  revalidatePath("/fantasy");
}

// ─── Scoring engine ───────────────────────────────────────────────────────────

export async function recalculateFantasyScore(expertId: string): Promise<void> {
  const supabase = createAdminClient();
  const cfg = await getFantasyConfig();

  const { data: takes } = await supabase
    .from("fantasy_takes")
    .select(
      "fantasy_take_id, expert_id, category, raw_text, player_name, player_position, player_adp, timing_window, timing_modifier, boldness_score, accuracy_score, outcome_status, date_made, resolution_date, sport_season, impact_score, recency_weight, boldness_credit",
    )
    .eq("expert_id", expertId)
    .order("date_made", { ascending: false });

  if (!takes || takes.length === 0) return;

  const fantasyTakes = takes as FantasyScoredTake[];
  const result = computeFantasyTakeScore(fantasyTakes, cfg);

  // Update per-take impact/recency/boldness_credit for takes in the rolling window
  const sorted = [...fantasyTakes].sort(
    (a, b) => new Date(b.date_made).getTime() - new Date(a.date_made).getTime(),
  );
  const graded = sorted.filter(
    t => t.accuracy_score !== null && t.boldness_score !== null,
  );
  const window = graded.slice(0, cfg.rolling_window);

  for (let i = 0; i < window.length; i++) {
    const take = window[i];
    const A = take.accuracy_score!;
    const B = take.boldness_score!;
    const outcomeStatus =
      take.outcome_status === "resolved"
        ? (take.accuracy_score ?? 0) > 50
          ? "confirmed_true"
          : "confirmed_false"
        : take.outcome_status;
    const isCorrect = outcomeStatus === "confirmed_true";
    const BC = getBoldnessCredit(B, isCorrect, cfg);
    const R = getRecencyWeight(i + 1, take.date_made, cfg);
    const impact = calculateImpact(A, B, BC, R);

    await supabase
      .from("fantasy_takes")
      .update({
        boldness_credit: BC,
        recency_weight: R,
        impact_score: Math.round(impact * 100) / 100,
      })
      .eq("fantasy_take_id", take.fantasy_take_id);
  }

  // Compute aggregate stats for expert
  const resolvedTakes = fantasyTakes.filter(t => t.accuracy_score !== null);
  const avgAccuracy =
    resolvedTakes.length > 0
      ? resolvedTakes.reduce((s, t) => s + (t.accuracy_score ?? 0), 0) / resolvedTakes.length
      : 0;
  const avgBoldness =
    fantasyTakes.length > 0
      ? fantasyTakes.reduce((s, t) => s + (t.boldness_score ?? 0), 0) / fantasyTakes.length
      : 0;
  const lastTakeDate = sorted[0]?.date_made ?? null;

  const expertUpdate: Record<string, unknown> = {
    fantasy_boldness_avg: Math.round(avgBoldness * 10) / 10,
    fantasy_accuracy_rate: Math.round(avgAccuracy * 10) / 10,
    fantasy_last_take_date: lastTakeDate,
    fantasy_graded_takes: resolvedTakes.length,
  };

  if (result.gradedTakes > 0) {
    expertUpdate.fantasy_overall_rating = result.takeScore;
  }

  await supabase.from("experts").update(expertUpdate).eq("expert_id", expertId);
}

export async function recalculateAllFantasyScores(): Promise<void> {
  if (!(await checkIsAdmin())) return;
  const supabase = createAdminClient();
  const { data: experts } = await supabase.from("experts").select("expert_id");
  for (const e of experts ?? []) {
    await recalculateFantasyScore(e.expert_id);
  }
  await syncFantasyAccolades();
}

export async function syncFantasyAccolades(): Promise<void> {
  if (!(await checkIsAdmin())) return;
  const supabase = createAdminClient();

  const { data: experts } = await supabase
    .from("experts")
    .select(
      "expert_id, name, fantasy_overall_rating, fantasy_graded_takes, fantasy_boldness_avg, fantasy_accuracy_rate, fantasy_last_take_date",
    );

  const { data: allTakes } = await supabase
    .from("fantasy_takes")
    .select(
      "fantasy_take_id, expert_id, category, raw_text, player_name, player_position, player_adp, timing_window, timing_modifier, boldness_score, accuracy_score, outcome_status, date_made, resolution_date, sport_season, impact_score, recency_weight, boldness_credit",
    );

  const expertRows: FantasyExpertRow[] = (experts ?? []).map(e => ({
    expert_id: e.expert_id,
    name: e.name,
    fantasy_overall_rating: e.fantasy_overall_rating ?? 0,
    fantasy_graded_takes: e.fantasy_graded_takes ?? 0,
    fantasy_boldness_avg: e.fantasy_boldness_avg ?? 0,
    fantasy_accuracy_rate: e.fantasy_accuracy_rate ?? 0,
    fantasy_last_take_date: e.fantasy_last_take_date ?? null,
  }));

  const fantasyTakes = (allTakes ?? []) as FantasyScoredTake[];

  for (const expert of expertRows) {
    const accoladeKeys = computeFantasyAccolades(expert.expert_id, fantasyTakes, expertRows);

    // Remove auto accolades no longer earned
    if (accoladeKeys.length > 0) {
      await supabase
        .from("expert_accolades")
        .delete()
        .eq("expert_id", expert.expert_id)
        .like("key", "fantasy_%")
        .not("key", "in", `(${accoladeKeys.map(k => `"fantasy_${k}"`).join(",")})`);
    } else {
      await supabase
        .from("expert_accolades")
        .delete()
        .eq("expert_id", expert.expert_id)
        .like("key", "fantasy_%");
    }

    // Upsert earned accolades
    for (const key of accoladeKeys) {
      const def = FANTASY_ACCOLADE_DEFS.find(d => d.key === key);
      if (!def) continue;
      await supabase.from("expert_accolades").upsert(
        {
          expert_id: expert.expert_id,
          key: `fantasy_${key}`,
          label: def.label,
          emoji: def.emoji,
          is_manual: false,
        },
        { onConflict: "expert_id,key", ignoreDuplicates: true },
      );
    }
  }
}

// ─── Config history ───────────────────────────────────────────────────────────

export async function getFantasyConfigHistory(): Promise<
  Array<{
    id: string;
    changed_at: string;
    changed_by: string;
    changes: Record<string, { from: unknown; to: unknown }>;
  }>
> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("fantasy_config_change_log")
    .select("*")
    .order("changed_at", { ascending: false })
    .limit(20);
  return data ?? [];
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

export interface FantasyDashboardRow {
  expert_id: string;
  name: string;
  avatar_url: string | null;
  fantasy_overall_rating: number;
  fantasy_graded_takes: number;
  fantasy_boldness_avg: number;
  fantasy_accuracy_rate: number;
  fantasy_last_take_date: string | null;
  total_takes: number;
  volume_mult: number;
  decay_mult: number;
  accolades: string[];
  is_fantasy_guru: boolean;
}

export async function getFantasyDashboard(): Promise<FantasyDashboardRow[]> {
  const supabase = createAdminClient();

  const { data: experts } = await supabase
    .from("experts")
    .select(
      "expert_id, name, avatar_url, fantasy_overall_rating, fantasy_graded_takes, fantasy_boldness_avg, fantasy_accuracy_rate, fantasy_last_take_date, is_fantasy_guru",
    )
    .order("fantasy_overall_rating", { ascending: false });

  const { data: takeCounts } = await supabase
    .from("fantasy_takes")
    .select("expert_id");

  const { data: accolades } = await supabase
    .from("expert_accolades")
    .select("expert_id, key")
    .like("key", "fantasy_%");

  const countMap: Record<string, number> = {};
  for (const t of takeCounts ?? []) {
    countMap[t.expert_id] = (countMap[t.expert_id] ?? 0) + 1;
  }

  const accoladeMap: Record<string, string[]> = {};
  for (const a of accolades ?? []) {
    if (!accoladeMap[a.expert_id]) accoladeMap[a.expert_id] = [];
    accoladeMap[a.expert_id].push(a.key.replace("fantasy_", ""));
  }

  return (experts ?? []).map(e => ({
    expert_id: e.expert_id,
    name: e.name,
    avatar_url: e.avatar_url,
    fantasy_overall_rating: e.fantasy_overall_rating ?? 0,
    fantasy_graded_takes: e.fantasy_graded_takes ?? 0,
    fantasy_boldness_avg: e.fantasy_boldness_avg ?? 0,
    fantasy_accuracy_rate: e.fantasy_accuracy_rate ?? 0,
    fantasy_last_take_date: e.fantasy_last_take_date ?? null,
    total_takes: countMap[e.expert_id] ?? 0,
    volume_mult: 1.0,
    decay_mult: 1.0,
    accolades: accoladeMap[e.expert_id] ?? [],
    is_fantasy_guru: e.is_fantasy_guru ?? false,
  }));
}
