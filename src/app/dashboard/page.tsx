import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import DashboardFeed from "./DashboardFeed";
import WhoYouFollow from "./WhoYouFollow";
import { getTakeScoreConfig } from "@/app/actions/takescore";
import { scoreToGrade } from "@/lib/takescore";

export default async function DashboardPage() {
  const supabase = await createClient();
  const gradeConfig = await getTakeScoreConfig();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  // Profile for display name
  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("user_id", user.id)
    .maybeSingle();

  const handle = profile?.display_name ?? user.email?.split("@")[0] ?? "there";

  // Follows → expert IDs + info
  const { data: follows } = await supabase
    .from("follows")
    .select("expert_id, experts(name, slug, avatar_url, sport_focus)")
    .eq("user_id", user.id);

  const followedExperts = (follows ?? []).map((f) => ({
    expert_id: f.expert_id,
    name: (f.experts as any)?.name ?? "Unknown",
    slug: (f.experts as any)?.slug ?? null,
    avatar_url: (f.experts as any)?.avatar_url ?? null,
  }));

  const expertIds = followedExperts.map((e) => e.expert_id);

  // Takes feed + saved IDs + followed take IDs (parallel)
  const [{ data: takesRaw }, { data: savedRaw }, { data: pendingRaw }, { data: takeFollowsRaw }] = await Promise.all([
    expertIds.length > 0
      ? supabase
          .from("takes")
          .select("*, experts(name, expert_id, slug, outlet, avatar_url)")
          .in("expert_id", expertIds)
          .order("date_made", { ascending: false })
          .limit(80)
      : Promise.resolve({ data: [] }),
    supabase.from("saved_takes").select("take_id").eq("user_id", user.id),
    // Pending takes for stat tiles + upcoming counts
    expertIds.length > 0
      ? supabase
          .from("takes")
          .select("take_id, expert_id, time_horizon_date")
          .in("expert_id", expertIds)
          .eq("outcome_status", "pending")
      : Promise.resolve({ data: [] }),
    supabase.from("take_follows").select("take_id").eq("user_id", user.id),
  ]);

  const takes = takesRaw ?? [];
  const savedIds = (savedRaw ?? []).map((r) => r.take_id);
  const followedTakeIds = (takeFollowsRaw ?? []).map((r: { take_id: string }) => r.take_id);

  // Fetch full take data for followed takes from non-followed analysts
  const nonFollowedFollowIds = followedTakeIds.filter((id) => !takes.some((t) => t.take_id === id));
  const { data: extraFollowedRaw } = nonFollowedFollowIds.length > 0
    ? await supabase
        .from("takes")
        .select("*, experts(name, expert_id, slug, outlet, avatar_url)")
        .in("take_id", nonFollowedFollowIds)
    : { data: [] };
  const followedTakes = [
    ...takes.filter((t) => followedTakeIds.includes(t.take_id)),
    ...(extraFollowedRaw ?? []),
  ].sort((a, b) => new Date(b.date_made).getTime() - new Date(a.date_made).getTime());
  const pendingTakes = pendingRaw ?? [];

  // Stats
  const now = Date.now();
  const gradingSoon = pendingTakes.filter((t) => {
    if (!t.time_horizon_date) return false;
    const days = Math.ceil((new Date(t.time_horizon_date).getTime() - now) / 86_400_000);
    return days >= 0 && days <= 7;
  }).length;
  const grading30 = pendingTakes.filter((t) => {
    if (!t.time_horizon_date) return false;
    const days = Math.ceil((new Date(t.time_horizon_date).getTime() - now) / 86_400_000);
    return days >= 0 && days <= 30;
  }).length;

  // Per-analyst upcoming30 count
  const upcoming30ByExpert: Record<string, number> = {};
  for (const t of pendingTakes) {
    if (!t.time_horizon_date || !t.expert_id) continue;
    const days = Math.ceil((new Date(t.time_horizon_date).getTime() - now) / 86_400_000);
    if (days >= 0 && days <= 30) {
      upcoming30ByExpert[t.expert_id] = (upcoming30ByExpert[t.expert_id] ?? 0) + 1;
    }
  }

  const analystsList = followedExperts.map((e) => ({
    ...e,
    upcoming30: upcoming30ByExpert[e.expert_id] ?? 0,
  }));

  // Saved takes preview (first 3)
  const savedPreview = takes
    .filter((t) => savedIds.includes(t.take_id))
    .slice(0, 3);

  const stats = [
    { label: "GRADING SOON",       value: gradingSoon,          highlight: true },
    { label: "GRADING IN <30 DAYS", value: grading30,           highlight: false },
    { label: "ANALYSTS FOLLOWING", value: followedExperts.length, highlight: false },
    { label: "TAKES SAVED",        value: savedIds.length,      highlight: false },
  ];

  return (
    <div className="w-screen relative left-1/2 -translate-x-1/2 -mt-10" style={{ minHeight: "100vh", backgroundColor: "#ebedf0" }}>

      {/* ── Greeting band ── */}
      <div style={{ background: "#fff", borderBottom: "3px solid #15201a" }}>
        <div className="max-w-5xl mx-auto" style={{ padding: "28px 24px 0" }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
            <div>
              <h1 style={{ fontFamily: "'Archivo Black', sans-serif", fontWeight: 900, fontSize: 34, letterSpacing: "-.03em", color: "#15201a", lineHeight: 1 }}>
                Welcome back,{" "}
                <span style={{ color: "#e2241a" }}>{handle}.</span>
              </h1>
              <p style={{ fontStyle: "italic", fontSize: 16, color: "#8a8a82", marginTop: 6 }}>
                Here&apos;s what your analysts have been saying.
              </p>
            </div>
            <Link
              href="/dashboard/notifications"
              style={{
                fontFamily: "'JetBrains Mono', monospace", fontWeight: 700,
                fontSize: 10, letterSpacing: ".14em", textTransform: "uppercase",
                padding: "8px 14px", border: "1.5px solid #15201a",
                color: "#15201a", background: "#fff", textDecoration: "none",
                display: "inline-flex", alignItems: "center", gap: 6, whiteSpace: "nowrap",
                flexShrink: 0,
              }}
            >
              🔔 Manage Notifications
            </Link>
          </div>

          {/* Stat strip */}
          <div style={{ display: "flex", gap: 12, overflowX: "auto", padding: "20px 0", scrollbarWidth: "none" }}>
            {stats.map((s) => (
              <div
                key={s.label}
                style={{
                  minWidth: 118, flexShrink: 0,
                  padding: "12px 16px",
                  border: "2px solid #15201a",
                  background: s.highlight ? "#15201a" : "#eceef1",
                }}
              >
                <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: ".14em", textTransform: "uppercase", color: s.highlight ? "rgba(255,255,255,.6)" : "#8a8a82", marginBottom: 6 }}>
                  {s.label}
                </p>
                <p style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 30, letterSpacing: "-.03em", lineHeight: 1, color: s.highlight ? "#e2241a" : "#15201a" }}>
                  {s.value}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Body: feed + rail ── */}
      <div className="max-w-5xl mx-auto" style={{ padding: "24px" }}>
        <div className="dash-grid" style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: 24, alignItems: "start" }}>

          {/* Feed */}
          <div>
            {expertIds.length === 0 ? (
              <div style={{ background: "#fff", border: "2px solid #15201a", padding: "40px 32px", textAlign: "center" }}>
                <p style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 20, color: "#15201a", marginBottom: 12 }}>
                  Your feed is empty.
                </p>
                <p style={{ fontStyle: "italic", color: "#8a8a82", fontSize: 15, marginBottom: 20 }}>
                  Follow some analysts to see their takes here.
                </p>
                <Link
                  href="/experts"
                  style={{
                    fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: 12,
                    letterSpacing: ".16em", textTransform: "uppercase",
                    padding: "12px 24px", background: "#15201a", color: "#fff",
                    textDecoration: "none", display: "inline-block",
                  }}
                >
                  BROWSE ANALYSTS →
                </Link>
              </div>
            ) : (
              <DashboardFeed takes={takes} initialSavedIds={savedIds} followedTakeIds={followedTakeIds} followedTakes={followedTakes} />
            )}
          </div>

          {/* Right rail */}
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <WhoYouFollow analysts={analystsList} />

            {/* Saved takes preview */}
            <div style={{ background: "#fff", border: "2px solid #15201a" }}>
              <div style={{ background: "#f5f1e8", borderBottom: "2px solid #15201a", padding: "14px 18px", display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: 12, letterSpacing: ".18em", textTransform: "uppercase", color: "#15201a" }}>
                  SAVED TAKES
                </span>
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: "#8a8a82", letterSpacing: ".1em" }}>
                  {savedIds.length}
                </span>
              </div>

              {savedPreview.length === 0 ? (
                <p style={{ padding: "20px 18px", fontStyle: "italic", fontSize: 13, color: "#8a8a82" }}>
                  No saved takes yet. Hit SAVE on any take to bookmark it.
                </p>
              ) : (
                <div>
                  {savedPreview.map((t, i) => {
                    const expert = (t as any).experts;
                    return (
                      <Link
                        key={t.take_id}
                        href={`/takes/${t.take_id}`}
                        style={{
                          display: "flex", alignItems: "center", gap: 10,
                          padding: "11px 18px", textDecoration: "none",
                          borderBottom: i < savedPreview.length - 1 ? "1px solid #f0ede7" : "none",
                        }}
                      >
                        <div style={{ width: 28, height: 28, borderRadius: "50%", background: "#d9dce1", overflow: "hidden", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: "#3a4239" }}>
                          {expert?.avatar_url
                            ? <img src={expert.avatar_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                            : (expert?.name ?? "?").split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase()}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 11, textTransform: "uppercase", color: "#15201a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {expert?.name ?? "Unknown"}
                          </p>
                          <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: "#8a8a82", letterSpacing: ".1em" }}>
                            {expert?.outlet ?? ""}
                          </p>
                        </div>
                        <span style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 18, color: t.grade != null ? "#0a7a3b" : "#8a8a82" }}>
                          {t.grade != null ? scoreToGrade(t.grade, gradeConfig) : "···"}
                        </span>
                      </Link>
                    );
                  })}
                </div>
              )}

              <div style={{ borderTop: "2px solid #15201a", padding: "12px 18px" }}>
                <Link
                  href="/dashboard/saved"
                  style={{
                    display: "block", textAlign: "center",
                    fontFamily: "'JetBrains Mono', monospace", fontWeight: 700,
                    fontSize: 11, letterSpacing: ".16em", textTransform: "uppercase",
                    padding: "10px", background: "#fff", color: "#15201a",
                    border: "1.5px solid #15201a", textDecoration: "none",
                  }}
                >
                  VIEW ALL SAVED
                </Link>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Mobile rail responsive styles */}
      <style>{`
        @media (max-width: 880px) {
          .dash-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}
