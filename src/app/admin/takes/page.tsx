import { redirect } from "next/navigation";
import { checkIsAdmin } from "@/lib/auth";
import AdminTakesDashboard from "./AdminTakesDashboard";

export default async function AdminTakesPage() {
  const isAdmin = await checkIsAdmin();
  if (!isAdmin) redirect("/");

  return (
    <div className="max-w-4xl">
      <AdminTakesDashboard />
    </div>
  );
}
