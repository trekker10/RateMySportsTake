import { ImageResponse } from "@vercel/og";
import { createClient } from "@/lib/supabase/server";
import { getTakeScoreConfig } from "@/app/actions/takescore";
import { scoreToGrade } from "@/lib/takescore";

export const runtime = "edge";

function verdictLabel(status: string) {
  if (status === "confirmed_true")  return "NAILED IT";
  if (status === "confirmed_false") return "WAY OFF";
  if (status === "partially_true")  return "PARTLY RIGHT";
  if (status === "unresolvable")    return "N/A";
  return "PENDING";
}

function gradeColor(grade: string) {
  if (grade === "A")  return "#0a7a3b";
  if (grade === "B+") return "#15803d";
  if (grade === "B")  return "#16a34a";
  if (grade === "B−") return "#22c55e";
  if (grade === "C+") return "#ca8a04";
  if (grade === "C")  return "#d97706";
  if (grade === "C−") return "#f59e0b";
  if (grade === "D")  return "#ea580c";
  return "#d23b2b";
}

function trimAnalysis(text: string): string {
  if (text.length <= 200) return text;
  const sentences = text.match(/[^.!?]+[.!?]+/g) ?? [];
  let result = "";
  for (const s of sentences) {
    if ((result + s).length > 200) break;
    result += s;
  }
  return result.trim() || text.slice(0, 200).trim();
}

async function generatePendingTeaser(
  expertName: string,
  takeText: string,
  gradingCriteria: string,
): Promise<string | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": apiKey, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({
        model: "claude-haiku-4-5",
        max_tokens: 100,
        system: "Write 1-2 neutral sentences (max 160 chars) previewing what to watch for with this sports take. Conversational, no quotes.",
        messages: [{ role: "user", content: `Analyst: ${expertName}\nTake: "${takeText}"\nJudged on: ${gradingCriteria}` }],
      }),
    });
    const json = await res.json() as { content?: Array<{ text?: string }> };
    const t = json?.content?.[0]?.text?.trim() ?? "";
    return t.length > 0 ? trimAnalysis(t) : null;
  } catch {
    return null;
  }
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ takeId: string }> }
) {
  const { takeId } = await params;
  const baseUrl = new URL(_req.url).origin;
  const supabase = await createClient();

  // Load Inter Black — same approach as the previously working version
  let interBlack: ArrayBuffer | null = null;
  try {
    const css = await fetch("https://fonts.googleapis.com/css2?family=Inter:wght@900&display=swap").then(r => r.text());
    const url = css.match(/src: url\((.+?)\) format\('woff2'\)/)?.[1];
    if (url) interBlack = await fetch(url).then(r => r.arrayBuffer());
  } catch { /* fall back to system font */ }

  let archivoblack: ArrayBuffer | null = null;
  try {
    const css2 = await fetch("https://fonts.googleapis.com/css2?family=Archivo+Black&display=swap").then(r => r.text());
    const url2 = css2.match(/src: url\((.+?)\) format\('woff2'\)/)?.[1];
    if (url2) archivoblack = await fetch(url2).then(r => r.arrayBuffer());
  } catch { /* fall back */ }

  const { data: take } = await supabase
    .from("takes")
    .select("*, vote_boost_well, vote_boost_poorly, experts(name, twitter_handle, avatar_url)")
    .eq("take_id", takeId)
    .single();

  if (!take) return new Response("Not found", { status: 404 });

  // Crowd forecast vote tallies (include admin boosts)
  const { data: votes } = await supabase
    .from("take_votes")
    .select("vote")
    .eq("take_id", takeId);

  const rawWell   = (votes ?? []).filter(v => v.vote === "well").length;
  const rawPoorly = (votes ?? []).filter(v => v.vote === "poorly").length;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const t = take as any;
  const crowdWell   = rawWell   + (t.vote_boost_well   ?? 0);
  const crowdPoorly = rawPoorly + (t.vote_boost_poorly ?? 0);
  const crowdTotal  = crowdWell + crowdPoorly;
  const hasCrowd    = crowdTotal > 0;
  const hitPct      = hasCrowd ? Math.round((crowdWell   / crowdTotal) * 100) : 0;
  const missPct     = hasCrowd ? Math.round((crowdPoorly / crowdTotal) * 100) : 0;
  // "crowd was correct" = majority voted well AND take is confirmed_true, OR majority voted poorly AND take is confirmed_false/partially_true
  const majorityWell = crowdWell >= crowdPoorly;
  const takeAgedWell = take.outcome_status === "confirmed_true";
  const crowdCorrect = majorityWell === takeAgedWell;

  const gradeConfig = await getTakeScoreConfig();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const expert     = (take as any).experts;
  const expertName = (expert?.name ?? "Unknown Analyst") as string;
  const rawHandle  = (expert?.twitter_handle ?? "") as string;
  const handle     = rawHandle ? (rawHandle.startsWith("@") ? rawHandle : `@${rawHandle}`) : null;
  const avatarUrl  = (expert?.avatar_url ?? null) as string | null;

  const initials = expertName.split(" ").filter(Boolean).slice(0, 2).map((w: string) => w[0].toUpperCase()).join("");

  const letterGrade = take.grade != null ? scoreToGrade(take.grade, gradeConfig) : null;
  const verdict     = verdictLabel(take.outcome_status);
  const gc          = gradeColor(letterGrade ?? "F");

  const rawDisplay  = (take.raw_text?.trim() || take.summary?.trim() || "") as string;
  const displayText = rawDisplay.replace(/\s*https?:\/\/t\.co\/\S+/g, "").trim();

  const d = new Date(take.date_made ?? Date.now());
  const tweetDate = d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  const isPending = take.outcome_status === "pending";
  let analysisText: string | null = null;
  if (!isPending) {
    const raw = take.outcome_notes?.trim() || take.grade_notes?.trim() || null;
    if (raw) analysisText = trimAnalysis(raw);
  } else if (take.grading_criteria?.trim()) {
    analysisText = await generatePendingTeaser(expertName, displayText, take.grading_criteria.trim());
  }
  const analysisLabel = isPending ? "WHAT WE'RE WATCHING" : "THE ANALYSIS";

  const W = 1080;
  const H = 1080;

  const textLen = displayText.length;

  const HEADER_H      = 148;
  const TWEET_META_H  = 160;
  const ANALYSIS_H    = analysisText ? 260 : 0;
  const GRADE_H       = 240;
  const OUTER_PAD     = 96;

  const availableTweetTextH = H - HEADER_H - TWEET_META_H - ANALYSIS_H - GRADE_H - OUTER_PAD;

  const usableWidth = 920;
  function estimateTweetHeight(fs: number): number {
    const charsPerLine = Math.floor(usableWidth / (fs * 0.54));
    const lines = Math.ceil(textLen / Math.max(charsPerLine, 1));
    return Math.ceil(lines * fs * 1.35);
  }

  let tweetFS = 44;
  for (let fs = 44; fs >= 18; fs -= 0.5) {
    if (estimateTweetHeight(fs) <= availableTweetTextH) {
      tweetFS = fs;
      break;
    }
  }
  if (tweetFS < 18) tweetFS = 18;

  const tight      = tweetFS < 36;
  const veryTight  = tweetFS < 26;

  const gradeFS   = veryTight ? 100 : tight ? 130 : 160;
  const verdictFS = veryTight ? 46  : tight ? 58  : 72;

  const sectionMT = veryTight ? 16 : tight ? 24 : 40;
  const gradeGap  = veryTight ? 20 : tight ? 28 : 40;
  const footerMT  = veryTight ? 8  : tight ? 14 : 20;
  const dividerMT = veryTight ? 16 : tight ? 24 : 36;
  const tweetMT   = veryTight ? 28 : tight ? 36 : 52;

  const avatarSize = veryTight ? 64 : 88;
  const avatarFS   = veryTight ? 22 : 30;
  const nameFSval  = veryTight ? 24 : 28;
  const handleFS   = veryTight ? 18 : 22;

  const cardPadV   = veryTight ? 20 : tight ? 28 : 36;  // tweet card top/bottom padding
  const dateMT     = veryTight ? 10 : tight ? 14 : 20;  // marginTop on date row

  const tweetCardMaxH = H - HEADER_H - ANALYSIS_H - GRADE_H - OUTER_PAD;

  const DISPLAY = archivoblack ? "Archivo Black, sans-serif" : "Inter, sans-serif";

  const CREAM  = "#f1ece0";
  const INK    = "#161a17";
  const RED    = "#cf2c20";
  const MUTED  = "#536471";
  const LABEL  = "#8b9088";
  const ANALC  = "#454b46";

  const fontList = [
    ...(interBlack   ? [{ name: "Inter",         data: interBlack,   weight: 900 as const, style: "normal" as const }] : []),
    ...(archivoblack ? [{ name: "Archivo Black", data: archivoblack, weight: 400 as const, style: "normal" as const }] : []),
  ];
  const imgOpts = { width: W, height: H, ...(fontList.length > 0 ? { fonts: fontList } : {}) };

  return new ImageResponse(
    (
      <div style={{ width: W, height: H, backgroundColor: CREAM, display: "flex", flexDirection: "column", paddingTop: 52, paddingRight: 64, paddingBottom: 32, paddingLeft: 64 }}>

        {/* Wordmark */}
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 8 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`${baseUrl}/wordmark.png`} alt="RATE/MY/SPORTS/TAKE" style={{ height: 96, objectFit: "contain" }} />
        </div>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: tweetMT }}>
          <span style={{ fontSize: 19, letterSpacing: "0.26em", color: "rgba(0,0,0,0.42)", fontFamily: "Inter, sans-serif" }}>THE TAKES, RATED.</span>
        </div>

        {/* Tweet card */}
        <div style={{ display: "flex", flexDirection: "column", backgroundColor: "#ffffff", borderRadius: 28, paddingTop: cardPadV, paddingRight: 40, paddingBottom: cardPadV, paddingLeft: 40, borderWidth: 1, borderStyle: "solid", borderColor: "#e7e2d4", boxShadow: "0 14px 30px -16px rgba(0,0,0,0.4)", maxHeight: tweetCardMaxH, overflow: "hidden" }}>

          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", gap: 18, marginBottom: 24 }}>
            {/* Avatar */}
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatarUrl} alt={expertName} style={{ width: avatarSize, height: avatarSize, borderRadius: avatarSize / 2, objectFit: "cover", flexShrink: 0 }} />
            ) : (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: avatarSize, height: avatarSize, borderRadius: avatarSize / 2, backgroundColor: "#d1d5db", flexShrink: 0 }}>
                <span style={{ fontSize: avatarFS, fontWeight: 900, color: "#6b7280", fontFamily: "Inter, sans-serif" }}>{initials}</span>
              </div>
            )}
            {/* Name + handle stacked */}
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: nameFSval, fontWeight: 900, color: "#0f1419", fontFamily: "Inter, sans-serif" }}>{expertName}</span>
                {/* Blue verified circle */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 30, height: 30, borderRadius: 15, backgroundColor: "#1d9bf0" }}>
                  <span style={{ color: "#ffffff", fontSize: 16, fontWeight: 900, fontFamily: "Inter, sans-serif" }}>✓</span>
                </div>
              </div>
              {handle && <span style={{ fontSize: handleFS, color: MUTED, fontFamily: "monospace" }}>{handle}</span>}
            </div>
          </div>

          {/* Tweet text */}
          <div style={{ display: "flex" }}>
            <span style={{ fontSize: tweetFS, lineHeight: 1.35, letterSpacing: "-0.01em", color: "#0f1419", fontFamily: "Inter, sans-serif", fontWeight: 400 }}>{displayText}</span>
          </div>

          {/* Date */}
          <div style={{ display: "flex", marginTop: dateMT }}>
            <span style={{ fontSize: 22, color: MUTED, fontFamily: "monospace" }}>{tweetDate}</span>
          </div>
        </div>

        {/* Analysis */}
        {analysisText && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginTop: sectionMT }}>
            <div style={{ display: "flex", alignItems: "center", width: "100%" }}>
              <div style={{ flexGrow: 1, height: 1, backgroundColor: "rgba(0,0,0,0.2)" }} />
              <span style={{ fontSize: 18, letterSpacing: "0.24em", color: "rgba(22,26,23,0.6)", fontFamily: "monospace", marginLeft: 16, marginRight: 16 }}>{analysisLabel}</span>
              <div style={{ flexGrow: 1, height: 1, backgroundColor: "rgba(0,0,0,0.2)" }} />
            </div>
            <div style={{ display: "flex", justifyContent: "center", marginTop: 24 }}>
              <span style={{ fontSize: 28, lineHeight: 1.5, color: ANALC, fontFamily: "Inter, sans-serif", textAlign: "center" }}>{analysisText}</span>
            </div>
          </div>
        )}

        {/* Divider line */}
        <div style={{ display: "flex", width: "100%", height: 2, backgroundColor: INK, marginTop: dividerMT }} />

        {isPending ? (
          /* ── Pending: crowd forecast split bar ── */
          hasCrowd ? (
            <div style={{ display: "flex", flexDirection: "column", marginTop: 28 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 14 }}>
                <span style={{ fontFamily: "monospace", fontSize: 18, fontWeight: 600, letterSpacing: "0.24em", color: LABEL }}>CROWD FORECAST</span>
                <span style={{ fontFamily: "monospace", fontSize: 18, color: LABEL }}>NOT GRADED YET</span>
              </div>
              {/* Split bar */}
              <div style={{ display: "flex", height: 16, borderRadius: 8, overflow: "hidden", border: "1px solid rgba(0,0,0,0.12)" }}>
                <div style={{ display: "flex", width: `${hitPct}%`, background: "#1f8a4c" }} />
                <div style={{ display: "flex", width: `${missPct}%`, background: "#d23b2b" }} />
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 10 }}>
                <span style={{ fontFamily: "monospace", fontSize: 22, fontWeight: 700, color: "#1f8a4c" }}>{hitPct}% SAY HIT</span>
                <span style={{ fontFamily: "monospace", fontSize: 22, fontWeight: 700, color: "#d23b2b" }}>{missPct}% SAY MISS</span>
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", justifyContent: "center", marginTop: 28 }}>
              <span style={{ fontFamily: "monospace", fontSize: 18, letterSpacing: "0.2em", color: LABEL }}>AWAITING RESULT</span>
            </div>
          )
        ) : (
          /* ── Graded: side-by-side grade (left) + crowd (right) ── */
          /* Canvas = 1080px, padding 64px each side = 952px usable.
             Divider section = 1px + 36px margin each side = 73px.
             Each column = (952 - 73) / 2 = 439px */
          <div style={{ display: "flex", alignItems: "flex-start", marginTop: 28, width: 952 }}>
            {/* Left — Final Grade, centered in column */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 439 }}>
              <span style={{ fontSize: 20, letterSpacing: "0.22em", color: LABEL, fontFamily: "monospace" }}>FINAL GRADE</span>
              <div style={{ display: "flex", alignItems: "center", gap: 20, marginTop: 12 }}>
                <span style={{ fontFamily: DISPLAY, fontWeight: 400, fontSize: 120, color: gc, letterSpacing: "-0.04em", lineHeight: 0.82, textShadow: "4px 4px 0 rgba(0,0,0,0.08)" }}>{letterGrade ?? "—"}</span>
                <span style={{ fontFamily: DISPLAY, fontWeight: 400, fontSize: 48, color: gc, letterSpacing: "-0.02em", lineHeight: 1.1 }}>{verdict}</span>
              </div>
            </div>

            {/* Vertical divider */}
            {hasCrowd && (
              <div style={{ display: "flex", width: 1, alignSelf: "stretch", background: "rgba(0,0,0,0.15)", marginLeft: 36, marginRight: 36 }} />
            )}

            {/* Right — Crowd Forecast, centered in column */}
            {hasCrowd && (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 439 }}>
                <span style={{ fontSize: 20, letterSpacing: "0.22em", color: LABEL, fontFamily: "monospace" }}>CROWD FORECAST</span>
                <div style={{ display: "flex", marginTop: 12 }}>
                  <span style={{ fontFamily: DISPLAY, fontWeight: 400, fontSize: 48, color: crowdCorrect ? "#1f8a4c" : "#d23b2b", letterSpacing: "-0.02em", lineHeight: 1.1 }}>
                    {crowdCorrect ? "CALLED IT" : "MISSED"}
                  </span>
                </div>
                <span style={{ fontFamily: "monospace", fontSize: 20, color: "#454b46", marginTop: 10, textAlign: "center" }}>
                  {crowdCorrect ? Math.max(hitPct, missPct) : Math.min(hitPct, missPct)}% predicted the take outcome
                </span>
              </div>
            )}
          </div>
        )}

        {/* Footer — pinned to bottom */}
        <div style={{ display: "flex", justifyContent: "center", marginTop: "auto", paddingTop: 16 }}>
          <span style={{ fontSize: 18, letterSpacing: "0.18em", color: LABEL, fontFamily: "monospace" }}>RATEMYSPORTSTAKE.COM</span>
        </div>

      </div>
    ),
    imgOpts
  );
}
