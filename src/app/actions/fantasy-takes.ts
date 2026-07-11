"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { checkIsAdmin } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { getFantasyConfig, recalculateFantasyScore } from "@/app/actions/fantasy-takescore";
import type { FantasyScoredTake } from "@/lib/fantasy-takescore";
import { gradeFantasyTake as aiGradeFantasyTake } from "@/lib/ai/grade-fantasy-take";
import { rateFantasyTake as aiRateFantasyTake } from "@/lib/ai/rate-fantasy-take";

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
    grading_criteria?: string | null;
    source_url?: string | null;
    content_type?: string | null;
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

export async function gradeFantasyTakeSingle(
  fantasyTakeId: string,
): Promise<{ success: boolean; accuracy_score?: number; grader_note?: string; error?: string }> {
  const isAdmin = await checkIsAdmin();
  if (!isAdmin) return { success: false, error: "Unauthorized" };

  const supabase = createAdminClient();

  const { data: take } = await supabase
    .from("fantasy_takes")
    .select("*, experts(name)")
    .eq("fantasy_take_id", fantasyTakeId)
    .single();

  if (!take) return { success: false, error: "Take not found" };

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const expertName = (take.experts as any)?.name ?? "Unknown";

    const result = await aiGradeFantasyTake({
      expertName,
      rawText: take.raw_text,
      category: take.category,
      playerName: take.player_name,
      playerPosition: take.player_position,
      playerAdp: take.player_adp,
      timingWindow: take.timing_window,
      boldnessScore: take.boldness_score,
      dateMade: take.date_made,
      resolutionDate: take.resolution_date,
      sportSeason: take.sport_season,
    });

    await supabase
      .from("fantasy_takes")
      .update({
        accuracy_score: result.accuracy_score,
        grader_note: result.grader_note,
        outcome_status: "resolved",
        ...(result.resolution_date ? { resolution_date: result.resolution_date } : {}),
      })
      .eq("fantasy_take_id", fantasyTakeId);

    await recalculateFantasyScore(take.expert_id);

    revalidatePath("/admin/takes");
    revalidatePath(`/experts/${take.expert_id}`);
    revalidatePath("/experts");
    revalidatePath("/fantasy");

    return { success: true, accuracy_score: result.accuracy_score, grader_note: result.grader_note };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "AI grading failed",
    };
  }
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

/**
 * Deterministically compute the correct NFL sport_season and resolution_date
 * from the date a take was made — no AI needed.
 *
 * Rules:
 *  Jan 1 – Feb 14  → still in the PREVIOUS year's playoffs/SB  → "{year-1} NFL", resolves {year}-01-13
 *  Feb 15 – Aug 31 → prediction for the UPCOMING season         → "{year} NFL",   resolves {year+1}-01-06
 *  Sep 1  – Dec 31 → prediction for the CURRENT year's season   → "{year} NFL",   resolves {year+1}-01-06
 */
function computeNflSeason(dateMade: string): { sportSeason: string; resolutionDate: string } {
  const d = new Date(dateMade + "T00:00:00");
  const year  = d.getFullYear();
  const month = d.getMonth() + 1; // 1-based
  const day   = d.getDate();

  let seasonYear: number;
  if (month === 1 || (month === 2 && day < 15)) {
    // Jan 1 – Feb 14: previous season's playoffs are still live
    seasonYear = year - 1;
  } else {
    // Feb 15 onwards: talking about the current calendar year's upcoming season
    seasonYear = year;
  }

  return {
    sportSeason:     `${seasonYear} NFL`,
    resolutionDate:  `${seasonYear + 1}-01-06`,
  };
}

/**
 * Determine the correct fantasy football season label from the date a take was made.
 *
 * Fantasy seasons track the NFL calendar year (e.g. "2026 Fantasy Football"
 * runs Aug 2026 – Jan 2027). The championship ends ~Jan 1, so:
 *   Jan 2 – Dec 31 of year Y  → "Y Fantasy Football"  (upcoming or current season)
 *   Jan 1 of year Y           → "(Y-1) Fantasy Football" (championship still live)
 */
function computeFantasySeason(dateMade: string): string {
  const d = new Date(dateMade + "T00:00:00");
  const year  = d.getFullYear();
  const month = d.getMonth() + 1;
  const day   = d.getDate();

  // Jan 1 only: previous season's championship is still live
  const seasonYear = (month === 1 && day === 1) ? year - 1 : year;
  return `${seasonYear} Fantasy Football`;
}

/**
 * Look up the correct fantasy football resolution date from sports_calendar
 * based on the take category:
 *  - start_sit / waiver_add  → 7 days after take (next week's results)
 *  - draft_strategy          → Fantasy Regular Season End (~Wk 14, ~Dec 14)
 *  - breakout_call / bust_call / sleeper_pick → Fantasy Championship End (~Wk 17, ~Jan 1)
 */
async function computeFantasyResolutionDate(
  category: string,
  dateMade: string,
): Promise<string> {
  // Short-window categories: resolve one week after the take
  if (category === "start_sit" || category === "waiver_add") {
    const d = new Date(dateMade + "T00:00:00");
    d.setDate(d.getDate() + 7);
    return d.toISOString().split("T")[0];
  }

  // draft_strategy resolves at Regular Season End; everything else at Championship End
  const eventFragment = category === "draft_strategy"
    ? "Regular Season End"
    : "Championship End";

  try {
    const supabase = createAdminClient();
    const { data } = await supabase
      .from("sports_calendar")
      .select("event_date")
      .eq("league", "Fantasy Football")
      .ilike("event_name", `%${eventFragment}%`)
      .gte("event_date", dateMade)
      .order("event_date")
      .limit(1)
      .single();

    if (data?.event_date) return data.event_date as string;
  } catch {
    // fall through to fallback
  }

  // Fallback: use the old NFL playoff start date
  const { resolutionDate } = computeNflSeason(dateMade);
  return resolutionDate;
}

export async function rateSingleFantasyTake(
  fantasyTakeId: string,
): Promise<{ success: boolean; boldness_score?: number; grading_criteria?: string; error?: string }> {
  const isAdmin = await checkIsAdmin();
  if (!isAdmin) return { success: false, error: "Unauthorized" };

  const supabase = createAdminClient();

  const { data: take } = await supabase
    .from("fantasy_takes")
    .select("*, experts(name)")
    .eq("fantasy_take_id", fantasyTakeId)
    .single();

  if (!take) return { success: false, error: "Take not found" };

  try {
    // Compute correct season label and resolution date.
    // Season: "2026 Fantasy Football" based on when the take was made.
    // Date: category-aware lookup against sports_calendar milestones.
    const correctSeason = computeFantasySeason(take.date_made);
    const correctDate   = await computeFantasyResolutionDate(take.category, take.date_made);

    const result = await aiRateFantasyTake({
      rawText:        take.raw_text,
      playerName:     take.player_name,
      playerPosition: take.player_position,
      playerAdp:      take.player_adp,
      category:       take.category,
      timingWindow:   take.timing_window,
      sportSeason:    correctSeason, // e.g. "2026 Fantasy Football" — corrected by code, not AI
      dateMade:       take.date_made,
    });

    const update: Record<string, unknown> = {
      boldness_score:   result.boldness_score,
      grading_criteria: result.grading_criteria || null,
      // Always set season and date from code, not AI
      sport_season:    correctSeason,
      resolution_date: correctDate,
    };
    // Only set ADP from AI if not already provided
    if (result.player_adp != null && take.player_adp == null) {
      update.player_adp = result.player_adp;
    }

    await supabase.from("fantasy_takes").update(update).eq("fantasy_take_id", fantasyTakeId);
    await recalculateFantasyScore(take.expert_id);

    revalidatePath("/admin/takes");
    revalidatePath(`/experts/${take.expert_id}`);
    revalidatePath("/fantasy");

    return { success: true, boldness_score: result.boldness_score, grading_criteria: result.grading_criteria };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "AI rating failed" };
  }
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
