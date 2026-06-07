"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { gradeTake } from "@/lib/ai/grade-take";
import { getTakeScoreConfig } from "@/app/actions/takescore";
import { recalculateTakeScore } from "@/app/actions/takescore";

export interface PendingTake {
  take_id: string;
  raw_text: string;
  summary: string | null;
  grading_criteria: string | null;
  date_made: string;
  time_horizon_date: string | null;
  difficulty_score: number | null;
  confidence_claimed: number | null;
  expert_name: string;
}

export async function getPendingTakes(): Promise<PendingTake[]> {
  const supabase = createAdminClient();
  const today = new Date().toISOString().split("T")[0];

  const { data } = await supabase
    .from("takes")
    .select("take_id, raw_text, summary, grading_criteria, date_made, time_horizon_date, difficulty_score, confidence_claimed, experts(name)")
    .eq("outcome_status", "pending")
    .eq("rating_status", "rated")
    .not("time_horizon_date", "is", null)
    .lte("time_horizon_date", today)
    .order("time_horizon_date", { ascending: true });

  return (data ?? []).map((t) => ({
    take_id: t.take_id,
    raw_text: t.raw_text,
    summary: t.summary,
    grading_criteria: t.grading_criteria,
    date_made: t.date_made,
    time_horizon_date: t.time_horizon_date,
    difficulty_score: t.difficulty_score,
    confidence_claimed: t.confidence_claimed,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expert_name: (t.experts as any)?.name ?? "Unknown",
  }));
}

export async function gradeSingleTake(
  takeId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createAdminClient();

  const { data: take } = await supabase
    .from("takes")
    .select("*, experts(name)")
    .eq("take_id", takeId)
    .single();

  if (!take) return { success: false, error: "Take not found" };
  if (!take.summary || !take.grading_criteria) {
    return { success: false, error: "Take hasn't been AI rated yet" };
  }

  try {
    const result = await gradeTake({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expertName: (take.experts as any)?.name ?? "Unknown",
      rawText: take.raw_text,
      summary: take.summary,
      gradingCriteria: take.grading_criteria,
      dateMade: take.date_made,
      timeHorizonDate: take.time_horizon_date ?? new Date().toISOString().split("T")[0],
      difficultyScore: take.difficulty_score ?? 5,
      confidenceClaimed: take.confidence_claimed ?? 5,
    });

    // Derive accuracy_score from grade using scoring config tier values
    let accuracy_score: number | null = null;
    if (result.grade != null) {
      const cfg = await getTakeScoreConfig();
      const g = result.grade;
      if (g >= 80)      accuracy_score = cfg.accuracy_nailed;
      else if (g >= 60) accuracy_score = cfg.accuracy_mostly_right;
      else if (g >= 40) accuracy_score = cfg.accuracy_half_right;
      else if (g >= 20) accuracy_score = cfg.accuracy_mostly_wrong;
      else              accuracy_score = cfg.accuracy_wrong;
    }

    await supabase
      .from("takes")
      .update({
        outcome_status: result.outcome_status,
        outcome_date: result.outcome_date,
        outcome_notes: result.outcome_notes,
        grade: result.grade,
        grade_breakdown: result.grade_breakdown,
        grade_notes: result.grade_notes,
        aging_verdict: result.aging_verdict,
        ...(accuracy_score != null ? { accuracy_score } : {}),
      })
      .eq("take_id", takeId);

    // Recalculate expert's TakeScore so impact_score is also updated
    await recalculateTakeScore(take.expert_id);

    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Grading failed",
    };
  }
}

export interface AdminTake {
  take_id: string;
  raw_text: string;
  summary: string | null;
  grading_criteria: string | null;
  date_made: string;
  date_submitted: string | null;
  time_horizon_date: string | null;
  boldness_score: number | null;
  outcome_status: string;
  outcome_notes: string | null;
  grade: number | null;
  grade_notes: string | null;
  rating_status: string;
  expert_name: string;
  expert_id: string;
  source_url: string | null;
  source_type: string | null;
  player_tags: string[] | null;
}

export async function getTakesForExpert(expertId: string): Promise<AdminTake[]> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("takes")
    .select("take_id, raw_text, summary, grading_criteria, date_made, date_submitted, time_horizon_date, boldness_score, outcome_status, outcome_notes, grade, grade_notes, rating_status, expert_id, source_url, source_type, experts(name), player_tags")
    .eq("expert_id", expertId)
    .order("date_made", { ascending: false });

  return (data ?? []).map((t) => ({
    take_id: t.take_id,
    raw_text: t.raw_text,
    summary: t.summary,
    grading_criteria: t.grading_criteria,
    date_made: t.date_made,
    date_submitted: (t as any).date_submitted ?? null,
    time_horizon_date: t.time_horizon_date,
    boldness_score: t.boldness_score,
    outcome_status: t.outcome_status,
    outcome_notes: t.outcome_notes,
    grade: t.grade,
    grade_notes: t.grade_notes,
    rating_status: t.rating_status,
    expert_id: t.expert_id,
    source_url: t.source_url ?? null,
    source_type: t.source_type ?? null,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expert_name: (t.experts as any)?.name ?? "Unknown",
  }));
}

export async function getAllTakesForAdmin(): Promise<AdminTake[]> {
  const supabase = createAdminClient();

  const { data } = await supabase
    .from("takes")
    .select("take_id, raw_text, summary, grading_criteria, date_made, date_submitted, time_horizon_date, boldness_score, outcome_status, outcome_notes, grade, grade_notes, rating_status, expert_id, source_url, source_type, experts(name), player_tags")
    .order("date_made", { ascending: false });

  return (data ?? []).map((t) => ({
    take_id: t.take_id,
    raw_text: t.raw_text,
    summary: t.summary,
    grading_criteria: t.grading_criteria,
    date_made: t.date_made,
    date_submitted: (t as any).date_submitted ?? null,
    time_horizon_date: t.time_horizon_date,
    boldness_score: t.boldness_score,
    outcome_status: t.outcome_status,
    outcome_notes: t.outcome_notes,
    grade: t.grade,
    grade_notes: t.grade_notes,
    rating_status: t.rating_status,
    expert_id: t.expert_id,
    source_url: t.source_url ?? null,
    source_type: t.source_type ?? null,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expert_name: (t.experts as any)?.name ?? "Unknown",
  }));
}

// Used by the cron API route — grades all overdue pending takes
export async function gradeAllPendingTakes(): Promise<{
  graded: number;
  failed: number;
  errors: string[];
}> {
  const pending = await getPendingTakes();
  let graded = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const take of pending) {
    const result = await gradeSingleTake(take.take_id);
    if (result.success) {
      graded++;
    } else {
      failed++;
      errors.push(`${take.take_id}: ${result.error}`);
    }
  }

  return { graded, failed, errors };
}
