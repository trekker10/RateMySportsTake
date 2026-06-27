"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function saveNotificationPreferences(prefs: {
  official: boolean;
  analyst_updates: boolean;
  take_updates: boolean;
}): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  const { error } = await supabase
    .from("notification_preferences")
    .upsert({ user_id: user.id, ...prefs, updated_at: new Date().toISOString() });

  if (error) return { ok: false, error: error.message };

  revalidatePath("/dashboard/notifications");
  return { ok: true };
}

export async function requestPushAndSubscribe(): Promise<{ ok: boolean; error?: string }> {
  // Handled client-side — this is a placeholder for the server upsert
  return { ok: true };
}
