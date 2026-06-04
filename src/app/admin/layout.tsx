import { redirect } from "next/navigation";
import { checkIsAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import AdminSidebar from "./AdminSidebar";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const isAdmin = await checkIsAdmin();
  if (!isAdmin) redirect("/");

  const reviewCount = await fetchReviewCount();

  return (
    <div className="flex min-h-screen bg-gray-50">
      <AdminSidebar reviewCount={reviewCount} />
      <main className="flex-1 px-8 py-8 overflow-auto">
        {children}
      </main>
    </div>
  );
}

async function fetchReviewCount(): Promise<number> {
  const supabase = createAdminClient();
  const today = new Date().toISOString().split("T")[0];

  const [{ count: analystOverdue }, { count: fantasyOverdue }] = await Promise.all([
    supabase
      .from("takes")
      .select("take_id", { count: "exact", head: true })
      .eq("outcome_status", "pending")
      .not("time_horizon_date", "is", null)
      .lte("time_horizon_date", today),
    supabase
      .from("fantasy_takes")
      .select("fantasy_take_id", { count: "exact", head: true })
      .eq("outcome_status", "pending")
      .not("resolution_date", "is", null)
      .lte("resolution_date", today),
  ]);

  return (analystOverdue ?? 0) + (fantasyOverdue ?? 0);
}
