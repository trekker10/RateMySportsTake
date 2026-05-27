import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { computeAccolades } from "@/lib/accolades";
import type { Accolade } from "@/lib/accolades";
import Avatar from "@/components/Avatar";
import { getTakeScoreConfig } from "@/app/actions/takescore";
import { scoreToGrade, gradeColor } from "@/lib/takescore";

export default async function ExpertsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const supabase = await createClient();
  const gradeConfig = await getTakeScoreConfig();

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];

  let expertsQuery = supabase.from("experts").select("*").eq("verified", true).order("overall_rating", { ascending: false });
  if (q) {
    expertsQuery = expertsQuery.or(`name.ilike.%${q}%,outlet.ilike.%${q}%`);
  }

  const [{ data: experts }, { data: recentTakes }] = await Promise.all([
    expertsQuery,
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

  const rows = (experts ?? []).map((e, i) => ({
    ...e,
    rank: i + 1,
    accolades: computeAccolades(e.expert_id, e.overall_rating, allExpertSnaps, recentTakes ?? []),
  }));

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <p className="font-mono text-[11px] tracking-[0.22em] text-gray-400 uppercase">The Index · Default View</p>
          <h1 className="text-4xl font-black tracking-tight mt-1">
            TOP ANALYSTS{" "}
            <span style={{ color: "#e2241a" }}>· LEADERBOARD</span>
          </h1>
          <p className="mt-1 italic text-gray-500">
            {experts?.length ?? 0} expert{experts?.length !== 1 ? "s" : ""}
            {q ? ` matching "${q}"` : " tracked · ranked by TakeScore"}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {["ALL SPORTS", "NBA", "NFL", "MLB", "NHL"].map((s, i) => (
            <span
              key={s}
              className={`px-3 py-1 font-mono text-[11px] tracking-wider border ${
                i === 0
                  ? "bg-gray-900 text-white border-gray-900"
                  : "bg-white text-gray-500 border-gray-300"
              }`}
            >
              {s}
            </span>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="border-2 border-gray-900 overflow-hidden">

        {/* Header row — desktop only */}
        <div className="hidden md:grid items-center px-4 py-2.5 bg-gray-900 text-white"
          style={{ gridTemplateColumns: "56px 1fr 150px 80px 110px" }}>
          <div className="font-mono text-[10px] tracking-[0.15em]">RANK</div>
          <div className="font-mono text-[10px] tracking-[0.15em]">ANALYST</div>
          <div className="font-mono text-[10px] tracking-[0.15em]">OUTLET</div>
          <div className="font-mono text-[10px] tracking-[0.15em]">TAKES</div>
          <div className="font-mono text-[10px] tracking-[0.15em]">TAKESCORE</div>
        </div>
        {/* Mobile header */}
        <div className="grid md:hidden items-center px-4 py-2.5 bg-gray-900 text-white"
          style={{ gridTemplateColumns: "44px 1fr 80px" }}>
          <div className="font-mono text-[10px] tracking-[0.15em]">RK</div>
          <div className="font-mono text-[10px] tracking-[0.15em]">ANALYST</div>
          <div className="font-mono text-[10px] tracking-[0.15em]">SCORE</div>
        </div>

        {rows.length > 0 ? rows.map((e, i) => (
          <Link key={e.expert_id} href={`/experts/${e.expert_id}`} className="block">
            {/* Desktop row */}
            <div
              className="hidden md:grid items-center px-4 py-3.5 hover:bg-gray-50 transition-colors"
              style={{
                gridTemplateColumns: "56px 1fr 150px 80px 110px",
                borderTop: "1px dashed #d1d5db",
                backgroundColor: i % 2 === 1 ? "#fafafa" : "#ffffff",
              }}
            >
              <div className="font-black text-[2rem] leading-none" style={{ color: e.rank <= 3 ? "#e2241a" : "#d1d5db" }}>
                {String(e.rank).padStart(2, "0")}
              </div>
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-full bg-gray-200 shrink-0 overflow-hidden flex items-center justify-center text-xs font-bold text-gray-600">
                  <Avatar name={e.name} avatarUrl={e.avatar_url} className="w-full h-full object-cover" />
                </div>
                <div className="min-w-0">
                  <p className="font-black text-base uppercase tracking-tight truncate">{e.name}</p>
                  {e.bio && <p className="text-sm italic text-gray-400 truncate max-w-[280px]">{e.bio}</p>}
                  {e.accolades.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {e.accolades.map((a: Accolade) => (
                        <span key={a.label} className={`rounded-full px-2 py-0.5 text-[10px] ${a.className}`}>{a.emoji} {a.label}</span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div>
                <p className="font-mono text-xs tracking-wider text-gray-700 uppercase truncate">{e.outlet ?? "—"}</p>
                {e.sport_focus?.length > 0 && <p className="font-mono text-[9px] text-gray-400 tracking-wider truncate">{e.sport_focus.join(", ")}</p>}
              </div>
              <div className="font-black text-xl text-gray-900">{e.total_takes}</div>
              <div className="font-black text-2xl" style={{ color: e.overall_rating > 0 ? gradeColor(scoreToGrade(e.overall_rating, gradeConfig)) : "#9ca3af" }}>{e.overall_rating > 0 ? scoreToGrade(e.overall_rating, gradeConfig) : "—"}</div>
            </div>

            {/* Mobile row */}
            <div
              className="md:hidden flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors"
              style={{ borderTop: "1px dashed #d1d5db", backgroundColor: i % 2 === 1 ? "#fafafa" : "#ffffff" }}
            >
              <span className="font-black text-xl w-9 shrink-0 leading-none" style={{ color: e.rank <= 3 ? "#e2241a" : "#d1d5db" }}>
                {String(e.rank).padStart(2, "0")}
              </span>
              <div className="w-9 h-9 rounded-full bg-gray-200 shrink-0 overflow-hidden flex items-center justify-center text-xs font-bold text-gray-600">
                <Avatar name={e.name} avatarUrl={e.avatar_url} className="w-full h-full object-cover" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-black text-sm uppercase tracking-tight truncate">{e.name}</p>
                <p className="font-mono text-[9px] text-gray-400 tracking-wider truncate">{e.outlet ?? e.sport_focus?.[0] ?? "—"}</p>
              </div>
              <span className="font-black text-2xl shrink-0" style={{ color: e.overall_rating > 0 ? gradeColor(scoreToGrade(e.overall_rating, gradeConfig)) : "#9ca3af" }}>
                {e.overall_rating > 0 ? scoreToGrade(e.overall_rating, gradeConfig) : "—"}
              </span>
            </div>
          </Link>
        )) : (
          <div className="px-4 py-12 text-center text-gray-400">
            No experts yet — they&apos;re created automatically when you submit a take.
          </div>
        )}
      </div>
    </div>
  );
}
