import { createAdminClient } from "@/lib/supabase/admin";
import EmailAdmin from "./EmailAdmin";

export default async function EmailAdminPage() {
  const supabase = createAdminClient();

  const [{ data: templates }, { data: experts }] = await Promise.all([
    supabase
      .from("email_templates")
      .select("*")
      .order("updated_at", { ascending: false }),
    supabase
      .from("experts")
      .select("expert_id, name, slug")
      .eq("verified", true)
      .order("name"),
  ]);

  return (
    <EmailAdmin
      initialTemplates={templates ?? []}
      experts={(experts ?? []).map((e) => ({ id: e.expert_id, name: e.name, slug: e.slug }))}
    />
  );
}
