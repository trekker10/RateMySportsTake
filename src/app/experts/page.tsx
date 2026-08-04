import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { expertUrl } from "@/lib/expert-url";
import { computeAccolades } from "@/lib/accolades";
import type { Accolade } from "@/lib/accolades";
import Avatar from "@/components/Avatar";
import { getTakeScoreConfig } from "@/app/actions/takescore";
import { getFlag } from "@/app/actions/flags";
import { scoreToGrade, gradeColor, computeCurvedGrades } from "@/lib/takescore";
import TakesFeed from "@/components/TakesFeed";

const RED = "#e2241a";
const SPORTS = ["ALL SPORTS", "NBA", "NFL", "MLB", "NHL", "Soccer", "College Football", "MMA"];

export default async function ExpertsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; sport?: string; view?: string }>;
}) {
  const { q, sport, view: viewParam } = await searchParams;
  const activeView  = viewParam === "takes" ? "takes" : "leaderboard";
  const activeSport = sport ?? "ALL SPORTS";

  const supabase = await createClient();
  const gradeConfig = await getTakeScoreConfig();

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];

  // ── Experts query ─────────────────────────────────────────────────────────
  let expertsQuery = supabase
    .from("experts")
    .select("*")
    .eq("verified", true)
    .neq("is_fantasy_guru", true)
    .order("overall_rating", { ascending: false });

  if (q) expertsQuery = expertsQuery.or(`name.ilike.%${q}%,outlet.ilike.%${q}%`);
  if (activeSport !== "ALL SPORTS") {
    expertsQuery = expertsQuery.contains("sport_focus", [activeSport]);
  }

  const [{ data: experts }, { data: recentTakes }, curveModeEnabled, { data: nflPool }] = await Promise.all([
    expertsQuery,
    supabase
      .from("takes")
      .select("expert_id, grade, outcome_status, difficulty_score")
      .gte("date_made", thirtyDaysAgo),
    getFlag("curve_mode_enabled"),
    // Always fetch the full NFL analyst pool for curve calculation (regardless of active sport filter)
    supabase
      .from("experts")
      .select("expert_id, overall_rating")
      .eq("verified", true)
      .neq("is_fantasy_guru", true)
      .contains("sport_focus", ["NFL"])
      .gt("overall_rating", 0),
  ]);

  // Compute curved grades for NFL analysts when curve mode is on
  const curvedGrades: Map<string, string> = curveModeEnabled
    ? computeCurvedGrades(
        (nflPool ?? []).map((e) => ({ id: e.expert_id, score: e.overall_rating }))
      )
    : new Map();

  const expertIds = (experts ?? []).map((e) => e.expert_id);

  const allExpertSnaps = (experts ?? []).map((e) => ({
    expert_id: e.expert_id,
    overall_rating: e.overall_rating,
    graded_takes: e.graded_takes ?? 0,
  }));

  const GRADE_ORDER = ["A", "B+", "B", "B−", "C+", "C", "C−", "D", "F"];

  const sortedExperts = curveModeEnabled && curvedGrades.size > 0
    ? [...(experts ?? [])].sort((a, b) => {
        const ga = curvedGrades.get(a.expert_id) ?? scoreToGrade(a.overall_rating, gradeConfig);
        const gb = curvedGrades.get(b.expert_id) ?? scoreToGrade(b.overall_rating, gradeConfig);
        const ia = GRADE_ORDER.indexOf(ga);
        const ib = GRADE_ORDER.indexOf(gb);
        // Within the same curved grade, preserve the DB's overall_rating order
        if (ia !== ib) return ia - ib;
        return b.overall_rating - a.overall_rating;
      })
    : (experts ?? []);

  const rows = sortedExperts.map((e, i) => ({
    ...e,
    rank: i + 1,
    accolades: computeAccolades(e.expert_id, e.overall_rating, allExpertSnaps, recentTakes ?? []),
  }));

  const { data: { user } } = await supabase.auth.getUser();

  // ── Takes query (only when view=takes) ────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let takesRows: any[] | null = null;
  let followedTakeIds: string[] = [];
  if (activeView === "takes" && expertIds.length > 0) {
    let takesQuery = supabase
      .from("takes")
      .select("*, experts(name, expert_id, slug, outlet, avatar_url)")
      .in("expert_id", expertIds)
      .order("date_made", { ascending: false });

    if (activeSport !== "ALL SPORTS") takesQuery = takesQuery.ilike("sport", `%${activeSport}%`);
    if (q) takesQuery = takesQuery.or(`raw_text.ilike.%${q}%,summary.ilike.%${q}%`);

    const [{ data }, followsResult] = await Promise.all([
      takesQuery,
      user
        ? supabase.from("take_follows").select("take_id").eq("user_id", user.id)
        : Promise.resolve({ data: [] }),
    ]);
    takesRows = data;
    followedTakeIds = (followsResult.data ?? []).map((r: { take_id: string }) => r.take_id);
  }

  // ── URL helpers ───────────────────────────────────────────────────────────
  function sportHref(s: string) {
    const sp = s === "ALL SPORTS" ? undefined : s;
    const params = new URLSearchParams();
    if (sp)  params.set("sport", sp);
    if (q)   params.set("q", q);
    params.set("view", activeView);
    const str = params.toString();
    return `/experts${str ? `?${str}` : ""}`;
  }

  function viewHref(v: "leaderboard" | "takes") {
    const params = new URLSearchParams();
    if (activeSport !== "ALL SPORTS") params.set("sport", activeSport);
    if (q) params.set("q", q);
    if (v !== "leaderboard") params.set("view", v);
    const str = params.toString();
    return `/experts${str ? `?${str}` : ""}`;
  }

  return (
    <div className="space-y-0">

      {/* ── Header band ── */}
      <div className="mb-5">
        <p className="font-mono text-[11px] tracking-[0.22em] text-gray-400 uppercase">
          The Index · {activeView === "takes" ? "Takes Feed" : "Default View"}
        </p>
        <h1 className="text-4xl font-black tracking-tight mt-1">
          TOP ANALYSTS{" "}
          <span style={{ color: RED }}>· {activeView === "takes" ? "TAKES" : "LEADERBOARD"}</span>
        </h1>
      </div>

      {/* ── View toggle row ── */}
      <div className="flex items-center justify-end flex-wrap gap-3 mb-4">
        {/* LEADERBOARD / TAKES toggle */}
        <div className="flex border-2 border-gray-900 overflow-hidden shrink-0">
          <Link
            href={viewHref("leaderboard")}
            className={`flex items-center gap-1.5 px-4 py-2 font-mono text-[11px] tracking-widest uppercase font-black transition-colors ${
              activeView === "leaderboard"
                ? "text-white"
                : "bg-white text-gray-500 hover:text-gray-900"
            }`}
            style={activeView === "leaderboard" ? { backgroundColor: "#1a1a1a" } : {}}
          >
            <span>≡</span> Leaderboard
          </Link>
          <Link
            href={viewHref("takes")}
            className={`flex items-center gap-1.5 px-4 py-2 font-mono text-[11px] tracking-widest uppercase font-black border-l-2 border-gray-900 transition-colors ${
              activeView === "takes"
                ? "text-white"
                : "bg-white text-gray-500 hover:text-gray-900"
            }`}
            style={activeView === "takes" ? { backgroundColor: RED } : {}}
          >
            <span>💬</span> Takes
          </Link>
        </div>
      </div>

      {/* ── Analyst/Fantasy tab strip ── */}
      <div className="flex gap-0 border-b-2 border-gray-900 mb-5">
        <div
          className="px-5 py-2.5 font-mono text-[11px] tracking-widest uppercase font-black -mb-0.5 border-b-2"
          style={{ color: RED, borderColor: RED }}
        >
          Analysts
        </div>
        <Link
          href="/fantasy"
          className="px-5 py-2.5 font-mono text-[11px] tracking-widest uppercase border-b-2 border-transparent -mb-0.5 transition-colors font-black hover:opacity-80"
          style={{ color: "#15803d" }}
        >
          Fantasy Gurus
        </Link>
      </div>

      {/* ── LEADERBOARD view ── */}
      {activeView === "leaderboard" && (
        <div className="border-2 border-gray-900 overflow-hidden">
          {/* Desktop header */}
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
            <Link key={e.expert_id} href={expertUrl(e)} className="block">
              {/* Desktop row */}
              <div
                className="hidden md:grid items-center px-4 py-3.5 hover:bg-gray-50 transition-colors"
                style={{
                  gridTemplateColumns: "56px 1fr 150px 80px 110px",
                  borderTop: "1px dashed #d1d5db",
                  backgroundColor: i % 2 === 1 ? "#fafafa" : "#ffffff",
                }}
              >
                <div className="font-black text-[2rem] leading-none" style={{ color: e.rank <= 3 ? RED : "#d1d5db" }}>
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
                <div className="font-black text-2xl" style={{ color: e.overall_rating > 0 ? gradeColor(curvedGrades.get(e.expert_id) ?? scoreToGrade(e.overall_rating, gradeConfig)) : "#9ca3af" }}>
                  {e.overall_rating > 0 ? (curvedGrades.get(e.expert_id) ?? scoreToGrade(e.overall_rating, gradeConfig)) : "—"}
                </div>
              </div>

              {/* Mobile row */}
              <div
                className="md:hidden flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors"
                style={{ borderTop: "1px dashed #d1d5db", backgroundColor: i % 2 === 1 ? "#fafafa" : "#ffffff" }}
              >
                <span className="font-black text-xl w-9 shrink-0 leading-none" style={{ color: e.rank <= 3 ? RED : "#d1d5db" }}>
                  {String(e.rank).padStart(2, "0")}
                </span>
                <div className="w-9 h-9 rounded-full bg-gray-200 shrink-0 overflow-hidden flex items-center justify-center text-xs font-bold text-gray-600">
                  <Avatar name={e.name} avatarUrl={e.avatar_url} className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-black text-sm uppercase tracking-tight truncate">{e.name}</p>
                  <p className="font-mono text-[9px] text-gray-400 tracking-wider truncate">{e.outlet ?? e.sport_focus?.[0] ?? "—"}</p>
                </div>
                <span className="font-black text-2xl shrink-0" style={{ color: e.overall_rating > 0 ? gradeColor(curvedGrades.get(e.expert_id) ?? scoreToGrade(e.overall_rating, gradeConfig)) : "#9ca3af" }}>
                  {e.overall_rating > 0 ? (curvedGrades.get(e.expert_id) ?? scoreToGrade(e.overall_rating, gradeConfig)) : "—"}
                </span>
              </div>
            </Link>
          )) : (
            <div className="px-4 py-12 text-center text-gray-400">
              No analysts yet — they&apos;re created automatically when you submit a take.
            </div>
          )}
        </div>
      )}

      {/* ── TAKES view ── */}
      {activeView === "takes" && (
        <div>
          {takesRows && takesRows.length > 0 ? (
            <TakesFeed takes={takesRows} isLoggedIn={!!user} followedTakeIds={followedTakeIds} />
          ) : (
            <div className="border-2 border-gray-900 px-4 py-12 text-center italic text-gray-400 bg-white">
              {expertIds.length === 0
                ? "No analysts found with those filters."
                : "No takes yet from these analysts."}
            </div>
          )}
        </div>
      )}

    </div>
  );
}
