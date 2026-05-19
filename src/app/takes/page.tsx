import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import TakeCard from "@/components/TakeCard";
import TakesSearch from "@/components/TakesSearch";
import Link from "next/link";

function initials(name: string) {
  return name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
}

export default async function TakesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; sport?: string; verdict?: string }>;
}) {
  const { q, sport, verdict } = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from("takes")
    .select("*, experts(name, expert_id, outlet)")
    .order("date_made", { ascending: false })
    .limit(50);

  if (q)       query = query.or(`raw_text.ilike.%${q}%,sport.ilike.%${q}%,summary.ilike.%${q}%`);
  if (sport)   query = query.ilike("sport", sport);
  if (verdict === "right")   query = query.eq("outcome_status", "confirmed_true");
  if (verdict === "wrong")   query = query.in("outcome_status", ["confirmed_false", "partially_true"]);
  if (verdict === "pending") query = query.eq("outcome_status", "pending");

  const [{ data: takes }, { data: topExperts }] = await Promise.all([
    query,
    supabase
      .from("experts")
      .select("expert_id, name, outlet, sport_focus, avatar_url, overall_rating, total_takes")
      .gt("overall_rating", 0)
      .order("overall_rating", { ascending: false })
      .limit(5),
  ]);

  return (
    <div className="space-y-5">

      {/* Page header */}
      <div>
        {q && (
          <p className="font-mono text-[11px] tracking-[0.22em] text-gray-400 uppercase mb-1">
            SEARCH · QUERY = &ldquo;{q.toUpperCase()}&rdquo;
          </p>
        )}
        <h1 className="text-4xl font-black tracking-tight">
          1 BAR. <span style={{ color: "#e2241a" }}>2 MODES.</span>
        </h1>
        <p className="italic text-gray-500 mt-0.5">
          the toggle decides: are we hunting people or quotes?
        </p>
      </div>

      {/* Search bar + filters */}
      <Suspense>
        <TakesSearch />
      </Suspense>

      {/* Results count */}
      <div className="flex items-center justify-between">
        <p className="font-mono text-[11px] tracking-wider text-gray-400 uppercase">
          {takes?.length ?? 0} result{takes?.length !== 1 ? "s" : ""}
          {[sport, verdict].filter(Boolean).length > 0 ? " · filtered" : ""}
        </p>
      </div>

      {/* 2-col layout */}
      <div className="grid grid-cols-1 md:grid-cols-[1.6fr_1fr] gap-5">

        {/* Takes */}
        <div className="space-y-3">
          {takes && takes.length > 0 ? (
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            takes.map((take) => <TakeCard key={take.take_id} take={take as any} showExpert />)
          ) : (
            <div className="bg-white border-2 border-gray-900 p-10 text-center italic text-gray-400">
              {q ? `No takes found matching &ldquo;${q}&rdquo;.` : "No takes submitted yet."}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">

          {/* Analyst list */}
          <div className="bg-white border-2 border-gray-900">
            <p className="font-mono text-[11px] tracking-[0.18em] uppercase px-4 py-3 border-b-2 border-gray-900">
              {q ? `ANALYSTS WHO TALK ${q.toUpperCase()}` : "TOP ANALYSTS"}
            </p>
            {(topExperts ?? []).map((e, i) => (
              <Link
                key={e.expert_id}
                href={`/experts/${e.expert_id}`}
                className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors"
                style={{ borderTop: i > 0 ? "1px dashed #d1d5db" : undefined }}
              >
                <div className="w-9 h-9 rounded-full bg-gray-200 shrink-0 overflow-hidden flex items-center justify-center text-xs font-bold text-gray-600">
                  {e.avatar_url
                    ? <img src={e.avatar_url} className="w-full h-full object-cover" alt={e.name} />
                    : initials(e.name)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-black text-sm uppercase tracking-tight truncate">{e.name}</p>
                  <p className="font-mono text-[9px] text-gray-400 tracking-wider uppercase truncate">
                    {e.total_takes} takes · {e.sport_focus?.[0] ?? e.outlet ?? "—"}
                  </p>
                </div>
                <span className="font-black text-xl" style={{ color: "#e2241a" }}>
                  {e.overall_rating.toFixed(1)}
                </span>
              </Link>
            ))}
          </div>

          {/* Save search */}
          <div className="bg-white border-2 border-dashed border-gray-400 px-5 py-4">
            <p className="italic text-gray-700 text-lg">save this search →</p>
            <p className="italic text-sm text-gray-400 mt-0.5">
              get notified when a new take matches.
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}
