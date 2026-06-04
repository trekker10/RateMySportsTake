import { redirect } from "next/navigation";
import { checkIsAdmin } from "@/lib/auth";
import { getFeatureFlags } from "@/app/actions/flags";
import { createAdminClient } from "@/lib/supabase/admin";
import AdminPanel from "./AdminPanel";

export default async function AdminPage() {
  const isAdmin = await checkIsAdmin();
  if (!isAdmin) redirect("/");

  const [flags, stats] = await Promise.all([
    getFeatureFlags(),
    fetchDashboardStats(),
  ]);

  return <AdminPanel initialFlags={flags} stats={stats} />;
}

async function fetchDashboardStats() {
  const supabase = createAdminClient();
  const today = new Date().toISOString().split("T")[0];

  const [
    { count: analystToday },
    { count: fantasyToday },
    { count: analystResolved },
    { count: fantasyResolved },
    { count: analystOverdue },
    { count: fantasyOverdue },
  ] = await Promise.all([
    // Takes logged today
    supabase.from("takes").select("take_id", { count: "exact", head: true }).eq("date_made", today),
    supabase.from("fantasy_takes").select("fantasy_take_id", { count: "exact", head: true }).eq("date_made", today),
    // Total ever graded/resolved
    supabase.from("takes").select("take_id", { count: "exact", head: true }).neq("outcome_status", "pending"),
    supabase.from("fantasy_takes").select("fantasy_take_id", { count: "exact", head: true }).eq("outcome_status", "resolved"),
    // Overdue: pending + past resolution date
    supabase.from("takes").select("take_id", { count: "exact", head: true }).eq("outcome_status", "pending").not("time_horizon_date", "is", null).lte("time_horizon_date", today),
    supabase.from("fantasy_takes").select("fantasy_take_id", { count: "exact", head: true }).eq("outcome_status", "pending").not("resolution_date", "is", null).lte("resolution_date", today),
  ]);

  return {
    addedToday:     (analystToday ?? 0) + (fantasyToday ?? 0),
    analystToday:   analystToday ?? 0,
    fantasyToday:   fantasyToday ?? 0,
    totalGraded:    (analystResolved ?? 0) + (fantasyResolved ?? 0),
    analystGraded:  analystResolved ?? 0,
    fantasyGraded:  fantasyResolved ?? 0,
    reviewQueue:    (analystOverdue ?? 0) + (fantasyOverdue ?? 0),
    analystOverdue: analystOverdue ?? 0,
    fantasyOverdue: fantasyOverdue ?? 0,
  };
}
