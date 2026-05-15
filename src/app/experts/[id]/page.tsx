import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import TakeCard from "@/components/TakeCard";
import FollowButton from "@/components/FollowButton";

const TABS = [
  { key: "takes",  label: "Takes" },
  { key: "stats",  label: "Stats" },
  { key: "best",   label: "Best" },
  { key: "worst",  label: "Worst" },
];

interface StatBoxProps {
  label: string;
  value: string | number;
  sub?: string;
  highlight?: boolean;
}

function StatBox({ label, value, sub, highlight = false }: StatBoxProps) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 text-center shadow-sm">
      <p className={`text-2xl font-bold ${highlight ? "text-emerald-600" : "text-gray-900"}`}>
        {value}
        {sub && <span className="text-sm text-gray-400 ml-0.5">{sub}</span>}
      </p>
      <p className="mt-1 text-xs text-gray-500 uppercase tracking-wide">{label}</p>
    </div>
  );
}

export default async function ExpertProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { id } = await params;
  const { tab: rawTab } = await searchParams;
  const tab = TABS.find((t) => t.key === rawTab)?.key ?? "takes";

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
    supabase.from("takes").select("*").eq("expert_id", id).not("grade", "is", null).order("grade", { ascending: false }).limit(5),
    supabase.from("takes").select("*").eq("expert_id", id).not("grade", "is", null).lt("grade", 60).order("grade", { ascending: true }).limit(5),
    user
      ? supabase.from("follows").select("user_id").eq("user_id", user.id).eq("expert_id", id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  if (!expert) notFound();

  const bestIds = new Set((bestTakes ?? []).map((t: { take_id: string }) => t.take_id));
  const worstTakes = (worstTakesRaw ?? []).filter((t: { take_id: string }) => !bestIds.has(t.take_id));

  const initials = expert.name
    .split(" ")
    .map((w: string) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="-mx-6 -mt-10">

      {/* ── Hero header strip ── */}
      <div className="bg-gray-900 text-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center gap-6">

            {/* Avatar */}
            <div className="h-24 w-24 shrink-0 rounded-full overflow-hidden bg-gray-700 flex items-center justify-center text-3xl font-bold text-gray-300 ring-4 ring-gray-700">
              {expert.avatar_url ? (
                <img src={expert.avatar_url} alt={expert.name} className="h-full w-full object-cover" />
              ) : (
                initials
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-3 mb-1">
                <h1 className="text-3xl font-bold text-white">{expert.name}</h1>
                <FollowButton
                  expertId={expert.expert_id}
                  initialFollowing={!!followRow}
                  isLoggedIn={!!user}
                />
              </div>

              <div className="flex flex-wrap items-center gap-3 text-sm text-gray-400">
                {expert.outlet && <span className="font-medium text-gray-300">{expert.outlet}</span>}
                {expert.outlet && expert.twitter_handle && <span>·</span>}
                {expert.twitter_handle && (
                  <a
                    href={`https://x.com/${expert.twitter_handle.replace("@", "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-emerald-400 hover:text-emerald-300 transition-colors"
                  >
                    {expert.twitter_handle}
                  </a>
                )}
                {expert.sport_focus?.length > 0 && (
                  <>
                    <span>·</span>
                    <span>{expert.sport_focus.join(", ")}</span>
                  </>
                )}
              </div>

              {expert.bio && (
                <p className="mt-2 text-sm text-gray-400 max-w-xl">{expert.bio}</p>
              )}
            </div>

            {/* Accountability score badge */}
            <div className="hidden sm:flex flex-col items-center shrink-0 bg-gray-800 rounded-xl px-5 py-3 border border-gray-700">
              <span className="text-3xl font-black text-emerald-400">{expert.accountability_score}</span>
              <span className="text-xs text-gray-500 uppercase tracking-wide mt-0.5">Accountability</span>
            </div>
          </div>
        </div>

        {/* ── Tab nav ── */}
        <div className="border-t border-gray-800">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <nav className="flex gap-0 -mb-px">
              {TABS.map((t) => (
                <Link
                  key={t.key}
                  href={`/experts/${id}?tab=${t.key}`}
                  className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
                    tab === t.key
                      ? "border-emerald-400 text-emerald-400"
                      : "border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-500"
                  }`}
                >
                  {t.label}
                  {t.key === "takes" && allTakes?.length
                    ? <span className="ml-1.5 text-xs text-gray-600">({allTakes.length})</span>
                    : null}
                </Link>
              ))}
            </nav>
          </div>
        </div>
      </div>

      {/* ── Content area ── */}
      <div className="bg-gray-100 min-h-[60vh]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

          {/* TAKES TAB */}
          {tab === "takes" && (
            <div className="space-y-3">
              {allTakes && allTakes.length > 0 ? (
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                allTakes.map((take) => <TakeCard key={take.take_id} take={take as any} />)
              ) : (
                <div className="bg-white rounded-xl border border-gray-200 p-10 text-center text-gray-400">
                  No takes submitted yet.
                </div>
              )}
            </div>
          )}

          {/* STATS TAB */}
          {tab === "stats" && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                <StatBox label="Accountability" value={expert.accountability_score} sub="/100" highlight />
                <StatBox label="Overall Rating" value={expert.overall_rating > 0 ? expert.overall_rating.toFixed(1) : "—"} sub={expert.overall_rating > 0 ? "/100" : undefined} />
                <StatBox label="Accuracy" value={expert.accuracy_rate > 0 ? `${expert.accuracy_rate.toFixed(0)}%` : "—"} />
                <StatBox label="Total Takes" value={expert.total_takes} />
                <StatBox label="Graded" value={expert.graded_takes} />
                <StatBox label="Boldness Avg" value={expert.boldness_avg > 0 ? expert.boldness_avg.toFixed(1) : "—"} sub={expert.boldness_avg > 0 ? "/10" : undefined} />
                <StatBox label="Flip Count" value={expert.flip_count} />
              </div>
            </div>
          )}

          {/* BEST TAB */}
          {tab === "best" && (
            <div className="space-y-3">
              {bestTakes && bestTakes.length > 0 ? (
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                bestTakes.map((take) => <TakeCard key={take.take_id} take={take as any} />)
              ) : (
                <div className="bg-white rounded-xl border border-gray-200 p-10 text-center text-gray-400">
                  No graded takes yet.
                </div>
              )}
            </div>
          )}

          {/* WORST TAB */}
          {tab === "worst" && (
            <div className="space-y-3">
              {worstTakes.length > 0 ? (
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                worstTakes.map((take) => <TakeCard key={take.take_id} take={take as any} />)
              ) : (
                <div className="bg-white rounded-xl border border-gray-200 p-10 text-center text-gray-400">
                  No bad takes on record yet.
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
