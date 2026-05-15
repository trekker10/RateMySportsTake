"use server";

import { createClient } from "@/lib/supabase/server";
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
  const { error } = await supabase.auth.signUp({
    email: formData.get("email") as string,
    password: formData.get("password") as string,
  });
  if (error) return { error: error.message };
  return { success: true };
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
