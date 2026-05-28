import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { computeAccolades } from "@/lib/accolades";
import type { Accolade } from "@/lib/accolades";
import Avatar from "@/components/Avatar";
import { getTakeScoreConfig } from "@/app/actions/takescore";
import { scoreToGrade, gradeColor } from "@/lib/takescore";

const GREEN = "#15803d";

export default async function FantasyPage({
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

  let expertsQuery = supabase
    .from("experts")
    .select("*")
    .eq("verified", true)
    .eq("is_fantasy_guru", true)
    .order("overall_rating", { ascending: false });

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
          <p className="font-mono text-[11px] tracking-[0.22em] uppercase" style={{ color: GREEN }}>
            The Index · Fantasy Edition
          </p>
          <h1 className="text-4xl font-black tracking-tight mt-1">
            TOP GURUS{" "}
            <span style={{ color: GREEN }}>· LEADERBOARD</span>
          </h1>
          <p className="mt-1 italic text-gray-500">
            {experts?.length ?? 0} fantasy guru{experts?.length !== 1 ? "s" : ""}
            {q ? ` matching "${q}"` : " tracked · ranked by TakeScore"}
          </p>
        </div>

        {/* Search */}
        <form method="GET" className="flex gap-2">
          <div className="flex items-stretch border-2 bg-white" style={{ borderColor: "#1a1a1a" }}>
            <div className="flex items-center px-3 border-r-2" style={{ borderColor: "#1a1a1a" }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" />
              </svg>
            </div>
            <input
              name="q"
              defaultValue={q ?? ""}
              placeholder="search gurus…"
              className="px-3 py-2 bg-transparent text-sm text-gray-900 placeholder-gray-400 focus:outline-none w-48"
            />
          </div>
          <button type="submit" className="px-4 py-2 font-mono text-[11px] tracking-widest text-white font-black" style={{ backgroundColor: GREEN }}>
            SEARCH
          </button>
        </form>
      </div>

      {/* Tab switcher */}
      <div className="flex gap-0 border-b-2 border-gray-900">
        <Link
          href="/experts"
          className="px-5 py-2.5 font-mono text-[11px] tracking-widest uppercase text-gray-500 hover:text-gray-900 transition-colors border-b-2 border-transparent hover:border-gray-400 -mb-0.5"
        >
          Analysts
        </Link>
        <div
          className="px-5 py-2.5 font-mono text-[11px] tracking-widest uppercase font-black -mb-0.5 border-b-2"
          style={{ color: GREEN, borderColor: GREEN }}
        >
          Fantasy Gurus
        </div>
      </div>

      {/* Table */}
      <div className="border-2 border-gray-900 overflow-hidden">

        {/* Desktop header */}
        <div
          className="hidden md:grid items-center px-4 py-2.5 text-white"
          style={{ gridTemplateColumns: "56px 1fr 150px 80px 110px", backgroundColor: GREEN }}
        >
          <div className="font-mono text-[10px] tracking-[0.15em]">RANK</div>
          <div className="font-mono text-[10px] tracking-[0.15em]">GURU</div>
          <div className="font-mono text-[10px] tracking-[0.15em]">PLATFORM</div>
          <div className="font-mono text-[10px] tracking-[0.15em]">TAKES</div>
          <div className="font-mono text-[10px] tracking-[0.15em]">TAKESCORE</div>
        </div>
        {/* Mobile header */}
        <div
          className="grid md:hidden items-center px-4 py-2.5 text-white"
          style={{ gridTemplateColumns: "44px 1fr 80px", backgroundColor: GREEN }}
        >
          <div className="font-mono text-[10px] tracking-[0.15em]">RK</div>
          <div className="font-mono text-[10px] tracking-[0.15em]">GURU</div>
          <div className="font-mono text-[10px] tracking-[0.15em]">SCORE</div>
        </div>

        {rows.length > 0 ? rows.map((e, i) => (
          <Link key={e.expert_id} href={`/experts/${e.expert_id}`} className="block">
            {/* Desktop row */}
            <div
              className="hidden md:grid items-center px-4 py-3.5 hover:bg-green-50 transition-colors"
              style={{
                gridTemplateColumns: "56px 1fr 150px 80px 110px",
                borderTop: "1px dashed #d1d5db",
                backgroundColor: i % 2 === 1 ? "#fafafa" : "#ffffff",
              }}
            >
              <div className="font-black text-[2rem] leading-none" style={{ color: e.rank <= 3 ? GREEN : "#d1d5db" }}>
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
              <div className="font-black text-2xl" style={{ color: e.overall_rating > 0 ? gradeColor(scoreToGrade(e.overall_rating, gradeConfig)) : "#9ca3af" }}>
                {e.overall_rating > 0 ? scoreToGrade(e.overall_rating, gradeConfig) : "—"}
              </div>
            </div>

            {/* Mobile row */}
            <div
              className="md:hidden flex items-center gap-3 px-4 py-3 hover:bg-green-50 transition-colors"
              style={{ borderTop: "1px dashed #d1d5db", backgroundColor: i % 2 === 1 ? "#fafafa" : "#ffffff" }}
            >
              <span className="font-black text-xl w-9 shrink-0 leading-none" style={{ color: e.rank <= 3 ? GREEN : "#d1d5db" }}>
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
          <div className="px-4 py-16 text-center">
            <p className="text-2xl font-black italic text-gray-200">NO FANTASY GURUS YET.</p>
            <p className="mt-3 text-gray-400 text-sm">
              Go to Admin → Manage Experts and toggle <strong>Fantasy Guru</strong> on any analyst to add them here.
            </p>
          </div>
        )}
      </div>

    </div>
  );
}
