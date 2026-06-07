"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { rateTake } from "@/lib/ai/rate-take";
import { redirect } from "next/navigation";
import type { SourceType } from "@/types/database";

export interface ProfileTake {
  take_id: string;
  date_made: string;
  raw_text: string;
  summary: string | null;
  outcome_status: string;
  outcome_notes: string | null;
  grade_notes: string | null;
  grade: number | null;
}

export async function getExpertTakesPage(
  expertId: string,
  verdict: string,
  gradeMin: number | null,
  gradeMax: number | null,
  offset: number,
  limit: number
): Promise<ProfileTake[]> {
  const supabase = createAdminClient();

  let q = supabase
    .from("takes")
    .select("take_id, date_made, raw_text, summary, outcome_status, outcome_notes, grade_notes, grade")
    .eq("expert_id", expertId)
    .order("date_made", { ascending: false })
    .range(offset, offset + limit - 1);

  if (verdict === "right")   q = q.eq("outcome_status", "confirmed_true");
  if (verdict === "wrong")   q = q.in("outcome_status", ["confirmed_false", "partially_true"]);
  if (verdict === "pending") q = q.eq("outcome_status", "pending");
  if (gradeMin != null)      q = q.gte("grade", gradeMin);
  if (gradeMax != null)      q = q.lt("grade", gradeMax);

  const { data } = await q;
  return (data ?? []) as ProfileTake[];
}

export async function deleteTake(takeId: string): Promise<{ success: true } | { success: false; error: string }> {
  const supabase = createAdminClient();
  const { error } = await supabase.from("takes").delete().eq("take_id", takeId);
  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function rateSingleTake(takeId: string): Promise<{ success: true } | { success: false; error: string }> {
  const supabase = createAdminClient();
  const { data: take } = await supabase
    .from("takes")
    .select("raw_text, summary, sport, source_type, date_made")
    .eq("take_id", takeId)
    .single();

  if (!take) return { success: false, error: "Take not found" };

  // Use verbatim text if available, fall back to summary
  const textToRate = take.raw_text?.trim() || take.summary?.trim();
  if (!textToRate) return { success: false, error: "No text to rate — add raw_text or summary first" };

  try {
    const rating = await rateTake(textToRate, take.sport ?? "", take.source_type, take.date_made);
    await supabase.from("takes").update({ ...rating, rating_status: "rated" }).eq("take_id", takeId);
    return { success: true };
  } catch (err) {
    await supabase.from("takes").update({ rating_status: "failed" }).eq("take_id", takeId);
    return { success: false, error: err instanceof Error ? err.message : "Rating failed" };
  }
}

export async function updateGradingCriteria(takeId: string, criteria: string): Promise<void> {
  const supabase = createAdminClient();
  await supabase.from("takes").update({ grading_criteria: criteria.trim() }).eq("take_id", takeId);
}

export async function saveTakeEdits(takeId: string, edits: {
  summary?: string;
  grading_criteria?: string;
  boldness_score?: number | null;
  time_horizon_date?: string | null;
  grade?: number | null;
  outcome_status?: string;
  outcome_notes?: string | null;
  player_tags?: string[] | null;
}): Promise<{ success: true } | { success: false; error: string }> {
  const supabase = createAdminClient();
  const { error } = await supabase.from("takes").update(edits).eq("take_id", takeId);
  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function submitTake(formData: FormData) {
  const supabase = createAdminClient();

  const expertName = (formData.get("expert_name") as string).trim();
  const expertOutlet = (formData.get("expert_outlet") as string)?.trim() || null;
  const expertTwitter = (formData.get("expert_twitter") as string)?.trim() || null;
  const rawText = (formData.get("raw_text") as string).trim();
  const sourceType = formData.get("source_type") as SourceType;
  const sourceUrl = (formData.get("source_url") as string)?.trim() || null;
  const sport = (formData.get("sport") as string).trim();
  const dateMade = formData.get("date_made") as string;

  // Find existing expert or create a new one
  const { data: existingExpert } = await supabase
    .from("experts")
    .select("expert_id")
    .ilike("name", expertName)
    .maybeSingle();

  let expertId: string;

  if (existingExpert) {
    expertId = existingExpert.expert_id;
  } else {
    const { data: newExpert, error } = await supabase
      .from("experts")
      .insert({
        name: expertName,
        outlet: expertOutlet,
        twitter_handle: expertTwitter,
        sport_focus: sport ? [sport] : [],
      })
      .select("expert_id")
      .single();

    if (error || !newExpert) {
      throw new Error(`Failed to create expert: ${error?.message}`);
    }
    expertId = newExpert.expert_id;
  }

  // Insert the take
  const { data: take, error: takeError } = await supabase
    .from("takes")
    .insert({
      expert_id: expertId,
      raw_text: rawText,
      source_type: sourceType,
      source_url: sourceUrl,
      sport,
      date_made: dateMade,
    })
    .select("take_id")
    .single();

  if (takeError || !take) {
    throw new Error(`Failed to insert take: ${takeError?.message}`);
  }

  // Rate with Claude — update take regardless of success/failure
  try {
    const rating = await rateTake(rawText, sport, sourceType, dateMade);
    await supabase
      .from("takes")
      .update({ ...rating, rating_status: "rated" })
      .eq("take_id", take.take_id);
  } catch (err) {
    console.error("AI rating failed:", err);
    await supabase
      .from("takes")
      .update({ rating_status: "failed" })
      .eq("take_id", take.take_id);
  }

  redirect(`/takes/${take.take_id}`);
}

// ── Submit a fantasy take from the public submit form ─────────────────────────
export async function submitFantasyTake(formData: FormData) {
  const supabase = createAdminClient();

  const expertName   = (formData.get("expert_name") as string).trim();
  const expertOutlet = (formData.get("expert_outlet") as string)?.trim() || null;
  const expertTwitter = (formData.get("expert_twitter") as string)?.trim() || null;
  const rawText      = (formData.get("raw_text") as string).trim();
  const dateMade     = formData.get("date_made") as string;
  const category     = (formData.get("fantasy_category") as string)?.trim() || "breakout_call";
  const playerName   = (formData.get("player_name") as string)?.trim() || null;
  const playerPosition = (formData.get("player_position") as string)?.trim() || null;
  const playerAdpRaw = formData.get("player_adp") as string;
  const playerAdp    = playerAdpRaw ? parseFloat(playerAdpRaw) : null;
  const timingWindow = (formData.get("timing_window") as string)?.trim() || null;
  const boldnessRaw  = formData.get("boldness_score") as string;
  const boldnessScore = boldnessRaw ? parseInt(boldnessRaw, 10) : null;
  const resolutionDate = (formData.get("resolution_date") as string)?.trim() || null;
  const sportSeason  = (formData.get("sport_season") as string)?.trim() || null;
  const format          = (formData.get("fantasy_format") as string)?.trim() || "both";
  const gradingCriteria = (formData.get("grading_criteria") as string)?.trim() || null;

  // Find or create expert
  const { data: existingExpert } = await supabase
    .from("experts")
    .select("expert_id")
    .ilike("name", expertName)
    .maybeSingle();

  let expertId: string;
  if (existingExpert) {
    expertId = existingExpert.expert_id;
  } else {
    const { data: newExpert, error } = await supabase
      .from("experts")
      .insert({
        name: expertName,
        outlet: expertOutlet,
        twitter_handle: expertTwitter,
        is_fantasy_guru: true,
      })
      .select("expert_id")
      .single();
    if (error || !newExpert) throw new Error(`Failed to create expert: ${error?.message}`);
    expertId = newExpert.expert_id;
  }

  // Compute timing modifier
  const { getFantasyConfig } = await import("@/app/actions/fantasy-takescore");
  const cfg = await getFantasyConfig();
  let timingModifier = 0;
  if (timingWindow) {
    const mods: Record<string, number> = {
      preseason:    cfg.timing_preseason_mod,
      post_draft:   cfg.timing_post_draft_mod,
      early_season: cfg.timing_early_season_mod,
      midseason:    cfg.timing_midseason_mod,
      late_season:  cfg.timing_late_season_mod,
      playoffs:     cfg.timing_playoffs_mod,
    };
    timingModifier = mods[timingWindow] ?? 0;
  }

  const { data: insertedTake, error: takeError } = await supabase.from("fantasy_takes").insert({
    expert_id:       expertId,
    category,
    raw_text:        rawText,
    player_name:     playerName,
    player_position: playerPosition,
    player_adp:      playerAdp,
    timing_window:   timingWindow,
    timing_modifier: timingModifier,
    boldness_score:  boldnessScore,
    date_made:       dateMade,
    resolution_date: resolutionDate,
    sport_season:      sportSeason,
    grading_criteria:  gradingCriteria,
    outcome_status:    "pending",
  }).select("fantasy_take_id").single();

  if (takeError) throw new Error(`Failed to insert fantasy take: ${takeError.message}`);

  // Try to set format — gracefully skip if column hasn't been migrated yet
  if (insertedTake?.fantasy_take_id && format) {
    await supabase.from("fantasy_takes")
      .update({ format })
      .eq("fantasy_take_id", insertedTake.fantasy_take_id)
      .then(() => {/* ignore error if column missing */});
  }

  const { recalculateFantasyScore } = await import("@/app/actions/fantasy-takescore");
  await recalculateFantasyScore(expertId);

  redirect(`/experts/${expertId}`);
}

// ── Import a fantasy take from the bulk import page (no redirect) ─────────────
export async function importFantasyTake(params: {
  expertName: string;
  rawText: string;
  dateMade: string;
  category: string;
  timingWindow: string;
  format: string;
}): Promise<{ success: boolean; error?: string }> {
  const supabase = createAdminClient();

  // Find or create expert
  const { data: existingExpert } = await supabase
    .from("experts")
    .select("expert_id")
    .ilike("name", params.expertName)
    .maybeSingle();

  let expertId: string;
  if (existingExpert) {
    expertId = existingExpert.expert_id;
  } else {
    const { data: newExpert, error } = await supabase
      .from("experts")
      .insert({ name: params.expertName, is_fantasy_guru: true })
      .select("expert_id")
      .single();
    if (error || !newExpert) return { success: false, error: error?.message };
    expertId = newExpert.expert_id;
  }

  // Compute timing modifier
  const { getFantasyConfig } = await import("@/app/actions/fantasy-takescore");
  const cfg = await getFantasyConfig();
  const mods: Record<string, number> = {
    preseason:    cfg.timing_preseason_mod,
    post_draft:   cfg.timing_post_draft_mod,
    early_season: cfg.timing_early_season_mod,
    midseason:    cfg.timing_midseason_mod,
    late_season:  cfg.timing_late_season_mod,
    playoffs:     cfg.timing_playoffs_mod,
  };
  const timingModifier = mods[params.timingWindow] ?? 0;

  const { data: insertedTake2, error: takeError } = await supabase.from("fantasy_takes").insert({
    expert_id:      expertId,
    category:       params.category,
    raw_text:       params.rawText,
    timing_window:  params.timingWindow || null,
    timing_modifier: timingModifier,
    date_made:      params.dateMade,
    outcome_status: "pending",
  }).select("fantasy_take_id").single();

  if (takeError) return { success: false, error: takeError.message };

  if (insertedTake2?.fantasy_take_id && params.format) {
    await supabase.from("fantasy_takes")
      .update({ format: params.format })
      .eq("fantasy_take_id", insertedTake2.fantasy_take_id)
      .then(() => {/* ignore if column missing */});
  }

  const { recalculateFantasyScore } = await import("@/app/actions/fantasy-takescore");
  await recalculateFantasyScore(expertId);

  return { success: true };
}

// Used by batch import — same logic but returns result instead of redirecting
export async function importTake(params: {
  expertName: string;
  rawText: string;
  sourceType: SourceType;
  sourceUrl: string | null;
  sport: string;
  dateMade: string;
}): Promise<{ success: true; takeId: string } | { success: false; error: string }> {
  const supabase = createAdminClient();
  const { expertName, rawText, sourceType, sourceUrl, sport, dateMade } = params;

  const { data: existingExpert } = await supabase
    .from("experts")
    .select("expert_id")
    .ilike("name", expertName)
    .maybeSingle();

  let expertId: string;

  if (existingExpert) {
    expertId = existingExpert.expert_id;
  } else {
    const { data: newExpert, error } = await supabase
      .from("experts")
      .insert({ name: expertName, sport_focus: sport ? [sport] : [] })
      .select("expert_id")
      .single();
    if (error || !newExpert) return { success: false, error: error?.message ?? "Failed to create expert" };
    expertId = newExpert.expert_id;
  }

  const { data: take, error: takeError } = await supabase
    .from("takes")
    .insert({ expert_id: expertId, raw_text: rawText, source_type: sourceType, source_url: sourceUrl, sport, date_made: dateMade })
    .select("take_id")
    .single();

  if (takeError || !take) return { success: false, error: takeError?.message ?? "Failed to insert take" };

  try {
    const rating = await rateTake(rawText, sport, sourceType, dateMade);
    await supabase.from("takes").update({ ...rating, rating_status: "rated" }).eq("take_id", take.take_id);
  } catch {
    await supabase.from("takes").update({ rating_status: "failed" }).eq("take_id", take.take_id);
  }

  return { success: true, takeId: take.take_id };
}

export async function importTakeForExpert(params: {
  expertId: string;
  rawText: string;
  sourceType: SourceType;
  sourceUrl: string | null;
  sport: string;
  dateMade: string;
}): Promise<{ success: true; takeId: string } | { success: false; error: string }> {
  const supabase = createAdminClient();
  const { expertId, rawText, sourceType, sourceUrl, sport, dateMade } = params;

  const { data: take, error: takeError } = await supabase
    .from("takes")
    .insert({ expert_id: expertId, raw_text: rawText, source_type: sourceType, source_url: sourceUrl, sport, date_made: dateMade })
    .select("take_id")
    .single();

  if (takeError || !take) return { success: false, error: takeError?.message ?? "Failed to insert take" };

  try {
    const rating = await rateTake(rawText, sport, sourceType, dateMade);
    await supabase.from("takes").update({ ...rating, rating_status: "rated" }).eq("take_id", take.take_id);
  } catch {
    await supabase.from("takes").update({ rating_status: "failed" }).eq("take_id", take.take_id);
  }

  return { success: true, takeId: take.take_id };
}
