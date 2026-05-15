import { createClient } from "@/lib/supabase/server";
import ExpertCard from "@/components/ExpertCard";

export default async function ExpertsPage() {
  const supabase = await createClient();

  const { data: experts } = await supabase
    .from("experts")
    .select("*")
    .order("total_takes", { ascending: false });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Experts</h1>
        <p className="mt-1 text-zinc-400">
          {experts?.length ?? 0} pundit{experts?.length !== 1 ? "s" : ""} tracked
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {experts && experts.length > 0 ? (
          experts.map((expert) => <ExpertCard key={expert.expert_id} expert={expert} />)
        ) : (
          <div className="col-span-3 rounded-xl border border-zinc-800 bg-zinc-900 p-12 text-center text-zinc-500">
            No experts yet — they're created automatically when you submit a take.
          </div>
        )}
      </div>
    </div>
  );
}
