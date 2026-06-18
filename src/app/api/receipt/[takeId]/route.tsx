import { ImageResponse } from "@vercel/og";
import { createClient } from "@/lib/supabase/server";
import { getTakeScoreConfig } from "@/app/actions/takescore";
import { scoreToGrade } from "@/lib/takescore";

export const runtime = "edge";

// ── Spec §5 color tokens ──────────────────────────────────────────────────────
const PAPER    = "#f1ece0";
const INK      = "#161a17";
const RED      = "#cf2c20";   // wordmark slashes
const GRADE_C  = "#d23b2b";   // grade letter + verdict
const MUTED    = "#536471";   // @handle, tweet date
const ANALYSIS = "#454b46";   // analysis paragraph
const LABEL    = "#8b9088";   // FINAL GRADE label + footer
const WHITE    = "#ffffff";
const CARD_BOR = "#e7e2d4";   // tweet card border

// ── Spec §4: tweet font size (spec values, not scaled yet) ───────────────────
function tweetSizeSpec(text: string, max = 23, min = 16.5, lo = 60, hi = 210): number {
  const len = (text || "").length;
  if (len <= lo) return max;
  const t = Math.min(1, (len - lo) / (hi - lo));
  return Math.round((max - (max - min) * t) * 10) / 10;
}

// ── Analysis text helpers ─────────────────────────────────────────────────────
function trimAnalysis(text: string): string {
  // ≤180 chars → fits in 3 lines per spec §3 heuristic
  if (text.length <= 180) return text;
  // Try to cut to 2 sentences
  const sentences = text.match(/[^.!?]+[.!?]+/g) ?? [];
  let result = "";
  for (const s of sentences) {
    if ((result + s).length > 180) break;
    result += s;
  }
  return result.trim() || text.slice(0, 180).trim();
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
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5",
        max_tokens: 120,
        system: "You write short, neutral sports commentary for a take accountability site. Write exactly 1-2 casual sentences (max 160 chars total) previewing what to watch for. Completely neutral — no editorializing. Conversational fan-voice. No quotes around your response.",
        messages: [{
          role: "user",
          content: `Analyst: ${expertName}\nTake: "${takeText}"\nWill be judged on: ${gradingCriteria}`,
        }],
      }),
    });
    const json = await res.json() as { content?: Array<{ text?: string }> };
    return json?.content?.[0]?.text?.trim() || null;
  } catch {
    return null;
  }
}

function verdictLabel(status: string): string {
  if (status === "confirmed_true")  return "NAILED IT";
  if (status === "confirmed_false") return "WAY OFF";
  if (status === "partially_true")  return "PARTLY RIGHT";
  if (status === "unresolvable")    return "N/A";
  return "PENDING";
}

// ── Dynamic height computation (all values at 2× scale = 1120px wide) ────────
function computeHeight(displayText: string, analysisText: string | null): number {
  const S = 2; // scale
  const tweetFsPx  = tweetSizeSpec(displayText) * S;
  // Available width for tweet text: (560 - 34×2 - 22×2) × S = 448 × S
  const tweetAreaW = 448 * S;
  const avgCharW   = tweetFsPx * 0.54; // Space Grotesk ~0.54 avg char width ratio
  const charsPerLine = Math.max(10, Math.floor(tweetAreaW / avgCharW));
  const tweetLines = Math.max(1, Math.ceil(displayText.length / charsPerLine));
  const tweetTextH = tweetLines * tweetFsPx * 1.32;

  // Analysis
  let analysisBlockH = 0;
  if (analysisText && analysisText.length > 0) {
    const aLines = Math.min(3, Math.max(1, Math.ceil(analysisText.length / 58)));
    analysisBlockH = (48 + 22 + 30 + aLines * 32 * 1.44 + 40) * S / S; // already in 2× units below
    // Redo in 2× units:
    analysisBlockH = 96 + 44 + 60 + aLines * 32 * 1.44 * S + 80;
  }

  const fixed =
    56  +   // top padding
    50  +   // wordmark
    10  +   // wordmark → subline gap
    21  +   // subline
    44  +   // gap to tweet card
    40  +   // card top padding
    96  +   // avatar height
    30  +   // avatar → tweet text margin
    26  +   // tweet text → date margin
    27  +   // date
    40  +   // card bottom padding
    4   +   // top divider border
    32  +   // grade row padding-top
    168 +   // grade letter (84 × S)
    32  +   // footer margin-top
    22  +   // footer text
    48  +   // bottom padding
    40;     // safety buffer

  return Math.ceil(fixed + tweetTextH + analysisBlockH);
}

// ── Load a Google Font as ArrayBuffer ────────────────────────────────────────
async function loadGFont(family: string, weight: number): Promise<ArrayBuffer | null> {
  try {
    const css = await fetch(
      `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}:wght@${weight}&display=swap`
    ).then(r => r.text());
    const url = css.match(/src: url\((.+?)\) format\('woff2'\)/)?.[1];
    if (!url) return null;
    return fetch(url).then(r => r.arrayBuffer());
  } catch {
    return null;
  }
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ takeId: string }> }
) {
  const { takeId } = await params;
  const supabase = await createClient();

  // Load fonts in parallel — Archivo Black (wordmark/grade/verdict) is critical
  const [archivoBuf, spaceGroteskBuf] = await Promise.all([
    loadGFont("Archivo Black", 400),
    loadGFont("Space Grotesk", 700),
  ]);

  const { data: take } = await supabase
    .from("takes")
    .select("*, experts(name, twitter_handle, avatar_url)")
    .eq("take_id", takeId)
    .single();

  if (!take) return new Response("Not found", { status: 404 });

  const gradeConfig = await getTakeScoreConfig();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const expert = (take as any).experts;
  const expertName: string = expert?.name ?? "Unknown Analyst";
  const rawHandle: string  = expert?.twitter_handle ?? "";
  const handle = rawHandle
    ? (rawHandle.startsWith("@") ? rawHandle : `@${rawHandle}`)
    : null;

  // Avatar initials fallback (spec §2: fall back to neutral gray circle)
  const initials = expertName
    .split(" ").filter(Boolean).slice(0, 2)
    .map((w: string) => w[0].toUpperCase()).join("");

  const letterGrade = take.grade != null ? scoreToGrade(take.grade, gradeConfig) : null;
  const verdict     = verdictLabel(take.outcome_status);

  // Prefer verbatim raw_text, strip t.co URLs per spec §2
  const rawDisplay  = take.raw_text?.trim() || take.summary?.trim() || "";
  const displayText = rawDisplay.replace(/\s*https?:\/\/t\.co\/\S+/g, "").trim();

  // Tweet date: "Jun 16, 2026"
  const d = new Date(take.date_made);
  const tweetDate = d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  const isPending = take.outcome_status === "pending";
  let analysisText: string | null = null;
  if (!isPending) {
    const raw = take.outcome_notes?.trim() || take.grade_notes?.trim() || null;
    analysisText = raw ? trimAnalysis(raw) : null;
  } else if (take.grading_criteria?.trim()) {
    analysisText = await generatePendingTeaser(expertName, displayText, take.grading_criteria.trim());
    if (analysisText) analysisText = trimAnalysis(analysisText);
  }
  const analysisLabel = isPending ? "WHAT WE'RE WATCHING" : "THE ANALYSIS";

  // ── Dimensions (2× retina render per spec §8) ──────────────────────────────
  const W = 1120; // 560 × 2
  const H = computeHeight(displayText, analysisText);

  // ── All CSS values are 2× spec values ─────────────────────────────────────
  const tweetFontSize = tweetSizeSpec(displayText) * 2;

  const fonts = [
    ...(archivoBuf    ? [{ name: "Archivo Black",  data: archivoBuf,    weight: 400 as const, style: "normal" as const }] : []),
    ...(spaceGroteskBuf ? [{ name: "Space Grotesk", data: spaceGroteskBuf, weight: 700 as const, style: "normal" as const }] : []),
  ];

  return new ImageResponse(
    (
      <div style={{
        width: W,
        height: H,
        backgroundColor: PAPER,
        display: "flex",
        flexDirection: "column",
        padding: "56px 68px 48px",
        boxSizing: "border-box",
      }}>

        {/* ── Wordmark ── */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "baseline", fontFamily: '"Archivo Black", sans-serif', fontSize: 50, letterSpacing: "-0.02em", color: INK, lineHeight: 1 }}>
            <span>RATE</span>
            <span style={{ color: RED, margin: "0 2px" }}>/</span>
            <span>MY</span>
            <span style={{ color: RED, margin: "0 2px" }}>/</span>
            <span>SPORTS</span>
            <span style={{ color: RED, margin: "0 2px" }}>/</span>
            <span>TAKE</span>
          </div>
          <div style={{ display: "flex", fontSize: 21, letterSpacing: "0.26em", color: "rgba(0,0,0,0.42)", marginTop: 10, fontFamily: "monospace" }}>
            THE TAKES, RATED.
          </div>
        </div>

        {/* ── White tweet card ── */}
        <div style={{
          marginTop: 44,
          backgroundColor: WHITE,
          borderRadius: 36,
          padding: "40px 44px",
          borderWidth: 2,
          borderStyle: "solid",
          borderColor: CARD_BOR,
          display: "flex",
          flexDirection: "column",
        }}>
          {/* Header: avatar + name/handle */}
          <div style={{ display: "flex", alignItems: "center", gap: 22 }}>
            {/* Avatar circle with initials */}
            <div style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 96,
              height: 96,
              borderRadius: 48,
              backgroundColor: "#d1d5db",
              flexShrink: 0,
            }}>
              <span style={{ fontSize: 34, fontWeight: 700, color: "#6b7280", fontFamily: '"Space Grotesk", system-ui, sans-serif' }}>
                {initials}
              </span>
            </div>

            {/* Name + handle */}
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontFamily: '"Space Grotesk", system-ui, sans-serif', fontWeight: 700, fontSize: 32, color: "#0f1419" }}>
                  {expertName}
                </span>
                {/* Verified badge per spec §6 */}
                <svg width="34" height="34" viewBox="0 0 24 24">
                  <path fill="#1d9bf0" d="M22.25 12c0-1.43-.88-2.67-2.19-3.34.46-1.39.2-2.9-.81-3.91s-2.52-1.27-3.91-.81c-.66-1.31-1.91-2.19-3.34-2.19s-2.67.88-3.33 2.19c-1.4-.46-2.91-.2-3.92.81s-1.26 2.52-.8 3.91c-1.31.67-2.2 1.91-2.2 3.34s.89 2.67 2.2 3.34c-.46 1.39-.21 2.9.8 3.91s2.52 1.26 3.91.81c.67 1.31 1.91 2.19 3.34 2.19s2.68-.88 3.34-2.19c1.39.45 2.9.2 3.91-.81s1.27-2.52.81-3.91c1.31-.67 2.19-1.91 2.19-3.34z"/>
                  <path fill="#fff" d="M9.8 15.7l-3-3 1.4-1.4 1.6 1.6 4.6-4.6 1.4 1.4z"/>
                </svg>
              </div>
              {handle && (
                <span style={{ fontFamily: '"Space Grotesk", system-ui, sans-serif', fontSize: 28, color: MUTED }}>
                  {handle}
                </span>
              )}
            </div>
          </div>

          {/* Tweet text */}
          <div style={{
            display: "flex",
            fontSize: tweetFontSize,
            lineHeight: 1.32,
            letterSpacing: "-0.01em",
            color: "#0f1419",
            margin: "30px 0 26px",
            fontFamily: '"Space Grotesk", system-ui, sans-serif',
            fontWeight: 600,
          }}>
            {displayText}
          </div>

          {/* Date */}
          <div style={{ display: "flex", fontSize: 27, color: MUTED, fontFamily: '"Space Grotesk", system-ui, sans-serif' }}>
            {tweetDate}
          </div>
        </div>

        {/* ── THE ANALYSIS section label ── */}
        {analysisText && (
          <div style={{ display: "flex", flexDirection: "column", marginTop: 48 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
              <div style={{ flex: 1, height: 2, backgroundColor: "rgba(0,0,0,0.2)" }} />
              <span style={{ fontFamily: "monospace", fontSize: 22, fontWeight: 600, letterSpacing: "0.3em", color: INK }}>
                {analysisLabel}
              </span>
              <div style={{ flex: 1, height: 2, backgroundColor: "rgba(0,0,0,0.2)" }} />
            </div>

            {/* Analysis paragraph */}
            <div style={{
              display: "flex",
              fontSize: 32,
              lineHeight: 1.44,
              color: ANALYSIS,
              textAlign: "center",
              margin: "30px 0 40px",
              fontFamily: '"Space Grotesk", system-ui, sans-serif',
            }}>
              {analysisText}
            </div>
          </div>
        )}

        {/* ── Grade row ── */}
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 44,
          borderTop: `4px solid ${INK}`,
          paddingTop: 32,
          marginTop: analysisText ? 0 : 48,
        }}>
          {/* Grade letter */}
          <div style={{
            display: "flex",
            fontFamily: '"Archivo Black", sans-serif',
            fontSize: 168,
            lineHeight: 0.78,
            color: GRADE_C,
            letterSpacing: "-0.05em",
          }}>
            {letterGrade ?? "—"}
          </div>

          {/* Right block */}
          <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
            <div style={{ display: "flex", fontFamily: "monospace", fontSize: 21, letterSpacing: "0.24em", color: LABEL }}>
              FINAL GRADE
            </div>
            <div style={{
              display: "flex",
              fontFamily: '"Archivo Black", sans-serif',
              fontSize: 60,
              color: GRADE_C,
              letterSpacing: "-0.02em",
              marginTop: 10,
              lineHeight: 1,
            }}>
              {verdict}
            </div>
          </div>
        </div>

        {/* ── Footer ── */}
        <div style={{
          display: "flex",
          justifyContent: "center",
          fontFamily: "monospace",
          fontSize: 22,
          letterSpacing: "0.16em",
          color: LABEL,
          marginTop: 32,
        }}>
          RATEMYSPORTSTAKE.COM
        </div>

      </div>
    ),
    {
      width: W,
      height: H,
      fonts,
    }
  );
}
