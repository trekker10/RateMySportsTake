import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { notFound } from "next/navigation";
import Link from "next/link";
import FollowButton from "@/components/FollowButton";
import Avatar from "@/components/Avatar";
import { getTakeScoreConfig } from "@/app/actions/takescore";
import { scoreToGrade, gradeColor } from "@/lib/takescore";
import TakeLogSection from "./TakeLogSection";

const VERDICT_FILTERS = ["all", "right", "wrong", "pending"] as const;
type VerdictFilter = typeof VERDICT_FILTERS[number];

export default async function ExpertProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ verdict?: string; grade?: string }>;
}) {
  const { id } = await params;
  const { verdict: rawVerdict, grade: gradeParam } = await searchParams;
  const verdict: VerdictFilter = VERDICT_FILTERS.includes(rawVerdict as VerdictFilter)
    ? (rawVerdict as VerdictFilter)
    : "all";

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Load config first so we can use grade thresholds in the query
  const gradeConfig = await getTakeScoreConfig();

  // 5-category grade system: B groups B+/B/B−, C groups C+/C/C−
  const GRADE_CATS = ["A", "B", "C", "D", "F"] as const;
  type GradeCat = typeof GRADE_CATS[number];

  // Each category maps to a numeric range spanning all its sub-tiers
  // Fall back to hardcoded defaults so null DB values never break the filter
  function catRange(cat: GradeCat): { min: number; max: number } {
    const c = gradeConfig;
    const aMin      = c.grade_a_min      ?? 80;
    const bMinusMin = c.grade_bminus_min ?? 50;
    const cMinusMin = c.grade_cminus_min ?? 20;
    const dMin      = c.grade_d_min      ?? 10;
    if (cat === "A") return { min: aMin,      max: 101 };
    if (cat === "B") return { min: bMinusMin, max: aMin };
    if (cat === "C") return { min: cMinusMin, max: bMinusMin };
    if (cat === "D") return { min: dMin,      max: cMinusMin };
    return                  { min: 0,         max: dMin };
  }

  // Sub-tiers that belong to each category (for scoreToGrade matching)
  const CAT_SUBTIERS: Record<GradeCat, string[]> = {
    A: ["A"],
    B: ["B+", "B", "B−"],
    C: ["C+", "C", "C−"],
    D: ["D"],
    F: ["F"],
  };

  const activeGrade = GRADE_CATS.includes(gradeParam as GradeCat) ? (gradeParam as GradeCat) : null;

  // Build takes query — 4 initially, load more client-side
  const gradeRange = activeGrade ? catRange(activeGrade) : null;

  let takesQuery = supabase
    .from("takes")
    .select("take_id, date_made, raw_text, summary, outcome_status, outcome_notes, grade_notes, grade")
    .eq("expert_id", id)
    .order("date_made", { ascending: false })
    .limit(4);

  let countQuery = supabase
    .from("takes")
    .select("take_id", { count: "exact", head: true })
    .eq("expert_id", id);

  if (verdict === "right")   { takesQuery = takesQuery.eq("outcome_status", "confirmed_true");  countQuery = countQuery.eq("outcome_status", "confirmed_true"); }
  if (verdict === "wrong")   { takesQuery = takesQuery.in("outcome_status", ["confirmed_false", "partially_true"]); countQuery = countQuery.in("outcome_status", ["confirmed_false", "partially_true"]); }
  if (verdict === "pending") { takesQuery = takesQuery.eq("outcome_status", "pending"); countQuery = countQuery.eq("outcome_status", "pending"); }
  if (gradeRange) {
    takesQuery = takesQuery.gte("grade", gradeRange.min).lt("grade", gradeRange.max);
    countQuery  = countQuery.gte("grade", gradeRange.min).lt("grade", gradeRange.max);
  }

  const [
    { data: expert },
    { data: takes },
    { count: filteredCount },
    { data: allExperts },
    { data: followRow },
    { data: allGradedTakes },
    { data: fantasyTakes },
  ] = await Promise.all([
    supabase.from("experts").select("*").eq("expert_id", id).single(),
    takesQuery,
    countQuery,
    supabase.from("experts").select("expert_id, overall_rating").gt("overall_rating", 0).order("overall_rating", { ascending: false }),
    user
      ? supabase.from("follows").select("user_id").eq("user_id", user.id).eq("expert_id", id).maybeSingle()
      : Promise.resolve({ data: null }),
    supabase.from("takes").select("grade").eq("expert_id", id).not("grade", "is", null),
    createAdminClient().from("fantasy_takes").select("fantasy_take_id, category, raw_text, player_name, player_position, timing_window, boldness_score, outcome_status, accuracy_score, date_made, resolution_date, sport_season").eq("expert_id", id).order("date_made", { ascending: false }),
  ]);

  if (!expert) notFound();

  // Build 5-bucket distribution (B and C aggregate their sub-tiers)
  const distribution = GRADE_CATS.map(cat => ({
    cat,
    count: (allGradedTakes ?? []).filter(t =>
      t.grade != null && CAT_SUBTIERS[cat].includes(scoreToGrade(t.grade, gradeConfig))
    ).length,
  }));
  const maxDistCount = Math.max(...distribution.map(d => d.count), 1);

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
    ...(expert.is_fantasy_guru && expert.fantasy_overall_rating > 0
      ? [{ label: "FANTASY SCORE", value: scoreToGrade(expert.fantasy_overall_rating, gradeConfig), sub: "fantasy guru rating", color: "#15803d" }]
      : []),
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
              <div className="mt-3 mb-1">
                <FollowButton expertId={expert.expert_id} initialFollowing={!!followRow} isLoggedIn={!!user} />
              </div>
              <div className="flex items-baseline gap-2 mt-3">
                <span className="font-mono text-[9px] tracking-widest text-gray-400 uppercase">TakeScore</span>
                <span className="font-black text-2xl leading-none" style={{ color: expert.overall_rating > 0 ? gradeColor(scoreToGrade(expert.overall_rating, gradeConfig)) : "#9ca3af" }}>
                  {expert.overall_rating > 0 ? scoreToGrade(expert.overall_rating, gradeConfig) : "—"}
                </span>
                {rank > 0 && <span className="font-mono text-[10px] text-gray-400">#{rank}</span>}
              </div>
              {expert.is_fantasy_guru && expert.fantasy_overall_rating > 0 && (
                <div className="flex items-baseline gap-2 mt-1.5">
                  <span className="font-mono text-[9px] tracking-widest uppercase" style={{ color: "#15803d" }}>Fantasy TakeScore</span>
                  <span className="font-black text-xl leading-none" style={{ color: "#15803d" }}>
                    {scoreToGrade(expert.fantasy_overall_rating, gradeConfig)}
                  </span>
                </div>
              )}
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
            <div className="mt-5">
              <FollowButton expertId={expert.expert_id} initialFollowing={!!followRow} isLoggedIn={!!user} />
            </div>
          </div>

          <div className="border-l-2 border-gray-900 px-6 py-6 flex flex-col justify-center" style={{ backgroundColor: "#f5f1e8" }}>
            <p className="font-mono text-[11px] tracking-[0.22em] text-gray-400 uppercase">TakeScore</p>
            <p className="font-black leading-none mt-1" style={{ fontSize: "clamp(4rem, 6vw, 6.5rem)", color: expert.overall_rating > 0 ? gradeColor(scoreToGrade(expert.overall_rating, gradeConfig)) : "#9ca3af" }}>
              {expert.overall_rating > 0 ? scoreToGrade(expert.overall_rating, gradeConfig) : "—"}
            </p>
            {rank > 0 && <p className="italic text-gray-500 mt-2 text-sm">ranked {rankLabel} overall.</p>}
            {expert.is_fantasy_guru && expert.fantasy_overall_rating > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-300">
                <p className="font-mono text-[10px] tracking-[0.18em] uppercase" style={{ color: "#15803d" }}>Fantasy TakeScore</p>
                <p className="font-black leading-none mt-1" style={{ fontSize: "clamp(2.5rem, 4vw, 4rem)", color: "#15803d" }}>
                  {scoreToGrade(expert.fantasy_overall_rating, gradeConfig)}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Sub-metric bar ── */}
      <div className="bg-white border-b-2 border-gray-900">
        <div className={`max-w-5xl mx-auto grid grid-cols-2 sm:grid-cols-3 ${subMetrics.length > 5 ? "md:grid-cols-6" : "md:grid-cols-5"} divide-y md:divide-y-0 divide-x-0 md:divide-x-2 divide-gray-200 md:divide-gray-900`}>
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
              {VERDICT_FILTERS.map((v) => {
                const href = activeGrade
                  ? `/experts/${id}?verdict=${v}&grade=${encodeURIComponent(activeGrade)}`
                  : `/experts/${id}?verdict=${v}`;
                return (
                  <Link
                    key={v}
                    href={href}
                    className={`px-3 py-1 font-mono text-[11px] tracking-widest uppercase border-2 transition-colors ${
                      verdict === v
                        ? "bg-gray-900 text-white border-gray-900"
                        : "bg-white text-gray-500 border-gray-300 hover:border-gray-600"
                    }`}
                  >
                    {v}
                  </Link>
                );
              })}
              {activeGrade && (
                <Link
                  href={`/experts/${id}?verdict=${verdict}`}
                  className="px-3 py-1 font-mono text-[11px] tracking-widest uppercase border-2 border-red-400 text-red-600 bg-red-50 hover:bg-red-100 transition-colors"
                >
                  GRADE: {activeGrade} ×
                </Link>
              )}
            </div>

            <TakeLogSection
              expertId={id}
              initialTakes={(takes ?? []) as import("@/app/actions/takes").ProfileTake[]}
              totalTakes={filteredCount ?? 0}
              verdict={verdict}
              gradeMin={gradeRange?.min ?? null}
              gradeMax={gradeRange?.max ?? null}
              activeGrade={activeGrade}
            />
          </div>

          {/* Sidebar */}
          <div className="space-y-4">

            {/* Grade Distribution */}
            <div className="bg-white border-2 border-gray-900 p-5">
              <p className="font-mono text-[11px] tracking-[0.18em] text-gray-400 uppercase mb-4">Grade Distribution</p>
              {distribution.every(d => d.count === 0) ? (
                <p className="italic text-sm text-gray-400">No graded takes yet.</p>
              ) : (
                <div className="space-y-2">
                  {distribution.map(({ cat, count }) => {
                    const barPct = count > 0 ? Math.round((count / maxDistCount) * 100) : 0;
                    const isActive = activeGrade === cat;
                    const href = isActive
                      ? `/experts/${id}${verdict !== "all" ? `?verdict=${verdict}` : ""}`
                      : `/experts/${id}?grade=${encodeURIComponent(cat)}${verdict !== "all" ? `&verdict=${verdict}` : ""}`;
                    return (
                      <Link
                        key={cat}
                        href={href}
                        className={`flex items-center gap-3 group transition-opacity ${count === 0 ? "pointer-events-none opacity-30" : ""}`}
                      >
                        <span className={`w-6 font-mono text-xs text-right shrink-0 ${isActive ? "font-black text-gray-900" : "text-gray-500"}`}>
                          {cat}
                        </span>
                        <div className="flex-1 bg-gray-100 h-5 rounded-sm overflow-hidden">
                          <div
                            className="h-full rounded-sm transition-all"
                            style={{ width: `${barPct}%`, backgroundColor: isActive ? "#991b1b" : "#e2241a" }}
                          />
                        </div>
                        <span className={`w-7 font-black text-sm text-right shrink-0 ${isActive ? "text-gray-900" : "text-gray-600"}`}>
                          {count}
                        </span>
                      </Link>
                    );
                  })}
                </div>
              )}
              {activeGrade && (
                <p className="mt-3 text-[10px] font-mono text-gray-400 uppercase tracking-wider">
                  Showing {activeGrade}-grade takes · <Link href={`/experts/${id}`} className="underline hover:text-gray-600">clear</Link>
                </p>
              )}
            </div>

            {/* Fantasy Takes */}
            {(fantasyTakes ?? []).length > 0 && (
              <div className="bg-white border-2 p-5" style={{ borderColor: "#15803d" }}>
                <p className="font-mono text-[11px] tracking-[0.18em] uppercase mb-4" style={{ color: "#15803d" }}>Fantasy Takes</p>
                <div className="space-y-3">
                  {(fantasyTakes ?? []).map((ft) => {
                    const CATEGORY_LABELS: Record<string, string> = {
                      breakout_call: "Breakout Call", bust_call: "Bust Call",
                      sleeper_pick: "Sleeper Pick", start_sit: "Start/Sit", waiver_add: "Waiver Add",
                    };
                    const STATUS_COLORS: Record<string, string> = {
                      pending: "#d97706", resolved: "#15803d",
                    };
                    return (
                      <div key={ft.fantasy_take_id} className="border border-gray-100 rounded-lg p-3 space-y-1.5">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-mono text-[10px] tracking-wider px-2 py-0.5 rounded-full text-white text-xs" style={{ backgroundColor: "#15803d" }}>
                            {CATEGORY_LABELS[ft.category] ?? ft.category}
                          </span>
                          <span className="font-mono text-[10px] font-black" style={{ color: STATUS_COLORS[ft.outcome_status] ?? "#6b7280" }}>
                            {ft.outcome_status === "resolved"
                              ? ft.accuracy_score != null ? `${ft.accuracy_score}% ACC` : "RESOLVED"
                              : "PENDING"}
                          </span>
                        </div>
                        {ft.player_name && (
                          <p className="font-semibold text-sm text-gray-900">
                            {ft.player_name}{ft.player_position ? ` · ${ft.player_position}` : ""}
                          </p>
                        )}
                        <p className="text-xs text-gray-600 leading-relaxed line-clamp-2">"{ft.raw_text}"</p>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[10px] font-mono text-gray-400">{ft.date_made}</span>
                          {ft.timing_window && (
                            <span className="text-[10px] font-mono text-gray-400">· {ft.timing_window.replace(/_/g, " ")}</span>
                          )}
                          {ft.sport_season && (
                            <span className="text-[10px] font-mono text-gray-400">· {ft.sport_season}</span>
                          )}
                          {(ft as any).format && (ft as any).format !== "both" && (
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded" style={{ backgroundColor: (ft as any).format === "dynasty" ? "#ede9fe" : "#e0f2fe", color: (ft as any).format === "dynasty" ? "#7c3aed" : "#0284c7" }}>
                              {(ft as any).format}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

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
                  ? `Current TakeScore: ${scoreToGrade(expert.overall_rating, gradeConfig)}`
                  : "No TakeScore yet — submit and grade takes to build a record."}
              </p>
            </div>

          </div>
        </div>
      </div>

    </div>
  );
}
