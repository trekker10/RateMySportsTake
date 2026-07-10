import { createAdminClient } from "@/lib/supabase/admin";
import EmailAdmin from "./EmailAdmin";

export default async function EmailAdminPage() {
  const supabase = createAdminClient();

  const [{ data: templates }, { data: experts }, { data: schedules }, { data: triggers }] = await Promise.all([
    supabase
      .from("email_templates")
      .select("*")
      .order("updated_at", { ascending: false }),
    supabase
      .from("experts")
      .select("expert_id, name, slug")
      .eq("verified", true)
      .order("name"),
    supabase
      .from("email_schedules")
      .select("*, email_templates(name)")
      .order("next_send_at", { ascending: true }),
    supabase
      .from("email_triggers")
      .select("*, email_templates(id, name)")
      .order("created_at", { ascending: true }),
  ]);

  return (
    <EmailAdmin
      initialTemplates={templates ?? []}
      experts={(experts ?? []).map((e) => ({ id: e.expert_id, name: e.name, slug: e.slug }))}
      initialSchedules={schedules ?? []}
      initialTriggers={triggers ?? []}
    />
  );
}
