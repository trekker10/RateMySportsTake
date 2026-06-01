"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { detectFlipFlops } from "@/lib/ai/detect-flip-flops";
import { revalidatePath } from "next/cache";
import { checkIsAdmin } from "@/lib/auth";

export interface FlipFlopTake {
  take_id: string;
  date_made: string;
  raw_text: string | null;
  summary: string | null;
  outcome_status: string;
}

export interface FlipFlopRecord {
  flip_flop_id: string;
  contradiction_summary: string;
  detected_at: string;
  take_a: FlipFlopTake;
  take_b: FlipFlopTake;
}

// ── Fetch stored flip-flops for an expert ──────────────────────────────────────
export async function getFlipFlops(expertId: string): Promise<FlipFlopRecord[]> {
  const supabase = createAdminClient();

  const { data: ffs, error } = await supabase
    .from("flip_flops")
    .select("flip_flop_id, contradiction_summary, detected_at, take_a_id, take_b_id")
    .eq("expert_id", expertId)
    .order("detected_at", { ascending: false });

  if (error) throw new Error(error.message);
  if (!ffs?.length) return [];

  // Fetch the actual takes in one query
  const takeIds = [...new Set([...ffs.map((f) => f.take_a_id), ...ffs.map((f) => f.take_b_id)])];
  const { data: takes } = await supabase
    .from("takes")
    .select("take_id, date_made, raw_text, summary, outcome_status")
    .in("take_id", takeIds);

  const takesById = Object.fromEntries((takes ?? []).map((t) => [t.take_id, t]));

  return ffs
    .map((ff) => ({
      flip_flop_id: ff.flip_flop_id,
      contradiction_summary: ff.contradiction_summary,
      detected_at: ff.detected_at,
      take_a: takesById[ff.take_a_id] as FlipFlopTake,
      take_b: takesById[ff.take_b_id] as FlipFlopTake,
    }))
    .filter((ff) => ff.take_a && ff.take_b);
}

// ── Run AI detection + store results (admin only) ─────────────────────────────
export async function runFlipFlopDetection(
  expertId: string
): Promise<{ success: boolean; count: number; error?: string }> {
  const isAdmin = await checkIsAdmin();
  if (!isAdmin) return { success: false, count: 0, error: "Unauthorized" };

  const supabase = createAdminClient();

  // Fetch all takes for this expert (cap at 100 for cost control)
  const { data: takes } = await supabase
    .from("takes")
    .select("take_id, date_made, raw_text, summary, grading_criteria")
    .eq("expert_id", expertId)
    .not("summary", "is", null)  // only takes with content
    .order("date_made", { ascending: false })
    .limit(100);

  if (!takes?.length) {
    await supabase.from("experts").update({ flip_count: 0 }).eq("expert_id", expertId);
    revalidatePath(`/experts/${expertId}`);
    return { success: true, count: 0 };
  }

  // Run AI detection
  let pairs: Awaited<ReturnType<typeof detectFlipFlops>> = [];
  try {
    pairs = await detectFlipFlops(takes);
  } catch (err) {
    return {
      success: false,
      count: 0,
      error: err instanceof Error ? err.message : "Detection failed",
    };
  }

  // Clear previous results for this expert, then insert fresh ones
  await supabase.from("flip_flops").delete().eq("expert_id", expertId);

  if (pairs.length > 0) {
    const rows = pairs.map((p) => ({
      expert_id: expertId,
      take_a_id: p.take_a_id,
      take_b_id: p.take_b_id,
      contradiction_summary: p.contradiction_summary,
    }));
    await supabase.from("flip_flops").insert(rows);
  }

  // Update the flip_count on the expert row
  await supabase
    .from("experts")
    .update({ flip_count: pairs.length })
    .eq("expert_id", expertId);

  revalidatePath(`/experts/${expertId}`);
  revalidatePath(`/experts/${expertId}/flip-flops`);

  return { success: true, count: pairs.length };
}
