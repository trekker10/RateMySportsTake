"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { checkIsAdmin } from "@/lib/auth";

export interface CrowdSettings {
  minVotes: number;
}

export async function getCrowdSettings(): Promise<CrowdSettings> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("app_settings")
    .select("key, value")
    .in("key", ["crowd_forecast_min_votes"]);

  const map = Object.fromEntries((data ?? []).map((r) => [r.key, r.value]));
  return {
    minVotes: parseInt(map["crowd_forecast_min_votes"] ?? "5", 10),
  };
}

export async function setCrowdSetting(key: string, value: string): Promise<void> {
  const isAdmin = await checkIsAdmin();
  if (!isAdmin) throw new Error("Unauthorized");

  const supabase = createAdminClient();
  await supabase
    .from("app_settings")
    .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: "key" });
}

export async function setVoteBoost(takeId: string, well: number, poorly: number): Promise<void> {
  const isAdmin = await checkIsAdmin();
  if (!isAdmin) throw new Error("Unauthorized");

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("takes")
    .update({ vote_boost_well: well, vote_boost_poorly: poorly })
    .eq("take_id", takeId);
  if (error) throw new Error(error.message);
}
