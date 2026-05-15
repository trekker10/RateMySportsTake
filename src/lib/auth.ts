import { createClient } from "@/lib/supabase/server";

export async function getCurrentUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

export async function checkIsAdmin(): Promise<boolean> {
  const user = await getCurrentUser();
  if (!user?.email) return false;
  const adminEmails = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase());
  return adminEmails.includes(user.email.toLowerCase());
}
