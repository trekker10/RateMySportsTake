import { redirect } from "next/navigation";
import { checkIsAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import UsersTable from "./UsersTable";

export default async function AdminUsersPage() {
  const isAdmin = await checkIsAdmin();
  if (!isAdmin) redirect("/");

  const supabase = createAdminClient();

  const { data: profiles } = await supabase
    .from("profiles")
    .select("user_id, username, display_name, favorite_sports, user_intent, created_at")
    .order("created_at", { ascending: false });

  // Check which users have push subscriptions
  const { data: subs } = await supabase
    .from("push_subscriptions")
    .select("user_id");

  const subscribedIds = new Set((subs ?? []).map((s: any) => s.user_id));

  const users = (profiles ?? []).map((p: any) => ({
    ...p,
    has_push: subscribedIds.has(p.user_id),
  }));

  return <UsersTable users={users} />;
}
