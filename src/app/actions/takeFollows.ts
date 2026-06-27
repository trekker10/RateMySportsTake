"use server";

import { createClient } from "@/lib/supabase/server";

export async function followTake(takeId: string): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from("take_follows").upsert({ user_id: user.id, take_id: takeId });
}

export async function unfollowTake(takeId: string): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from("take_follows").delete().eq("user_id", user.id).eq("take_id", takeId);
}
