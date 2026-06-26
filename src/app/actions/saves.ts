"use server";

import { createClient } from "@/lib/supabase/server";

export async function saveTake(takeId: string): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  await supabase.from("saved_takes").insert({ user_id: user.id, take_id: takeId });
}

export async function unsaveTake(takeId: string): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  await supabase.from("saved_takes").delete().eq("user_id", user.id).eq("take_id", takeId);
}
