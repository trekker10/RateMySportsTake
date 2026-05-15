import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getFlag } from "@/app/actions/flags";
import SubmitForm from "./SubmitForm";

export default async function SubmitPage() {
  const requireAuth = await getFlag("require_auth_for_submissions");

  if (requireAuth) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect("/auth/login?next=/submit");
  }

  return <SubmitForm />;
}
