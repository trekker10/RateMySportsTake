import { createAdminClient } from "@/lib/supabase/admin";
import EmailAdmin from "./EmailAdmin";

export default async function EmailAdminPage() {
  const supabase = createAdminClient();
  const { data: templates } = await supabase
    .from("email_templates")
    .select("*")
    .order("updated_at", { ascending: false });

  return <EmailAdmin initialTemplates={templates ?? []} />;
}
