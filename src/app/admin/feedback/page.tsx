import { createAdminClient } from "@/lib/supabase/admin";
import FeedbackAdmin from "./FeedbackAdmin";

export const dynamic = "force-dynamic";

export default async function AdminFeedbackPage() {
  const supabase = createAdminClient();

  const { data } = await supabase
    .from("feedback_submissions")
    .select("*")
    .order("created_at", { ascending: false });

  return <FeedbackAdmin initialRows={data ?? []} />;
}
