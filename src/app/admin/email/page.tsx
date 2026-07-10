import { createAdminClient } from "@/lib/supabase/admin";
import EmailAdmin from "./EmailAdmin";

export default async function EmailAdminPage() {
  const supabase = createAdminClient();

  const PAGE_SIZE = 25;

  const [
    { data: templates },
    { data: experts },
    { data: schedules },
    { data: triggers },
    { data: historyRows, count: historyTotal },
  ] = await Promise.all([
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
    supabase
      .from("email_send_log")
      .select("*, email_templates(name)", { count: "exact" })
      .order("sent_at", { ascending: false })
      .range(0, PAGE_SIZE - 1),
  ]);

  return (
    <EmailAdmin
      initialTemplates={templates ?? []}
      experts={(experts ?? []).map((e) => ({ id: e.expert_id, name: e.name, slug: e.slug }))}
      initialSchedules={schedules ?? []}
      initialTriggers={triggers ?? []}
      initialHistory={historyRows ?? []}
      historyTotal={historyTotal ?? 0}
    />
  );
}
