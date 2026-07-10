import { createClient } from "@/lib/supabase/server";
import { getCrowdSettings } from "@/app/actions/crowdSettings";
import CrowdForecastAdmin from "./CrowdForecastAdmin";

export default async function CrowdForecastAdminPage() {
  const [settings, supabase] = await Promise.all([
    getCrowdSettings(),
    createClient(),
  ]);

  // Fetch recent takes sorted by submission date (newest first)
  const { data: takesRaw } = await supabase
    .from("takes")
    .select("take_id, summary, raw_text, vote_boost_well, vote_boost_poorly, date_submitted, experts(name)")
    .order("date_submitted", { ascending: false })
    .limit(500);

  const takes = (takesRaw ?? []).map((t) => ({
    take_id: t.take_id,
    summary: t.summary ?? t.raw_text ?? "",
    expertName: (t.experts as any)?.name ?? "Unknown",
    boostWell: t.vote_boost_well ?? 0,
    boostPoorly: t.vote_boost_poorly ?? 0,
    dateSubmitted: t.date_submitted ?? "",
  }));

  return <CrowdForecastAdmin settings={settings} takes={takes} />;
}
