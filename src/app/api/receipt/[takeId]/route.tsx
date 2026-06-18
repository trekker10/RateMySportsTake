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
    .select("*, experts(name, twitter_handle)")
    .eq("take_id", takeId)
    .single();

  if (!take) return new Response("Not found", { status: 404 });

  const gradeConfig = await getTakeScoreConfig();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const expert     = (take as any).experts;
  const expertName = (expert?.name ?? "Unknown Analyst") as string;
  const rawHandle  = (expert?.twitter_handle ?? "") as string;
  const handle     = rawHandle ? (rawHandle.startsWith("@") ? rawHandle : `@${rawHandle}`) : null;

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

  const analysisReserve = analysisText ? 280 : 0;
  const gradeReserve = 220;
  const headerReserve = 260;
  const tweetCardPadding = 144;
  const availableTweetPx = H - headerReserve - gradeReserve - analysisReserve - tweetCardPadding - 64;

  const usableWidth = 920;
  function estimateTweetHeight(fs: number): number {
    const charsPerLine = Math.floor(usableWidth / (fs * 0.52));
    const lines = Math.ceil(textLen / charsPerLine);
    return lines * fs * 1.35;
  }

  let tweetFS = 46;
  for (let fs = 46; fs >= 22; fs -= 0.5) {
    if (estimateTweetHeight(fs) <= availableTweetPx) {
      tweetFS = fs;
      break;
    }
  }

  const gradeFS   = tweetFS < 30 ? 120 : tweetFS < 38 ? 140 : 160;
  const verdictFS = tweetFS < 30 ? 56  : tweetFS < 38 ? 64  : 72;

  const tight     = tweetFS < 32;
  const sectionMT = tight ? 28 : 40;
  const gradeGap  = tight ? 28 : 40;
  const footerMT  = tight ? 12 : 20;

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
          <img src={`${baseUrl}/wordmark.png`} alt="RATE/MY/SPORTS/TAKE" style={{ height: 64, objectFit: "contain" }} />
        </div>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 36 }}>
          <span style={{ fontSize: 19, letterSpacing: "0.26em", color: "rgba(0,0,0,0.42)", fontFamily: "Inter, sans-serif" }}>THE TAKES, RATED.</span>
        </div>

        {/* Tweet card */}
        <div style={{ display: "flex", flexDirection: "column", backgroundColor: "#ffffff", borderRadius: 28, paddingTop: 36, paddingRight: 40, paddingBottom: 36, paddingLeft: 40, borderWidth: 1, borderStyle: "solid", borderColor: "#e7e2d4", boxShadow: "0 14px 30px -16px rgba(0,0,0,0.4)" }}>

          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", gap: 18, marginBottom: 24 }}>
            {/* Avatar */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 88, height: 88, borderRadius: 44, backgroundColor: "#d1d5db", flexShrink: 0 }}>
              <span style={{ fontSize: 30, fontWeight: 900, color: "#6b7280", fontFamily: "Inter, sans-serif" }}>{initials}</span>
            </div>
            {/* Name + handle stacked */}
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 28, fontWeight: 900, color: "#0f1419", fontFamily: "Inter, sans-serif" }}>{expertName}</span>
                {/* Blue verified circle */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 30, height: 30, borderRadius: 15, backgroundColor: "#1d9bf0" }}>
                  <span style={{ color: "#ffffff", fontSize: 16, fontWeight: 900, fontFamily: "Inter, sans-serif" }}>✓</span>
                </div>
              </div>
              {handle && <span style={{ fontSize: 22, color: MUTED, fontFamily: "monospace" }}>{handle}</span>}
            </div>
          </div>

          {/* Tweet text */}
          <div style={{ display: "flex" }}>
            <span style={{ fontSize: tweetFS, lineHeight: 1.35, letterSpacing: "-0.01em", color: "#0f1419", fontFamily: "Inter, sans-serif", fontWeight: 400 }}>{displayText}</span>
          </div>

          {/* Date */}
          <div style={{ display: "flex", marginTop: 20 }}>
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
        <div style={{ display: "flex", width: "100%", height: 2, backgroundColor: INK, marginTop: tight ? 24 : 36 }} />

        {/* Grade row */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: gradeGap, marginTop: 28 }}>
          <div style={{ display: "flex" }}>
            <span style={{ fontFamily: DISPLAY, fontWeight: 400, fontSize: gradeFS, color: gc, letterSpacing: "-0.04em", lineHeight: 0.82, textShadow: "5px 5px 0 rgba(0,0,0,0.1)" }}>{letterGrade ?? "—"}</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex" }}>
              <span style={{ fontSize: 18, letterSpacing: "0.22em", color: LABEL, fontFamily: "monospace" }}>FINAL GRADE</span>
            </div>
            <div style={{ display: "flex", marginTop: 8 }}>
              <span style={{ fontFamily: DISPLAY, fontWeight: 400, fontSize: verdictFS, color: gc, letterSpacing: "-0.02em" }}>{verdict}</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ display: "flex", justifyContent: "center", marginTop: footerMT }}>
          <span style={{ fontSize: 18, letterSpacing: "0.18em", color: LABEL, fontFamily: "monospace" }}>RATEMYSPORTSTAKE.COM</span>
        </div>

      </div>
    ),
    imgOpts
  );
}
