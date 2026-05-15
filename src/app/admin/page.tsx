import { redirect } from "next/navigation";
import { checkIsAdmin } from "@/lib/auth";
import { getFeatureFlags } from "@/app/actions/flags";
import AdminPanel from "./AdminPanel";

export default async function AdminPage() {
  const isAdmin = await checkIsAdmin();
  if (!isAdmin) redirect("/");

  const flags = await getFeatureFlags();
  return <AdminPanel initialFlags={flags} />;
}
