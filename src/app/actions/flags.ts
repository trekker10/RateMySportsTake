"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { checkIsAdmin } from "@/lib/auth";

export interface FeatureFlag {
  key: string;
  enabled: boolean;
  description: string | null;
}

export async function getFeatureFlags(): Promise<FeatureFlag[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("feature_flags")
    .select("key, enabled, description")
    .order("key");
  return data ?? [];
}

export async function getFlag(key: string): Promise<boolean> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("feature_flags")
    .select("enabled")
    .eq("key", key)
    .single();
  return data?.enabled ?? true;
}

export async function toggleFlag(key: string, enabled: boolean): Promise<void> {
  const isAdmin = await checkIsAdmin();
  if (!isAdmin) throw new Error("Unauthorized");

  const supabase = createAdminClient();
  await supabase
    .from("feature_flags")
    .update({ enabled, updated_at: new Date().toISOString() })
    .eq("key", key);
}
