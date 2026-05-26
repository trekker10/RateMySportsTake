"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { rateTake } from "@/lib/ai/rate-take";
import { redirect } from "next/navigation";
import type { SourceType } from "@/types/database";

export async function rateSingleTake(takeId: string): Promise<{ success: true } | { success: false; error: string }> {
  const supabase = createAdminClient();
  const { data: take } = await supabase
    .from("takes")
    .select("raw_text, sport, source_type, date_made")
    .eq("take_id", takeId)
    .single();

  if (!take) return { success: false, error: "Take not found" };

  try {
    const rating = await rateTake(take.raw_text, take.sport ?? "", take.source_type, take.date_made);
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
