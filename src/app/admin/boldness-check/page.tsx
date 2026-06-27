import { checkIsAdmin } from "@/lib/auth";
import { redirect } from "next/navigation";
import BoldnessCheckClient from "./BoldnessCheckClient";

export default async function BoldnessCheckPage() {
  const isAdmin = await checkIsAdmin();
  if (!isAdmin) redirect("/");
  return <BoldnessCheckClient />;
}
