"use server";

import { createClient } from "@/lib/supabase/server";

export async function followExpert(expertId: string): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not logged in");
  await supabase.from("follows").insert({ user_id: user.id, expert_id: expertId });
}

export async function unfollowExpert(expertId: string): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not logged in");
  await supabase.from("follows")
    .delete()
    .eq("user_id", user.id)
    .eq("expert_id", expertId);
}
