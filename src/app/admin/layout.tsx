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
    // Break out of the root layout's max-w-5xl / px-6 / py-10 container
    <div className="w-screen relative left-1/2 -translate-x-1/2 -mt-10 flex min-h-[calc(100vh-57px)]" style={{ backgroundColor: "#f3f4f6" }}>
      <AdminSidebar reviewCount={reviewCount} />
      <main className="flex-1 min-w-0 px-8 py-8 overflow-auto">
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
