import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import HeroSection from "@/components/HeroSection";
import Avatar from "@/components/Avatar";
import LeaderboardRibbon from "@/components/LeaderboardRibbon";
import { getTakeScoreConfig } from "@/app/actions/takescore";
import { scoreToGrade, gradeColor } from "@/lib/takescore";

function verdictInfo(status: string) {
  if (status === "confirmed_true")  return { label: "RIGHT.",       color: "#0a7a3b" };
  if (status === "confirmed_false") return { label: "WRONG.",       color: "#e2241a" };
  if (status === "partially_true")  return { label: "PARTLY RIGHT.", color: "#d97706" };
  return { label: "UNRESOLVABLE.", color: "#6b7280" };
}

export default async function HomePage() {
  const supabase = await createClient();
  const gradeConfig = await getTakeScoreConfig();

  const [{ data: rankedExperts }, { data: featuredTakes }] = await Promise.all([
    supabase
      .from("experts")
      .select("expert_id, name, outlet, sport_focus, avatar_url, overall_rating, total_takes")
      .eq("verified", true)
      .gt("overall_rating", 0)
      .order("overall_rating", { ascending: false }),
    supabase
      .from("takes")
      .select("take_id, raw_text, summary, grade, outcome_status, outcome_notes, date_made, expert_id, experts(name, outlet, expert_id)")
      .not("grade", "is", null)
      .neq("outcome_status", "pending")
      .not("outcome_status", "is", null)
      .order("outcome_date", { ascending: false, nullsFirst: false })
      .limit(1),
  ]);

  const total = rankedExperts?.length ?? 0;
  const topFive   = (rankedExperts ?? []).slice(0, 5).map((e, i) => ({ ...e, rank: i + 1 }));
  const bottomFive = [...(rankedExperts ?? [])].slice(-5).reverse().map((e, i) => ({ ...e, rank: total - i }));
  const featured = featuredTakes?.[0] ?? null;

  return (
    <div className="w-screen relative left-1/2 -translate-x-1/2 -mt-10">

      {/* ── Hero ── */}
      <div className="border-b-2 border-gray-900" style={{ backgroundColor: "#f5f1e8" }}>
        <div className="max-w-5xl mx-auto px-6 py-14 max-sm:pb-16">
          <p className="font-mono text-xs tracking-[0.2em] uppercase max-sm:mb-6" style={{ color: "#e2241a" }}>
            ━━ THE SPORTS ACCOUNTABILITY INDEX
          </p>

          <HeroSection />
        </div>
      </div>

      {/* ── Leaderboard Ribbon ── */}
      <LeaderboardRibbon experts={rankedExperts ?? []} gradeConfig={gradeConfig} />

      {/* ── How It Works ── */}
      <div className="border-b-2 border-gray-900" style={{ backgroundColor: "#1a1a1a" }}>
        <div className="max-w-7xl mx-auto px-6 pt-12 pb-0 max-sm:pt-16 max-sm:pb-16">
          {/* Section header */}
          <h2 className="font-black italic leading-none tracking-tighter text-white pb-6 border-b border-dashed border-gray-600"
            style={{ fontSize: "clamp(2rem, 6vw, 4rem)" }}>
            HOW IT <span style={{ color: "#e2241a" }}>WORKS.</span>
          </h2>

          {/* Steps grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x border-dashed border-gray-600">

            {/* Step 01 */}
            <div className="relative px-0 md:pr-10 py-10">
              {/* Arrow connector */}
              <div className="hidden md:flex absolute -right-5 top-1/2 -translate-y-1/2 z-10 w-10 h-10 border-2 border-gray-500 items-center justify-center font-black text-white text-base" style={{ backgroundColor: "#1a1a1a" }}>
                →
              </div>
              <div className="flex items-start gap-3 mb-6">
                <span
                  className="font-black italic leading-none select-none"
                  style={{
                    fontSize: "clamp(4rem, 8vw, 7rem)",
                    WebkitTextStroke: "2px #e2241a",
                    WebkitTextFillColor: "transparent",
                    lineHeight: 0.85,
                  } as React.CSSProperties}
                >
                  01
                </span>
                <span className="font-mono text-[9px] tracking-[0.2em] text-gray-500 uppercase mt-1" style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}>
                  STEP 01
                </span>
              </div>
              <h3 className="font-black italic leading-tight tracking-tighter text-white mb-4"
                style={{ fontSize: "clamp(1.4rem, 2.8vw, 2rem)" }}>
                THE TAKE<br />IS MADE.
              </h3>
              <div className="w-8 h-0.5 bg-gray-500 mb-4" />
              <p className="text-gray-400 leading-relaxed text-base">
                Every bold prediction from the biggest voices in sports media gets logged the moment they say it.
              </p>
            </div>

            {/* Step 02 */}
            <div className="relative px-0 md:px-10 py-10">
              <div className="hidden md:flex absolute -right-5 top-1/2 -translate-y-1/2 z-10 w-10 h-10 border-2 border-gray-500 items-center justify-center font-black text-white text-base" style={{ backgroundColor: "#1a1a1a" }}>
                →
              </div>
              <div className="flex items-start gap-3 mb-6">
                <span
                  className="font-black italic leading-none select-none"
                  style={{
                    fontSize: "clamp(4rem, 8vw, 7rem)",
                    WebkitTextStroke: "2px #e2241a",
                    WebkitTextFillColor: "transparent",
                    lineHeight: 0.85,
                  } as React.CSSProperties}
                >
                  02
                </span>
                <span className="font-mono text-[9px] tracking-[0.2em] text-gray-500 uppercase mt-1" style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}>
                  STEP 02
                </span>
              </div>
              <h3 className="font-black italic leading-tight tracking-tighter text-white mb-4"
                style={{ fontSize: "clamp(1.4rem, 2.8vw, 2rem)" }}>
                THE TAKE<br />GETS RATED.
              </h3>
              <div className="w-8 h-0.5 bg-gray-500 mb-4" />
              <p className="text-gray-400 leading-relaxed text-base">
                When it resolves, we grade it — factoring in accuracy and how bold it was at the time. Calling a longshot in preseason hits different than jumping on the bandwagon the week before the championship.
              </p>
            </div>

            {/* Step 03 */}
            <div className="px-0 md:pl-10 py-10">
              <div className="flex items-start gap-3 mb-6">
                <span
                  className="font-black italic leading-none select-none"
                  style={{
                    fontSize: "clamp(4rem, 8vw, 7rem)",
                    WebkitTextStroke: "2px #e2241a",
                    WebkitTextFillColor: "transparent",
                    lineHeight: 0.85,
                  } as React.CSSProperties}
                >
                  03
                </span>
                <span className="font-mono text-[9px] tracking-[0.2em] text-gray-500 uppercase mt-1" style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}>
                  STEP 03
                </span>
              </div>
              <h3 className="font-black italic leading-tight tracking-tighter text-white mb-4"
                style={{ fontSize: "clamp(1.4rem, 2.8vw, 2rem)" }}>
                THE SCORE<br />UPDATES.
              </h3>
              <div className="w-8 h-0.5 bg-gray-500 mb-4" />
              <p className="text-gray-400 leading-relaxed text-base">
                Every graded take feeds into that analyst&apos;s overall TakeScore — a rolling 0–100 rating of how sharp they really are. Recent takes carry more weight. Go quiet and your score decays. Spam safe takes and the formula knows. The best analysts rise. The noise merchants fall. The tape doesn&apos;t lie.
              </p>
            </div>

          </div>
        </div>
      </div>

      {/* ── Score panels ── */}
      <div className="bg-white border-b-2 border-gray-900 grid grid-cols-1 md:grid-cols-3 divide-y-2 md:divide-y-0 md:divide-x-2 divide-gray-900">

        {/* Left: Top Analysts */}
        <div className="px-7 py-9 max-sm:px-6 max-sm:py-16">
          <p className="font-black text-2xl tracking-tight" style={{ color: "#0a7a3b" }}>↑ TOP ANALYSTS</p>
          <p className="font-mono text-[10px] tracking-[0.14em] text-gray-400 uppercase mt-1">WEEK ON WEEK · TOP 5</p>
          <div className="mt-5">
            {topFive.length > 0 ? topFive.map((e, i) => (
              <Link
                key={e.expert_id}
                href={`/experts/${e.expert_id}`}
                className="flex items-center gap-3 py-3.5 hover:bg-gray-50 -mx-2 px-2 transition-colors"
                style={{ borderTop: i > 0 ? "1px dashed #d1d5db" : undefined }}
              >
                <span className="font-black text-2xl w-9 shrink-0 text-gray-300">{String(e.rank).padStart(2, "0")}</span>
                <div className="w-9 h-9 rounded-full bg-gray-200 shrink-0 overflow-hidden flex items-center justify-center text-xs font-bold text-gray-600">
                  <Avatar name={e.name} avatarUrl={e.avatar_url} className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-black text-sm uppercase tracking-tight truncate">{e.name}</p>
                  <p className="font-mono text-[9px] tracking-wider text-gray-400 uppercase truncate">{e.outlet ?? "—"}</p>
                </div>
                <span className="font-black text-2xl" style={{ color: gradeColor(scoreToGrade(e.overall_rating, gradeConfig)) }}>{scoreToGrade(e.overall_rating, gradeConfig)}</span>
              </Link>
            )) : (
              <p className="mt-6 text-gray-400 italic">No ranked analysts yet.</p>
            )}
          </div>
          <div className="mt-4 pt-4 border-t-2 border-gray-900 flex justify-between items-center">
            <Link href="/experts" className="text-base italic text-gray-500 hover:text-gray-900">see full leaderboard</Link>
            <span className="font-black text-xl">→</span>
          </div>
        </div>

        {/* Center: Take of the Night */}
        <div className="px-10 py-9 max-sm:px-6 max-sm:py-16">
          <p className="font-mono text-[11px] tracking-[0.24em] uppercase" style={{ color: "#e2241a" }}>
            TAKE OF THE NIGHT
          </p>

          {featured ? (() => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const expert = featured.experts as any;
            const v = verdictInfo(featured.outcome_status);
            return (
              <>
                <blockquote className="mt-5 font-black italic leading-tight tracking-tight text-gray-900 text-[1.55rem]">
                  &ldquo;{featured.summary ?? featured.raw_text}&rdquo;
                </blockquote>
                <p className="mt-3 text-lg italic text-gray-500">
                  — {expert?.name}{expert?.outlet ? `, ${expert.outlet}` : ""}
                </p>
                {featured.date_made && (
                  <p className="mt-1 font-mono text-[10px] tracking-[0.14em] text-gray-400 uppercase">
                    Prediction made · {new Date(featured.date_made).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                  </p>
                )}
                <div className="mt-8 flex items-end gap-6">
                  <div>
                    <p className="font-mono text-[10px] tracking-[0.14em] text-gray-400 uppercase">VERDICT</p>
                    <p className="font-black italic mt-2 leading-none" style={{ fontSize: "3.25rem", color: v.color }}>
                      {v.label}
                    </p>
                    {featured.outcome_notes && (
                      <p className="mt-2 text-base text-gray-500 italic">{featured.outcome_notes}</p>
                    )}
                  </div>
                  {featured.grade != null && (
                    <div className="ml-auto text-right">
                      <p className="font-mono text-[10px] tracking-[0.14em] text-gray-400 uppercase">GRADE</p>
                      <p className="font-black mt-1 leading-none" style={{ fontSize: "4rem", color: gradeColor(scoreToGrade(featured.grade, gradeConfig)) }}>
                        {scoreToGrade(featured.grade, gradeConfig)}
                      </p>
                    </div>
                  )}
                </div>
                <div className="mt-7 flex gap-3">
                  {expert?.expert_id && (
                    <Link
                      href={`/experts/${expert.expert_id}`}
                      className="px-4 py-2.5 font-mono text-[11px] tracking-wider text-white"
                      style={{ backgroundColor: "#e2241a" }}
                    >
                      SEE THE EVIDENCE →
                    </Link>
                  )}
                  <Link href="/takes" className="px-4 py-2.5 border border-gray-300 font-mono text-[11px] tracking-wider text-gray-600 hover:border-gray-500 transition-colors">
                    ALL TAKES
                  </Link>
                </div>
              </>
            );
          })() : (
            <div className="mt-10 text-center">
              <p className="font-black italic text-4xl text-gray-200">NO TAKES GRADED YET.</p>
              <p className="mt-4 text-gray-400">Submit and grade takes to see them here.</p>
              <Link href="/submit" className="mt-6 inline-block px-5 py-3 font-mono text-xs tracking-wider text-white" style={{ backgroundColor: "#e2241a" }}>
                SUBMIT A TAKE →
              </Link>
            </div>
          )}
        </div>

        {/* Right: Bottom 10 */}
        <div className="px-7 py-9 max-sm:px-6 max-sm:py-16">
          <p className="font-black text-2xl tracking-tight" style={{ color: "#e2241a" }}>↓ BOTTOM 10</p>
          <p className="font-mono text-[10px] tracking-[0.14em] text-gray-400 uppercase mt-1">WEEK ON WEEK · BOTTOM 5</p>
          <div className="mt-5">
            {bottomFive.length > 0 ? bottomFive.map((e, i) => (
              <Link
                key={e.expert_id}
                href={`/experts/${e.expert_id}`}
                className="flex items-center gap-3 py-3.5 hover:bg-gray-50 -mx-2 px-2 transition-colors"
                style={{ borderTop: i > 0 ? "1px dashed #d1d5db" : undefined }}
              >
                <span className="font-black text-2xl w-9 shrink-0 text-gray-300">{String(e.rank).padStart(2, "0")}</span>
                <div className="w-9 h-9 rounded-full bg-gray-200 shrink-0 overflow-hidden flex items-center justify-center text-xs font-bold text-gray-600">
                  <Avatar name={e.name} avatarUrl={e.avatar_url} className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-black text-sm uppercase tracking-tight truncate">{e.name}</p>
                  <p className="font-mono text-[9px] tracking-wider text-gray-400 uppercase truncate">{e.outlet ?? "—"}</p>
                </div>
                <span className="font-black text-2xl" style={{ color: gradeColor(scoreToGrade(e.overall_rating, gradeConfig)) }}>{scoreToGrade(e.overall_rating, gradeConfig)}</span>
              </Link>
            )) : (
              <p className="mt-6 text-gray-400 italic">Not enough ranked analysts yet.</p>
            )}
          </div>
        </div>

      </div>

      {/* ── Marquee ── */}
      <div className="bg-white border-t-2 border-gray-900 py-4 overflow-hidden">
        <div className="flex whitespace-nowrap animate-marquee">
          <span className="font-black italic text-xl text-gray-900 pr-20">
            ★ EVERY TAKE LOGGED ★ EVERY TAKE GRADED ★ NO TAKE FORGOTTEN ★ EVERY TAKE LOGGED ★ EVERY TAKE GRADED ★ NO TAKE FORGOTTEN ★
          </span>
          <span className="font-black italic text-xl text-gray-900 pr-20" aria-hidden>
            ★ EVERY TAKE LOGGED ★ EVERY TAKE GRADED ★ NO TAKE FORGOTTEN ★ EVERY TAKE LOGGED ★ EVERY TAKE GRADED ★ NO TAKE FORGOTTEN ★
          </span>
        </div>
      </div>

    </div>
  );
}
