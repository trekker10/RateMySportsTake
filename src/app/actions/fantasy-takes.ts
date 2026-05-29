"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { checkIsAdmin } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { getFantasyConfig, recalculateFantasyScore } from "@/app/actions/fantasy-takescore";
import type { FantasyScoredTake } from "@/lib/fantasy-takescore";

// ─── Read ─────────────────────────────────────────────────────────────────────

export async function getFantasyTakesForExpert(expertId: string): Promise<FantasyScoredTake[]> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("fantasy_takes")
    .select("*")
    .eq("expert_id", expertId)
    .order("date_made", { ascending: false });
  return (data ?? []) as FantasyScoredTake[];
}

export async function getPendingFantasyTakes(): Promise<
  Array<
    FantasyScoredTake & {
      expert_name: string;
      avatar_url: string | null;
    }
  >
> {
  const supabase = createAdminClient();
  const today = new Date().toISOString().split("T")[0];

  const { data } = await supabase
    .from("fantasy_takes")
    .select("*, experts(name, avatar_url)")
    .eq("outcome_status", "pending")
    .not("resolution_date", "is", null)
    .lte("resolution_date", today)
    .order("resolution_date", { ascending: true });

  return (data ?? []).map(t => ({
    ...(t as FantasyScoredTake),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expert_name: (t.experts as any)?.name ?? "Unknown",
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    avatar_url: (t.experts as any)?.avatar_url ?? null,
  }));
}

export async function getAllFantasyTakesAdmin(): Promise<
  Array<FantasyScoredTake & { expert_name: string; avatar_url: string | null }>
> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("fantasy_takes")
    .select("*, experts(name, avatar_url)")
    .order("date_made", { ascending: false });

  return (data ?? []).map(t => ({
    ...(t as FantasyScoredTake),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expert_name: (t.experts as any)?.name ?? "Unknown",
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    avatar_url: (t.experts as any)?.avatar_url ?? null,
  }));
}

// ─── Write ────────────────────────────────────────────────────────────────────

export async function addFantasyTake(data: {
  expert_id: string;
  category: string;
  raw_text: string;
  player_name?: string;
  player_position?: string;
  player_adp?: number | null;
  timing_window?: string;
  boldness_score?: number;
  date_made: string;
  resolution_date?: string;
  sport_season?: string;
}): Promise<{ success: boolean; error?: string }> {
  const isAdmin = await checkIsAdmin();
  if (!isAdmin) return { success: false, error: "Unauthorized" };

  const supabase = createAdminClient();
  const cfg = await getFantasyConfig();

  // Compute timing_modifier from timing_window
  let timingModifier = 0;
  if (data.timing_window) {
    switch (data.timing_window) {
      case "preseason":    timingModifier = cfg.timing_preseason_mod; break;
      case "post_draft":   timingModifier = cfg.timing_post_draft_mod; break;
      case "early_season": timingModifier = cfg.timing_early_season_mod; break;
      case "midseason":    timingModifier = cfg.timing_midseason_mod; break;
      case "late_season":  timingModifier = cfg.timing_late_season_mod; break;
      case "playoffs":     timingModifier = cfg.timing_playoffs_mod; break;
    }
  }

  const { error } = await supabase.from("fantasy_takes").insert({
    expert_id: data.expert_id,
    category: data.category,
    raw_text: data.raw_text,
    player_name: data.player_name ?? null,
    player_position: data.player_position ?? null,
    player_adp: data.player_adp ?? null,
    timing_window: data.timing_window ?? null,
    timing_modifier: timingModifier,
    boldness_score: data.boldness_score ?? null,
    date_made: data.date_made,
    resolution_date: data.resolution_date ?? null,
    sport_season: data.sport_season ?? null,
    outcome_status: "pending",
  });

  if (error) return { success: false, error: error.message };

  await recalculateFantasyScore(data.expert_id);

  revalidatePath("/admin/fantasy-take-score");
  revalidatePath(`/experts/${data.expert_id}`);
  revalidatePath("/experts");
  revalidatePath("/fantasy");

  return { success: true };
}

export async function saveFantasyTakeEdits(
  fantasyTakeId: string,
  edits: {
    raw_text?: string;
    player_name?: string | null;
    player_position?: string | null;
    player_adp?: number | null;
    category?: string;
    timing_window?: string | null;
    boldness_score?: number | null;
    date_made?: string;
    resolution_date?: string | null;
    sport_season?: string | null;
    outcome_status?: string;
    accuracy_score?: number | null;
    grader_note?: string | null;
  },
): Promise<{ success: boolean; error?: string }> {
  const isAdmin = await checkIsAdmin();
  if (!isAdmin) return { success: false, error: "Unauthorized" };

  const supabase = createAdminClient();

  // Recompute timing_modifier if timing_window changed
  let timingModifier: number | undefined;
  if (edits.timing_window !== undefined) {
    const cfg = await getFantasyConfig();
    const mods: Record<string, number> = {
      preseason:    cfg.timing_preseason_mod,
      post_draft:   cfg.timing_post_draft_mod,
      early_season: cfg.timing_early_season_mod,
      midseason:    cfg.timing_midseason_mod,
      late_season:  cfg.timing_late_season_mod,
      playoffs:     cfg.timing_playoffs_mod,
    };
    timingModifier = edits.timing_window ? (mods[edits.timing_window] ?? 0) : 0;
  }

  const payload: Record<string, unknown> = { ...edits };
  if (timingModifier !== undefined) payload.timing_modifier = timingModifier;

  const { error } = await supabase
    .from("fantasy_takes")
    .update(payload)
    .eq("fantasy_take_id", fantasyTakeId);

  if (error) return { success: false, error: error.message };

  // Recalculate score for the expert
  const { data: take } = await supabase
    .from("fantasy_takes")
    .select("expert_id")
    .eq("fantasy_take_id", fantasyTakeId)
    .single();

  if (take) {
    await recalculateFantasyScore(take.expert_id);
    revalidatePath(`/experts/${take.expert_id}`);
  }

  revalidatePath("/admin/fantasy-take-score");
  revalidatePath("/experts");
  revalidatePath("/fantasy");

  return { success: true };
}

export async function gradeFantasyTake(
  fantasyTakeId: string,
  accuracyScore: number,
  graderNote: string,
): Promise<{ success: boolean; error?: string }> {
  const isAdmin = await checkIsAdmin();
  if (!isAdmin) return { success: false, error: "Unauthorized" };

  const supabase = createAdminClient();

  const { data: take } = await supabase
    .from("fantasy_takes")
    .select("expert_id")
    .eq("fantasy_take_id", fantasyTakeId)
    .single();

  if (!take) return { success: false, error: "Take not found" };

  await supabase
    .from("fantasy_takes")
    .update({
      accuracy_score: accuracyScore,
      grader_note: graderNote || null,
      outcome_status: "resolved",
    })
    .eq("fantasy_take_id", fantasyTakeId);

  await recalculateFantasyScore(take.expert_id);

  revalidatePath("/admin/fantasy-take-score");
  revalidatePath(`/experts/${take.expert_id}`);
  revalidatePath("/experts");
  revalidatePath("/fantasy");

  return { success: true };
}

export async function deleteFantasyTake(
  fantasyTakeId: string,
): Promise<{ success: boolean; error?: string }> {
  const isAdmin = await checkIsAdmin();
  if (!isAdmin) return { success: false, error: "Unauthorized" };

  const supabase = createAdminClient();

  const { data: take } = await supabase
    .from("fantasy_takes")
    .select("expert_id")
    .eq("fantasy_take_id", fantasyTakeId)
    .single();

  if (!take) return { success: false, error: "Take not found" };

  await supabase.from("fantasy_takes").delete().eq("fantasy_take_id", fantasyTakeId);

  await recalculateFantasyScore(take.expert_id);

  revalidatePath("/admin/fantasy-take-score");
  revalidatePath(`/experts/${take.expert_id}`);
  revalidatePath("/experts");
  revalidatePath("/fantasy");

  return { success: true };
}
