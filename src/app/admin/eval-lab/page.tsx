import EvalLabClient from "./EvalLabClient";
import { redirect } from "next/navigation";
import { checkIsAdmin } from "@/lib/auth";

export default async function EvalLabPage() {
  const isAdmin = await checkIsAdmin();
  if (!isAdmin) redirect("/");
  return <EvalLabClient />;
}
