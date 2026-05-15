import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import TakeCard from "@/components/TakeCard";
import FollowButton from "@/components/FollowButton";

interface StatProps {
  label: string;
  value: string | number;
  sub?: string;
  highlight?: boolean;
}

function Stat({ label, value, sub, highlight = false }: StatProps) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4 text-center">
      <p className={`text-2xl font-bold ${highlight ? "text-emerald-400" : "text-zinc-100"}`}>
        {value}
        {sub && <span className="text-sm text-zinc-600 ml-0.5">{sub}</span>}
      </p>
      <p className="mt-1 text-xs text-zinc-500">{label}</p>
    </div>
  );
}

export default async function ExpertProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  const [
    { data: expert },
    { data: allTakes },
    { data: bestTakes },
    { data: worstTakesRaw },
    { data: followRow },
  ] = await Promise.all([
    supabase.from("experts").select("*").eq("expert_id", id).single(),
    supabase.from("takes").select("*").eq("expert_id", id).order("date_made", { ascending: false }),
    supabase.from("takes").select("*").eq("expert_id", id).not("grade", "is", null).order("grade", { ascending: false }).limit(3),
    supabase.from("takes").select("*").eq("expert_id", id).not("grade", "is", null).lt("grade", 60).order("grade", { ascending: true }).limit(3),
    user
      ? supabase.from("follows").select("user_id").eq("user_id", user.id).eq("expert_id", id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const bestIds = new Set((bestTakes ?? []).map((t) => t.take_id));
  const worstTakes = (worstTakesRaw ?? []).filter((t) => !bestIds.has(t.take_id));

  if (!expert) notFound();

  const initials = expert.name
    .split(" ")
    .map((w: string) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="max-w-3xl mx-auto space-y-10">

      {/* Expert header */}
      <div className="flex items-start gap-5">
        <div className="shrink-0 h-16 w-16 rounded-full overflow-hidden bg-zinc-800 flex items-center justify-center text-xl font-bold text-zinc-300">
          {expert.avatar_url ? (
            <img src={expert.avatar_url} alt={expert.name} className="h-full w-full object-cover" />
          ) : (
            initials
          )}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-4">
            <h1 className="text-3xl font-bold">{expert.name}</h1>
            <FollowButton
              expertId={expert.expert_id}
              initialFollowing={!!followRow}
              isLoggedIn={!!user}
            />
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-zinc-500">
            {expert.outlet && <span>{expert.outlet}</span>}
            {expert.twitter_handle && (
              <a
                href={`https://x.com/${expert.twitter_handle.replace("@", "")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-emerald-500 hover:underline"
              >
                {expert.twitter_handle}
              </a>
            )}
          </div>
          {expert.bio && (
            <p className="mt-2 text-sm text-zinc-400 max-w-prose">{expert.bio}</p>
          )}
          {expert.sport_focus.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {expert.sport_focus.map((s: string) => (
                <span key={s} className="rounded-full bg-zinc-800 px-2.5 py-0.5 text-xs text-zinc-400">
                  {s}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Stats dashboard */}
      <section className="space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-500">Track Record</h2>
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-7">
          <div className="col-span-1 sm:col-span-1">
            <Stat label="Accountability" value={expert.accountability_score} sub="/100" highlight />
          </div>
          <div className="col-span-1">
            <Stat label="Overall Rating" value={expert.overall_rating > 0 ? expert.overall_rating.toFixed(1) : "—"} sub={expert.overall_rating > 0 ? "/100" : undefined} />
          </div>
          <div className="col-span-1">
            <Stat label="Accuracy" value={expert.accuracy_rate > 0 ? `${expert.accuracy_rate.toFixed(0)}%` : "—"} />
          </div>
          <div className="col-span-1">
            <Stat label="Total Takes" value={expert.total_takes} />
          </div>
          <div className="col-span-1">
            <Stat label="Graded" value={expert.graded_takes} />
          </div>
          <div className="col-span-1">
            <Stat label="Boldness Avg" value={expert.boldness_avg > 0 ? expert.boldness_avg.toFixed(1) : "—"} sub={expert.boldness_avg > 0 ? "/10" : undefined} />
          </div>
          <div className="col-span-1">
            <Stat label="Flip Count" value={expert.flip_count} />
          </div>
        </div>
      </section>

      {/* Best predictions */}
      {bestTakes && bestTakes.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
            Best Predictions
          </h2>
          <div className="space-y-3">
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            {bestTakes.map((take) => <TakeCard key={take.take_id} take={take as any} />)}
          </div>
        </section>
      )}

      {/* Worst predictions */}
      {worstTakes && worstTakes.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
            Worst Predictions
          </h2>
          <div className="space-y-3">
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            {worstTakes.map((take) => <TakeCard key={take.take_id} take={take as any} />)}
          </div>
        </section>
      )}

      {/* All takes */}
      <section className="space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
          All Takes ({allTakes?.length ?? 0})
        </h2>
        <div className="space-y-3">
          {allTakes && allTakes.length > 0 ? (
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            allTakes.map((take) => <TakeCard key={take.take_id} take={take as any} />)
          ) : (
            <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-8 text-center text-zinc-500">
              No takes submitted yet.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
