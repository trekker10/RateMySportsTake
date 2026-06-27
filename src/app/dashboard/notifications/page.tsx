import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import NotificationPreferences from "./NotificationPreferences";

export default async function NotificationsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: prefs } = await supabase
    .from("notification_preferences")
    .select("official, analyst_updates, take_updates")
    .eq("user_id", user.id)
    .maybeSingle();

  const { data: sub } = await supabase
    .from("push_subscriptions")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  return (
    <NotificationPreferences
      userId={user.id}
      isSubscribed={!!sub}
      prefs={{
        official: prefs?.official ?? false,
        analyst_updates: prefs?.analyst_updates ?? false,
        take_updates: prefs?.take_updates ?? false,
      }}
    />
  );
}
