import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import TakeCard from "@/components/TakeCard";
import TakesSearch from "@/components/TakesSearch";

export default async function TakesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; sport?: string }>;
}) {
  const { q, sport } = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from("takes")
    .select("*, experts(name, expert_id, outlet)")
    .order("date_submitted", { ascending: false })
    .limit(50);

  if (q) {
    query = query.or(
      `raw_text.ilike.%${q}%,sport.ilike.%${q}%,summary.ilike.%${q}%`
    );
  }

  if (sport) {
    query = query.ilike("sport", sport);
  }

  const { data: takes } = await query;

  const activeFilters = [q, sport].filter(Boolean);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Browse Takes</h1>
        <p className="mt-1 text-zinc-400">
          {takes?.length ?? 0} take{takes?.length !== 1 ? "s" : ""}
          {activeFilters.length > 0 ? " matching your search" : " submitted"}
        </p>
      </div>

      <Suspense>
        <TakesSearch />
      </Suspense>

      <div className="space-y-4">
        {takes && takes.length > 0 ? (
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          takes.map((take) => <TakeCard key={take.take_id} take={take as any} showExpert />)
        ) : (
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-12 text-center text-zinc-500">
            {activeFilters.length > 0
              ? "No takes matched your search. Try different keywords."
              : "No takes submitted yet. Be the first!"}
          </div>
        )}
      </div>
    </div>
  );
}
