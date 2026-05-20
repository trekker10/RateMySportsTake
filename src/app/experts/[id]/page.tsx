import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import FollowButton from "@/components/FollowButton";
import Avatar from "@/components/Avatar";

const VERDICT_FILTERS = ["all", "right", "wrong", "pending"] as const;
type VerdictFilter = typeof VERDICT_FILTERS[number];

function verdictTag(status: string) {
  if (status === "confirmed_true")  return { label: "RIGHT",      bg: "#0a7a3b", text: "#fff" };
  if (status === "confirmed_false") return { label: "WRONG",      bg: "#e2241a", text: "#fff" };
  if (status === "partially_true")  return { label: "PARTLY RIGHT", bg: "#d97706", text: "#fff" };
  if (status === "unresolvable")    return { label: "N/A",         bg: "#6b7280", text: "#fff" };
  return                                   { label: "PENDING",    bg: "#e5e7eb", text: "#4b5563" };
}

function gradeImpact(grade: number | null) {
  if (grade == null) return null;
  const delta = Math.round(grade - 50);
  return delta >= 0 ? `+${delta}` : `${delta}`;
}

export default async function ExpertProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ verdict?: string }>;
}) {
  const { id } = await params;
  const { verdict: rawVerdict } = await searchParams;
  const verdict: VerdictFilter = VERDICT_FILTERS.includes(rawVerdict as VerdictFilter)
    ? (rawVerdict as VerdictFilter)
    : "all";

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Build takes query based on verdict filter
  let takesQuery = supabase
    .from("takes")
    .select("*")
    .eq("expert_id", id)
    .order("date_made", { ascending: false })
    .limit(20);

  if (verdict === "right")   takesQuery = takesQuery.eq("outcome_status", "confirmed_true");
  if (verdict === "wrong")   takesQuery = takesQuery.in("outcome_status", ["confirmed_false", "partially_true"]);
  if (verdict === "pending") takesQuery = takesQuery.eq("outcome_status", "pending");

  const [
    { data: expert },
    { data: takes },
    { data: allExperts },
    { data: followRow },
  ] = await Promise.all([
    supabase.from("experts").select("*").eq("expert_id", id).single(),
    takesQuery,
    supabase.from("experts").select("expert_id, overall_rating").gt("overall_rating", 0).order("overall_rating", { ascending: false }),
    user
      ? supabase.from("follows").select("user_id").eq("user_id", user.id).eq("expert_id", id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  if (!expert) notFound();

  // Rank
  const rank = (allExperts ?? []).findIndex((e) => e.expert_id === id) + 1;
  const rankLabel = rank > 0 ? `#${rank}` : "—";

  // Name split for accent on last word
  const nameParts = expert.name.trim().split(" ");
  const firstName = nameParts.slice(0, -1).join(" ");
  const lastName  = nameParts[nameParts.length - 1];

  function boldnessTier(avg: number): { label: string; color: string } {
    if (avg <= 0)  return { label: "—",             color: "#9ca3af" };
    if (avg <= 20) return { label: "Not Very Bold",  color: "#991b1b" };
    if (avg <= 40) return { label: "Meh Bold",       color: "#c2410c" };
    if (avg <= 60) return { label: "Bold",           color: "#b45309" };
    if (avg <= 80) return { label: "Pretty Bold",    color: "#15803d" };
    return              { label: "Very Bold",        color: "#166534" };
  }

  function accountabilityTier(score: number): { label: string; color: string } {
    if (score <= 0)  return { label: "—",                       color: "#9ca3af" };
    if (score <= 20) return { label: "Not Very",                color: "#991b1b" };
    if (score <= 40) return { label: "Won't Take It",           color: "#c2410c" };
    if (score <= 60) return { label: "Sometimes",               color: "#b45309" };
    if (score <= 80) return { label: "Mostly Does",             color: "#15803d" };
    return               { label: "Always Takes It",            color: "#166534" };
  }

  const boldness = boldnessTier(expert.boldness_avg);
  const accountability = accountabilityTier(expert.accountability_score);

  const subMetrics = [
    { label: "ACCURACY",      value: expert.accuracy_rate > 0 ? `${Math.round(expert.accuracy_rate)}%` : "—", sub: "takes that landed",    color: "#111827" },
    { label: "BOLDNESS",      value: boldness.label,        sub: "",               color: boldness.color },
    { label: "ACCOUNTABILITY",value: accountability.label,  sub: "",               color: accountability.color },
    { label: "VOLUME",        value: expert.graded_takes,                                                      sub: "graded takes",          color: "#111827" },
    { label: "RECEIPTS",      value: expert.flip_count ?? 0,                                                  sub: "public flip-flops",     color: "#111827" },
  ];

  const scoreFormula = [
    { k: "Accuracy weight",       v: "40%" },
    { k: "Boldness weight",       v: "25%" },
    { k: "Recency decay",         v: "6 months" },
    { k: "Flip-flop penalty",     v: "−3.0 ea" },
  ];

  return (
    <div className="w-screen relative left-1/2 -translate-x-1/2 -mt-10">

      {/* ── Hero band ── */}
      <div className="border-b-2 border-gray-900 bg-white">

        {/* Mobile hero — side by side */}
        <div className="md:hidden flex">
          {/* Photo */}
          <div className="w-36 shrink-0 border-r-2 border-gray-900 bg-gray-100 overflow-hidden flex items-center justify-center" style={{ minHeight: 200 }}>
            <Avatar
              name={expert.name}
              avatarUrl={expert.avatar_url}
              className="w-full h-full object-cover"
              textClassName="text-2xl font-black text-gray-500"
            />
          </div>

          {/* Info */}
          <div className="flex-1 px-4 py-4 flex flex-col justify-between">
            <div>
              <p className="font-mono text-[10px] tracking-[0.18em] text-gray-400 uppercase">Analyst · {rankLabel}</p>
              <h1 className="font-black italic leading-none tracking-tight mt-1" style={{ fontSize: "clamp(1.6rem, 6.5vw, 2.5rem)" }}>
                {firstName && <>{firstName} </>}
                <span style={{ color: "#e2241a" }}>{lastName}</span>
              </h1>

              <div className="mt-2 space-y-0.5">
                {expert.sport_focus?.length > 0 && (
                  <p className="font-mono text-[10px] tracking-wider text-gray-500 uppercase">{expert.sport_focus.join(" · ")}</p>
                )}
                {expert.outlet && (
                  <p className="font-mono text-[10px] tracking-wider text-gray-500">{expert.outlet}</p>
                )}
                {expert.twitter_handle && (
                  <a href={`https://x.com/${expert.twitter_handle.replace("@", "")}`} target="_blank" rel="noopener noreferrer"
                    className="block font-mono text-[10px] tracking-wider text-gray-500 hover:text-gray-900 transition-colors">
                    {expert.twitter_handle}
                  </a>
                )}
              </div>

              {/* TakeScore inline */}
              <div className="flex items-baseline gap-2 mt-3">
                <span className="font-mono text-[9px] tracking-widest text-gray-400 uppercase">TakeScore</span>
                <span className="font-black text-2xl leading-none" style={{ color: "#e2241a" }}>
                  {expert.overall_rating > 0 ? <>{Math.round(expert.overall_rating)}<span className="text-xs font-normal text-gray-400">/100</span></> : "—"}
                </span>
                {rank > 0 && <span className="font-mono text-[10px] text-gray-400">#{rank}</span>}
              </div>
            </div>

            <div className="flex flex-wrap gap-2 mt-3">
              <FollowButton expertId={expert.expert_id} initialFollowing={!!followRow} isLoggedIn={!!user} />
              <button className="px-3 py-1.5 border-2 border-gray-900 font-mono text-[10px] tracking-widest uppercase text-gray-700 hover:bg-gray-50 transition-colors">
                Followed Takes
              </button>
            </div>
          </div>
        </div>

        {/* Desktop hero — 3 columns */}
        <div className="hidden md:grid max-w-5xl mx-auto grid-cols-[220px_1fr_220px]">
          <div className="border-r-2 border-gray-900 flex items-center justify-center bg-gray-100" style={{ minHeight: 220 }}>
            <Avatar
              name={expert.name}
              avatarUrl={expert.avatar_url}
              className="w-full h-full object-cover"
              textClassName="text-3xl font-black text-gray-500"
            />
          </div>

          <div className="px-7 py-6">
            <p className="font-mono text-[11px] tracking-[0.22em] text-gray-400 uppercase">Analyst · {rankLabel}</p>
            <h1 className="font-black italic leading-none tracking-tight mt-2" style={{ fontSize: "clamp(2.5rem, 5vw, 4rem)" }}>
              {firstName && <>{firstName}<br /></>}
              <span style={{ color: "#e2241a" }}>{lastName}</span>
            </h1>
            <p className="italic text-lg text-gray-500 mt-3">
              {[expert.bio, expert.outlet, expert.sport_focus?.join(", ")].filter(Boolean).join(" · ")}
              {expert.twitter_handle && (
                <> · <a href={`https://x.com/${expert.twitter_handle.replace("@", "")}`} target="_blank" rel="noopener noreferrer" className="hover:text-gray-900 transition-colors">{expert.twitter_handle}</a></>
              )}
            </p>
            <div className="flex flex-wrap gap-2 mt-5">
              <FollowButton expertId={expert.expert_id} initialFollowing={!!followRow} isLoggedIn={!!user} />
              <button className="px-4 py-2 border-2 border-gray-900 font-mono text-[11px] tracking-widest uppercase text-gray-700 hover:bg-gray-50 transition-colors">Followed Takes</button>
              <button className="px-4 py-2 border-2 border-gray-900 font-mono text-[11px] tracking-widest uppercase text-gray-700 hover:bg-gray-50 transition-colors">Roast Profile</button>
            </div>
          </div>

          <div className="border-l-2 border-gray-900 px-6 py-6 flex flex-col justify-center" style={{ backgroundColor: "#f5f1e8" }}>
            <p className="font-mono text-[11px] tracking-[0.22em] text-gray-400 uppercase">TakeScore</p>
            <p className="font-black leading-none mt-1" style={{ fontSize: "clamp(4rem, 6vw, 6.5rem)", color: "#e2241a" }}>
              {expert.overall_rating > 0 ? <>{Math.round(expert.overall_rating)}<span className="text-lg font-normal text-gray-400">/100</span></> : "—"}
            </p>
            {rank > 0 && <p className="italic text-gray-500 mt-2 text-sm">ranked {rankLabel} overall.</p>}
          </div>
        </div>
      </div>

      {/* ── Sub-metric bar ── */}
      <div className="bg-white border-b-2 border-gray-900">
        <div className="max-w-5xl mx-auto grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 divide-y md:divide-y-0 divide-x-0 md:divide-x-2 divide-gray-200 md:divide-gray-900">
          {subMetrics.map((m) => (
            <div key={m.label} className="px-4 py-4">
              <p className="font-mono text-[10px] tracking-[0.15em] text-gray-400 uppercase">{m.label}</p>
              <p className="font-black leading-none mt-1" style={{ fontSize: "clamp(1.1rem, 2.5vw, 1.6rem)", color: m.color }}>{m.value}</p>
              <p className="italic text-sm text-gray-400 mt-1">{m.sub}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Body ── */}
      <div className="min-h-[60vh]" style={{ backgroundColor: "#ebedf0" }}>
        <div className="max-w-5xl mx-auto px-4 md:px-6 py-8 grid grid-cols-1 md:grid-cols-[1.4fr_1fr] gap-5">

          {/* Take Log */}
          <div>
            <div className="flex flex-wrap items-baseline gap-3 mb-3">
              <h2 className="font-black text-2xl tracking-tight">THE TAKE LOG</h2>
              {VERDICT_FILTERS.map((v) => (
                <Link
                  key={v}
                  href={`/experts/${id}?verdict=${v}`}
                  className={`px-3 py-1 font-mono text-[11px] tracking-widest uppercase border-2 transition-colors ${
                    verdict === v
                      ? "bg-gray-900 text-white border-gray-900"
                      : "bg-white text-gray-500 border-gray-300 hover:border-gray-600"
                  }`}
                >
                  {v}
                </Link>
              ))}
            </div>

            <div className="bg-white border-2 border-gray-900">
              {takes && takes.length > 0 ? takes.map((take, i) => {
                const v = verdictTag(take.outcome_status);
                const impact = gradeImpact(take.grade);
                const displayText = (take.summary ?? take.raw_text).replace(/^The analyst/i, "Analyst");
                const analysis = take.outcome_notes ?? take.grade_notes;
                return (
                  <div
                    key={take.take_id}
                    className="flex"
                    style={{ borderTop: i > 0 ? "1px dashed #d1d5db" : undefined }}
                  >
                    {/* Date */}
                    <div className="w-16 shrink-0 px-3 pt-4 font-mono text-[10px] tracking-wider text-gray-400 uppercase">
                      {new Date(take.date_made).toLocaleDateString("en-US", { month: "short", year: "2-digit" }).toUpperCase()}
                    </div>

                    {/* Take + analysis stacked */}
                    <div className="flex-1 min-w-0">
                      <div className="px-4 py-3.5" style={{ backgroundColor: "#f5f1e9" }}>
                        <p className="italic text-base leading-snug text-gray-800">
                          &ldquo;{displayText}&rdquo;
                        </p>
                      </div>
                      {analysis && (
                        <div className="px-4 py-3 border-t border-gray-200">
                          <p className="text-sm text-gray-600 leading-relaxed">{analysis}</p>
                        </div>
                      )}
                    </div>

                    {/* Verdict + impact */}
                    <div className="shrink-0 px-4 py-4 flex flex-col items-end gap-2">
                      <span
                        className="font-mono text-[10px] tracking-wider px-2 py-1 whitespace-nowrap font-semibold"
                        style={{ backgroundColor: v.bg, color: v.text }}
                      >
                        {v.label}
                      </span>
                      {impact != null ? (
                        <p className={`font-black text-lg ${impact.startsWith("+") ? "text-emerald-600" : "text-red-600"}`}>
                          {impact}
                        </p>
                      ) : (
                        <p className="font-black text-lg text-gray-300">—</p>
                      )}
                    </div>
                  </div>
                );
              }) : (
                <div className="px-4 py-12 text-center italic text-gray-400">
                  No takes found for this filter.
                </div>
              )}

              <div className="px-4 py-3 border-t-2 border-gray-900 flex items-center justify-between">
                <Link href={`/experts/${id}?verdict=all`} className="italic text-gray-500 hover:text-gray-900 text-sm transition-colors">
                  see all {expert.total_takes} takes
                </Link>
                <span className="font-black text-xl text-gray-400">→</span>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">

            {/* How TakeScore Works */}
            <div className="bg-white border-2 border-gray-900 p-5">
              <p className="font-mono text-[11px] tracking-[0.18em] text-gray-400 uppercase">How TakeScore Works</p>
              <p className="italic text-base leading-snug mt-3 text-gray-700">
                accuracy × boldness × volume, decayed over time, penalized for memory-holed takes.
              </p>
              <div className="mt-4 space-y-0">
                {scoreFormula.map((row) => (
                  <div key={row.k} className="flex justify-between items-baseline py-2 border-b border-dashed border-gray-200">
                    <span className="italic text-sm text-gray-600">{row.k}</span>
                    <span className="font-mono text-xs tracking-wider text-gray-900">{row.v}</span>
                  </div>
                ))}
              </div>
              <p className="mt-3 text-xs italic text-gray-400" style={{ color: "#e2241a" }}>
                show the formula. transparency = trust.
              </p>
            </div>

            {/* TakeScore Lifetime (placeholder sparkline) */}
            <div className="bg-white border-2 border-gray-900 p-5">
              <p className="font-mono text-[11px] tracking-[0.18em] text-gray-400 uppercase">TakeScore · Lifetime</p>
              <svg viewBox="0 0 320 90" className="w-full mt-3" style={{ height: 90 }}>
                <line x1="0" y1="75" x2="320" y2="75" stroke="#d1d5db" strokeDasharray="3 3" />
                <polyline
                  fill="none"
                  stroke="#1a1a1a"
                  strokeWidth="2"
                  points="0,70 40,65 80,68 120,55 160,52 200,44 240,38 280,30 320,22"
                />
                <circle cx="320" cy="22" r="4" fill="#e2241a" />
              </svg>
              <p className="italic text-sm text-gray-400 mt-2">
                {expert.overall_rating > 0
                  ? `Current TakeScore: ${Math.round(expert.overall_rating)}/100`
                  : "No TakeScore yet — submit and grade takes to build a record."}
              </p>
            </div>

          </div>
        </div>
      </div>

    </div>
  );
}
