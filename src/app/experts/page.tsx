import { createClient } from "@/lib/supabase/server";
import ExpertCard from "@/components/ExpertCard";
import { computeAccolades } from "@/lib/accolades";

export default async function ExpertsPage() {
  const supabase = await createClient();

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

  const [{ data: experts }, { data: recentTakes }] = await Promise.all([
    supabase.from("experts").select("*").order("total_takes", { ascending: false }),
    supabase
      .from("takes")
      .select("expert_id, grade, outcome_status, difficulty_score")
      .gte("date_made", thirtyDaysAgo),
  ]);

  const allExpertSnaps = (experts ?? []).map((e) => ({
    expert_id: e.expert_id,
    overall_rating: e.overall_rating,
    graded_takes: e.graded_takes ?? 0,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Experts</h1>
        <p className="mt-1 text-gray-500">
          {experts?.length ?? 0} pundit{experts?.length !== 1 ? "s" : ""} tracked
        </p>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        {experts && experts.length > 0 ? (
          experts.map((expert) => (
            <ExpertCard
              key={expert.expert_id}
              expert={expert}
              accolades={computeAccolades(
                expert.expert_id,
                expert.overall_rating,
                allExpertSnaps,
                recentTakes ?? []
              )}
            />
          ))
        ) : (
          <div className="col-span-3 rounded-xl border border-gray-200 bg-white p-12 text-center text-gray-400">
            No experts yet — they're created automatically when you submit a take.
          </div>
        )}
      </div>
    </div>
  );
}
