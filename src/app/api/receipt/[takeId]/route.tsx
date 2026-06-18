import { ImageResponse } from "@vercel/og";
import { createClient } from "@/lib/supabase/server";
import { getTakeScoreConfig } from "@/app/actions/takescore";
import { scoreToGrade } from "@/lib/takescore";

export const runtime = "edge";

function verdictLabel(status: string) {
  if (status === "confirmed_true")  return { label: "NAILED IT",    color: "#0a7a3b" };
  if (status === "confirmed_false") return { label: "WAY OFF",      color: "#e2241a" };
  if (status === "partially_true")  return { label: "PARTLY RIGHT", color: "#d97706" };
  if (status === "unresolvable")    return { label: "N/A",          color: "#6b7280" };
  return                                   { label: "PENDING",      color: "#9ca3af" };
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
  return "#e2241a"; // F
}

function trimAnalysis(text: string): string {
  const sentences = text.match(/[^.!?]+[.!?]+/g) ?? [];
  let result = "";
  for (const s of sentences) {
    if ((result + s).length > 320) break;
    result += s;
    if (result.split(/[.!?]/).filter(Boolean).length >= 2) break;
  }
  return result.trim() || text.slice(0, 320).trim();
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
        system: "You write short, neutral sports commentary for a take accountability site. Given a sports take and what it will be judged on, write exactly 1-2 casual sentences (max 160 chars total) previewing what to watch for. Be completely neutral — don't lean toward the take being right or wrong. Conversational fan-voice. No quotes around your response.",
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

// Simple barcode lines
function Barcode() {
  const bars = [3,1,2,1,3,2,1,2,3,1,2,3,1,2,1,3,2,1,3,1,2,1,2,3,1,2,1];
  return (
    <div style={{ display: "flex", alignItems: "flex-end", height: 32, gap: 1 }}>
      {bars.map((w, i) => (
        <div key={i} style={{
          width: w * 2,
          height: i % 3 === 0 ? 32 : 24,
          backgroundColor: "#1a1a1a",
        }} />
      ))}
    </div>
  );
}

function HRule() {
  return <div style={{ width: "100%", height: 1, backgroundColor: "#d6cfc0" }} />;
}

function SectionLabel({ label }: { label: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", width: "100%", gap: 12 }}>
      <div style={{ flex: 1, height: 1, backgroundColor: "#1a1a1a" }} />
      <span style={{ fontSize: 13, letterSpacing: "0.22em", color: "#1a1a1a", fontFamily: "monospace", whiteSpace: "nowrap" }}>
        {label}
      </span>
      <div style={{ flex: 1, height: 1, backgroundColor: "#1a1a1a" }} />
    </div>
  );
}

// Blue verified badge (Twitter-style)
function VerifiedBadge() {
  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      width: 26,
      height: 26,
      borderRadius: "50%",
      backgroundColor: "#1d9bf0",
      marginLeft: 6,
      flexShrink: 0,
    }}>
      <span style={{ color: "white", fontSize: 14, fontWeight: 900, lineHeight: 1 }}>✓</span>
    </div>
  );
}

// Avatar circle — shows initials of the analyst
function Avatar({ name }: { name: string }) {
  const initials = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");

  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      width: 80,
      height: 80,
      borderRadius: "50%",
      backgroundColor: "#d1d5db",
      flexShrink: 0,
    }}>
      <span style={{ fontSize: 28, fontWeight: 900, color: "#6b7280", fontFamily: "sans-serif" }}>
        {initials}
      </span>
    </div>
  );
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ takeId: string }> }
) {
  const { takeId } = await params;
  const supabase = await createClient();

  // Load Inter Black (weight 900)
  const fontRes = await fetch(
    "https://fonts.googleapis.com/css2?family=Inter:wght@900&display=swap"
  );
  const css = await fontRes.text();
  const fontUrl = css.match(/src: url\((.+?)\) format\('woff2'\)/)?.[1];
  const interBlack = fontUrl
    ? await fetch(fontUrl).then((r) => r.arrayBuffer())
    : null;

  const { data: take } = await supabase
    .from("takes")
    .select("*, experts(name, twitter_handle)")
    .eq("take_id", takeId)
    .single();

  if (!take) {
    return new Response("Not found", { status: 404 });
  }

  const gradeConfig = await getTakeScoreConfig();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const expert = (take as any).experts;
  const expertName: string = expert?.name ?? "Unknown Analyst";
  const verdict = verdictLabel(take.outcome_status);
  const letterGrade = take.grade != null ? scoreToGrade(take.grade, gradeConfig) : null;

  // Prefer verbatim raw_text, fall back to summary — strip trailing t.co URLs
  const rawDisplay = take.raw_text?.trim() || take.summary?.trim() || "";
  const displayText = rawDisplay.replace(/\s*https?:\/\/t\.co\/\S+/g, "").trim();

  // Tweet date — short format: "Jun 16, 2026"
  const d = new Date(take.date_made);
  const tweetDate = d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  const postedLabel = `${d.toLocaleDateString("en-US", { month: "short" }).toUpperCase()} '${String(d.getFullYear()).slice(2)}`;

  const handle = expert?.twitter_handle
    ? (expert.twitter_handle.startsWith("@") ? expert.twitter_handle : `@${expert.twitter_handle}`)
    : null;

  const isPending = take.outcome_status === "pending";

  let analysisText: string | null = null;
  if (!isPending) {
    const raw = take.outcome_notes?.trim() || take.grade_notes?.trim() || null;
    analysisText = raw ? trimAnalysis(raw) : null;
  } else if (take.grading_criteria?.trim()) {
    analysisText = await generatePendingTeaser(
      expertName,
      displayText,
      take.grading_criteria.trim(),
    );
  }
  const analysisLabel = isPending ? "WHAT WE'RE WATCHING" : "THE ANALYSIS";

  // Scale tweet text font based on length
  const textLen = displayText.length;
  const tweetFontSize =
    textLen < 60  ? 56 :
    textLen < 100 ? 46 :
    textLen < 160 ? 38 :
    textLen < 240 ? 32 :
    textLen < 340 ? 26 :
    textLen < 460 ? 22 :
    19;

  const cream = "#f5f1e9";
  const W = 1080;
  const H = 1350;
  const PAD = 72; // horizontal padding

  return new ImageResponse(
    (
      <div
        style={{
          width: W,
          height: H,
          backgroundColor: cream,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          padding: `56px ${PAD}px 44px`,
          gap: 0,
        }}
      >
        {/* ── Logo ── */}
        <div style={{ display: "flex", alignItems: "center", gap: 0, marginBottom: 6 }}>
          {["RATE", "MY", "SPORTS", "TAKE"].map((word, i) => (
            <div key={word} style={{ display: "flex", alignItems: "center" }}>
              <span style={{ fontSize: 44, fontWeight: 900, color: "#1a1a1a", letterSpacing: "-0.03em", fontFamily: "Inter, sans-serif" }}>
                {word}
              </span>
              {i < 3 && (
                <span style={{ fontSize: 44, fontWeight: 900, color: "#e2241a", fontFamily: "Inter, sans-serif" }}>/</span>
              )}
            </div>
          ))}
        </div>
        <p style={{ fontSize: 12, letterSpacing: "0.22em", color: "#6b7280", fontFamily: "monospace", margin: "0 0 36px", textTransform: "uppercase" }}>
          The Takes, Rated.
        </p>

        {/* ── Fake Tweet Card ── */}
        <div style={{
          display: "flex",
          flexDirection: "column",
          width: W - PAD * 2,
          backgroundColor: "#ffffff",
          borderRadius: 20,
          border: "1px solid #e5e7eb",
          padding: "36px 40px 32px",
          gap: 0,
        }}>
          {/* Header row: avatar + name/handle */}
          <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 20 }}>
            <Avatar name={expertName} />
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 0 }}>
                <span style={{ fontSize: 26, fontWeight: 900, color: "#0f1419", fontFamily: "Inter, sans-serif", letterSpacing: "-0.01em" }}>
                  {expertName}
                </span>
                <VerifiedBadge />
              </div>
              <span style={{ fontSize: 18, color: "#536471", fontFamily: "monospace" }}>
                {handle ?? ""}
              </span>
            </div>
            {/* Date top-right */}
            <span style={{ marginLeft: "auto", fontSize: 17, color: "#536471", fontFamily: "monospace", flexShrink: 0 }}>
              {tweetDate}
            </span>
          </div>

          {/* Tweet text */}
          <p style={{
            fontSize: tweetFontSize,
            fontWeight: 700,
            color: "#0f1419",
            lineHeight: 1.4,
            margin: "0 0 0",
            fontFamily: "Inter, sans-serif",
            letterSpacing: "-0.01em",
          }}>
            {displayText}
          </p>
        </div>

        {/* ── Analysis ── */}
        {analysisText && (
          <div style={{ width: W - PAD * 2, display: "flex", flexDirection: "column", alignItems: "center", marginTop: 40 }}>
            <SectionLabel label={analysisLabel} />
            <p style={{
              fontSize: 30,
              color: "#374151",
              textAlign: "center",
              lineHeight: 1.55,
              margin: "18px 0 0",
              fontFamily: "serif",
              fontStyle: "italic",
              width: "100%",
            }}>
              {analysisText}
            </p>
          </div>
        )}

        {/* ── Grade ── */}
        <div style={{ width: W - PAD * 2, display: "flex", flexDirection: "column", alignItems: "center", marginTop: analysisText ? 36 : 48 }}>
          <HRule />
          <div style={{ display: "flex", alignItems: "center", gap: 44, marginTop: 28 }}>
            {/* Letter grade */}
            {letterGrade ? (
              <span style={{
                fontSize: 160,
                fontWeight: 900,
                color: gradeColor(letterGrade),
                fontFamily: "Inter, serif",
                lineHeight: 1,
                letterSpacing: "-0.04em",
              }}>
                {letterGrade}
              </span>
            ) : (
              <span style={{ fontSize: 80, fontWeight: 900, color: "#9ca3af", fontFamily: "sans-serif" }}>—</span>
            )}

            {/* Verdict block */}
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <span style={{ fontSize: 12, letterSpacing: "0.22em", color: "#9ca3af", fontFamily: "monospace", textTransform: "uppercase" }}>
                Final Grade
              </span>
              <span style={{
                fontSize: letterGrade && letterGrade.length > 1 ? 42 : 48,
                fontWeight: 900,
                color: verdict.color,
                fontFamily: "Inter, sans-serif",
                letterSpacing: "0.01em",
                lineHeight: 1.1,
              }}>
                {verdict.label}
              </span>
              <div style={{ marginTop: 8 }}>
                <Barcode />
              </div>
            </div>
          </div>
        </div>

        {/* ── Footer ── */}
        <div style={{
          marginTop: "auto",
          borderTop: "1px solid #d1d5db",
          paddingTop: 18,
          width: W - PAD * 2,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}>
          <div style={{ width: 4, height: 32, backgroundColor: "#1a1a1a" }} />
          <p style={{ fontSize: 13, letterSpacing: "0.14em", color: "#6b7280", fontFamily: "monospace" }}>
            RATEMYSPORTSTAKE.COM
          </p>
          <div style={{ width: 4, height: 32, backgroundColor: "#1a1a1a" }} />
        </div>
      </div>
    ),
    {
      width: W,
      height: H,
      ...(interBlack ? {
        fonts: [{ name: "Inter", data: interBlack, weight: 900, style: "normal" as const }],
      } : {}),
    }
  );
}
