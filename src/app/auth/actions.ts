"use server";
import { subscribeUserToPush } from '@/lib/push';

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";

export async function signIn(
  _: unknown,
  formData: FormData
): Promise<{ error: string } | void> {
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: formData.get("email") as string,
    password: formData.get("password") as string,
  });
  if (error) return { error: error.message };
  const next = formData.get("next") as string | null;
  redirect(next ?? "/");
}

export async function signUp(
  _: unknown,
  formData: FormData
): Promise<{ error?: string; success?: boolean }> {
  const supabase = await createClient();

  const email    = formData.get("email") as string;
  const password = formData.get("password") as string;
  const username = (formData.get("username") as string | null)?.trim() || null;
  const sports   = formData.getAll("favorite_sports") as string[];
  const intent   = (formData.get("user_intent") as string | null) || null;

  const admin = createAdminClient();

  // Validate username uniqueness before creating auth user
  if (username) {
    const { data: existing } = await admin
      .from("profiles")
      .select("user_id")
      .ilike("username", username)
      .maybeSingle();
    if (existing) return { error: "That username is already taken." };
  }

  const { data, error } = await supabase.auth.signUp({ email, password });
if (!error && data.user) {
  await subscribeUserToPush(data.user.id, supabase);
  await fetch('/api/send-welcome-push', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId: data.user.id }),
  });
}
  if (error) return { error: error.message };

  // Write profile fields via admin client (user has no session yet pre-email-confirm)
  if (data.user) {
    const { error: profileError } = await admin
      .from("profiles")
      .upsert({
        user_id:         data.user.id,
        username,
        display_name:    username,
        favorite_sports: sports,
        user_intent:     intent,
      });
    if (profileError) return { error: "Account created but profile save failed — please contact support." };
  }

  return { success: true };
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
