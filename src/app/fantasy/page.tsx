import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import Link from "next/link";
import { computeAccolades } from "@/lib/accolades";
import type { Accolade } from "@/lib/accolades";
import Avatar from "@/components/Avatar";
import { getTakeScoreConfig } from "@/app/actions/takescore";
import { scoreToGrade, gradeColor } from "@/lib/takescore";

const GREEN = "#15803d";

const CATEGORY_LABELS: Record<string, string> = {
  breakout_call: "Breakout Call", bust_call: "Bust Call",
  sleeper_pick: "Sleeper Pick", start_sit: "Start/Sit", waiver_add: "Waiver Add",
};

const OUTCOME_COLORS: Record<string, string> = {
  resolved: "#15803d", pending: "#d97706",
};

export default async function FantasyPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; view?: string }>;
}) {
  const { q, view: viewParam } = await searchParams;
  const activeView = viewParam === "takes" ? "takes" : "leaderboard";

  const supabase = await createClient();
  const gradeConfig = await getTakeScoreConfig();

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];

  // ── Gurus query ───────────────────────────────────────────────────────────
  let expertsQuery = supabase
    .from("experts")
    .select("*")
    .eq("is_fantasy_guru", true)
    .order("fantasy_overall_rating", { ascending: false });

  if (q) expertsQuery = expertsQuery.or(`name.ilike.%${q}%,outlet.ilike.%${q}%`);

  const [{ data: experts }, { data: recentTakes }] = await Promise.all([
    expertsQuery,
    supabase
      .from("takes")
      .select("expert_id, grade, outcome_status, difficulty_score")
      .gte("date_made", thirtyDaysAgo),
  ]);

  const expertIds = (experts ?? []).map((e) => e.expert_id);

  const allExpertSnaps = (experts ?? []).map((e) => ({
    expert_id: e.expert_id,
    overall_rating: e.fantasy_overall_rating ?? e.overall_rating,
    graded_takes: e.fantasy_graded_takes ?? e.graded_takes ?? 0,
  }));

  const rows = (experts ?? []).map((e, i) => ({
    ...e,
    rank: i + 1,
    accolades: computeAccolades(e.expert_id, e.overall_rating, allExpertSnaps, recentTakes ?? []),
  }));

  // ── Fantasy takes query (only when view=takes) ─────────────────────────────
  let fantasyTakes: Array<{
    fantasy_take_id: string; expert_id: string; category: string;
    raw_text: string; player_name: string | null; player_position: string | null;
    timing_window: string | null; boldness_score: number | null;
    accuracy_score: number | null; outcome_status: string;
    date_made: string; sport_season: string | null; format?: string | null;
    experts: { name: string; expert_id: string } | null;
  }> = [];

  if (activeView === "takes" && expertIds.length > 0) {
    const adminSupabase = createAdminClient();
    let ftQuery = adminSupabase
      .from("fantasy_takes")
      .select("fantasy_take_id, expert_id, category, raw_text, player_name, player_position, timing_window, boldness_score, accuracy_score, outcome_status, date_made, sport_season, experts(name, expert_id)")
      .in("expert_id", expertIds)
      .order("date_made", { ascending: false })
      .limit(50);

    if (q) ftQuery = ftQuery.ilike("raw_text", `%${q}%`);
    const { data } = await ftQuery;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    fantasyTakes = (data ?? []) as unknown as typeof fantasyTakes;
  }

  // ── URL helpers ───────────────────────────────────────────────────────────
  function viewHref(v: "leaderboard" | "takes") {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (v !== "leaderboard") params.set("view", v);
    const str = params.toString();
    return `/fantasy${str ? `?${str}` : ""}`;
  }

  return (
    <div className="space-y-0">

      {/* ── Header ── */}
      <div className="mb-5">
        <p className="font-mono text-[11px] tracking-[0.22em] text-gray-400 uppercase">
          The Index · Fantasy Edition
        </p>
        <h1 className="text-4xl font-black tracking-tight mt-1">
          TOP GURUS{" "}
          <span style={{ color: GREEN }}>· {activeView === "takes" ? "TAKES" : "LEADERBOARD"}</span>
        </h1>
        <p className="mt-1 italic text-gray-500">
          {experts?.length ?? 0} fantasy guru{experts?.length !== 1 ? "s" : ""}
          {q ? ` matching "${q}"` : " tracked · ranked by Fantasy TakeScore"}
        </p>
      </div>

      {/* ── Controls row ── */}
      <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
        {/* Search */}
        <form method="GET" className="flex gap-2">
          <input type="hidden" name="view" value={activeView} />
          <div className="flex items-stretch border-2 bg-white" style={{ borderColor: "#1a1a1a" }}>
            <div className="flex items-center px-3 border-r-2" style={{ borderColor: "#1a1a1a" }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" />
              </svg>
            </div>
            <input
              name="q" defaultValue={q ?? ""}
              placeholder="search gurus…"
              className="px-3 py-2 bg-transparent text-sm text-gray-900 placeholder-gray-400 focus:outline-none w-40"
            />
          </div>
          <button type="submit" className="px-4 py-2 font-mono text-[11px] tracking-widest text-white font-black" style={{ backgroundColor: GREEN }}>
            GO
          </button>
        </form>

        {/* LEADERBOARD / TAKES toggle */}
        <div className="flex border-2 overflow-hidden shrink-0" style={{ borderColor: GREEN }}>
          <Link
            href={viewHref("leaderboard")}
            className={`flex items-center gap-1.5 px-4 py-2 font-mono text-[11px] tracking-widest uppercase font-black transition-colors ${
              activeView === "leaderboard" ? "text-white" : "bg-white text-gray-500 hover:text-gray-900"
            }`}
            style={activeView === "leaderboard" ? { backgroundColor: GREEN } : {}}
          >
            <span>≡</span> Leaderboard
          </Link>
          <Link
            href={viewHref("takes")}
            className={`flex items-center gap-1.5 px-4 py-2 font-mono text-[11px] tracking-widest uppercase font-black border-l-2 transition-colors ${
              activeView === "takes" ? "text-white" : "bg-white text-gray-500 hover:text-gray-900"
            }`}
            style={activeView === "takes" ? { backgroundColor: GREEN, borderColor: GREEN } : { borderColor: GREEN }}
          >
            <span>💬</span> Takes
          </Link>
        </div>
      </div>

      {/* ── Analyst/Fantasy tab strip ── */}
      <div className="flex gap-0 border-b-2 border-gray-900 mb-5">
        <Link
          href="/experts"
          className="px-5 py-2.5 font-mono text-[11px] tracking-widest uppercase border-b-2 border-transparent -mb-0.5 transition-colors font-black hover:opacity-80"
          style={{ color: "#e2241a" }}
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

      {/* ── LEADERBOARD view ── */}
      {activeView === "leaderboard" && (
        <div className="border-2 overflow-hidden" style={{ borderColor: "#1a1a1a" }}>
          {/* Desktop header */}
          <div
            className="hidden md:grid items-center px-4 py-2.5 text-white"
            style={{ gridTemplateColumns: "56px 1fr 150px 80px 110px", backgroundColor: GREEN }}
          >
            <div className="font-mono text-[10px] tracking-[0.15em]">RANK</div>
            <div className="font-mono text-[10px] tracking-[0.15em]">GURU</div>
            <div className="font-mono text-[10px] tracking-[0.15em]">PLATFORM</div>
            <div className="font-mono text-[10px] tracking-[0.15em]">TAKES</div>
            <div className="font-mono text-[10px] tracking-[0.15em]">FANTASY SCORE</div>
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
                <div className="font-black text-2xl" style={{ color: (e.fantasy_overall_rating ?? 0) > 0 ? gradeColor(scoreToGrade(e.fantasy_overall_rating ?? 0, gradeConfig)) : "#9ca3af" }}>
                  {(e.fantasy_overall_rating ?? 0) > 0 ? scoreToGrade(e.fantasy_overall_rating ?? 0, gradeConfig) : "—"}
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
                <span className="font-black text-2xl shrink-0" style={{ color: (e.fantasy_overall_rating ?? 0) > 0 ? gradeColor(scoreToGrade(e.fantasy_overall_rating ?? 0, gradeConfig)) : "#9ca3af" }}>
                  {(e.fantasy_overall_rating ?? 0) > 0 ? scoreToGrade(e.fantasy_overall_rating ?? 0, gradeConfig) : "—"}
                </span>
              </div>
            </Link>
          )) : (
            <div className="px-4 py-16 text-center">
              <p className="text-2xl font-black italic text-gray-200">NO FANTASY GURUS YET.</p>
              <p className="mt-3 text-gray-400 text-sm">
                Go to Admin → Manage Experts and toggle <strong>Fantasy Guru</strong> on any analyst.
              </p>
            </div>
          )}
        </div>
      )}

      {/* ── TAKES view ── */}
      {activeView === "takes" && (
        <div>
          {fantasyTakes.length > 0 ? (
            <div className="border-2 overflow-hidden divide-y divide-gray-100" style={{ borderColor: GREEN }}>
              {fantasyTakes.map((ft) => {
                const guru = ft.experts as { name: string; expert_id: string } | null;
                return (
                  <div key={ft.fantasy_take_id} className="bg-white">
                    {/* Header */}
                    <div className="flex items-center justify-between gap-4 px-4 py-3 border-b border-gray-100">
                      <div className="flex items-center gap-2 min-w-0">
                        {guru && (
                          <Link href={`/experts/${guru.expert_id}`} className="font-black text-sm uppercase tracking-tight hover:underline truncate">
                            {guru.name}
                          </Link>
                        )}
                        <span className="text-gray-300">·</span>
                        <span className="text-xs text-gray-400 font-mono shrink-0">{ft.date_made}</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="rounded-full px-2.5 py-0.5 text-[10px] font-bold text-white" style={{ backgroundColor: GREEN }}>
                          {CATEGORY_LABELS[ft.category] ?? ft.category}
                        </span>
                        <span className="font-mono text-[10px] font-black" style={{ color: OUTCOME_COLORS[ft.outcome_status] ?? "#9ca3af" }}>
                          {ft.outcome_status === "resolved"
                            ? ft.accuracy_score != null ? `${ft.accuracy_score}%` : "RESOLVED"
                            : "PENDING"}
                        </span>
                      </div>
                    </div>
                    {/* Quote */}
                    <div className="px-4 py-4" style={{ backgroundColor: "#f0fdf4" }}>
                      {ft.player_name && (
                        <p className="font-black text-sm uppercase tracking-wide mb-1" style={{ color: GREEN }}>
                          {ft.player_name}{ft.player_position ? ` · ${ft.player_position}` : ""}
                        </p>
                      )}
                      <p className="italic text-lg leading-snug text-gray-800">
                        &ldquo;{ft.raw_text}&rdquo;
                      </p>
                    </div>
                    {/* Footer */}
                    <div className="px-4 py-2.5 flex flex-wrap items-center gap-3 text-[10px] font-mono text-gray-400">
                      {ft.timing_window && <span>{ft.timing_window.replace(/_/g, " ")}</span>}
                      {ft.sport_season && <span>· {ft.sport_season}</span>}
                      {ft.boldness_score != null && <span>· Boldness {ft.boldness_score}</span>}
                      {ft.format && ft.format !== "both" && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-mono"
                          style={{ backgroundColor: ft.format === "dynasty" ? "#ede9fe" : "#e0f2fe", color: ft.format === "dynasty" ? "#7c3aed" : "#0284c7" }}>
                          {ft.format}
                        </span>
                      )}
                      {guru && (
                        <Link href={`/experts/${guru.expert_id}`} className="ml-auto hover:underline" style={{ color: GREEN }}>
                          {guru.name.split(" ")[0]}&apos;s Card →
                        </Link>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="border-2 px-4 py-12 text-center italic text-gray-400 bg-white" style={{ borderColor: GREEN }}>
              {expertIds.length === 0 ? "No fantasy gurus found." : "No fantasy takes yet."}
            </div>
          )}
        </div>
      )}

    </div>
  );
}
