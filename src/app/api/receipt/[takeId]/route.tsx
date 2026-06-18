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
    textLen < 60  ? 54 :
    textLen < 100 ? 44 :
    textLen < 160 ? 36 :
    textLen < 240 ? 30 :
    textLen < 340 ? 25 :
    textLen < 460 ? 21 :
    18;

  // Avatar initials
  const initials = expertName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w: string) => w[0].toUpperCase())
    .join("");

  const cream = "#f5f1e9";
  const W = 1080;
  const H = 1350;
  const PAD = 68;
  const CARD_W = W - PAD * 2;

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
          padding: `52px ${PAD}px 44px`,
          gap: 0,
          fontFamily: "Inter, sans-serif",
        }}
      >
        {/* ── Logo ── */}
        <div style={{ display: "flex", alignItems: "center", marginBottom: 8 }}>
          <span style={{ fontSize: 42, fontWeight: 900, color: "#1a1a1a", letterSpacing: "-0.03em" }}>RATE</span>
          <span style={{ fontSize: 42, fontWeight: 900, color: "#e2241a" }}>/</span>
          <span style={{ fontSize: 42, fontWeight: 900, color: "#1a1a1a", letterSpacing: "-0.03em" }}>MY</span>
          <span style={{ fontSize: 42, fontWeight: 900, color: "#e2241a" }}>/</span>
          <span style={{ fontSize: 42, fontWeight: 900, color: "#1a1a1a", letterSpacing: "-0.03em" }}>SPORTS</span>
          <span style={{ fontSize: 42, fontWeight: 900, color: "#e2241a" }}>/</span>
          <span style={{ fontSize: 42, fontWeight: 900, color: "#1a1a1a", letterSpacing: "-0.03em" }}>TAKE</span>
        </div>
        <div style={{ display: "flex", fontSize: 12, letterSpacing: "0.22em", color: "#6b7280", fontFamily: "monospace", marginBottom: 36 }}>
          THE TAKES, RATED.
        </div>

        {/* ── Fake Tweet Card ── */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            width: CARD_W,
            backgroundColor: "#ffffff",
            borderRadius: 20,
            borderWidth: 1,
            borderStyle: "solid",
            borderColor: "#e2e8f0",
            padding: "36px 40px 32px 40px",
          }}
        >
          {/* Header: avatar + name/handle on left, date on right */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
            {/* Left: avatar + name block */}
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              {/* Avatar circle */}
              <div style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 76,
                height: 76,
                borderRadius: 38,
                backgroundColor: "#d1d5db",
                flexShrink: 0,
              }}>
                <span style={{ fontSize: 26, fontWeight: 900, color: "#6b7280" }}>{initials}</span>
              </div>

              {/* Name + handle */}
              <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 24, fontWeight: 900, color: "#0f1419", letterSpacing: "-0.01em" }}>
                    {expertName}
                  </span>
                  {/* Verified badge */}
                  <div style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: 24,
                    height: 24,
                    borderRadius: 12,
                    backgroundColor: "#1d9bf0",
                  }}>
                    <span style={{ color: "white", fontSize: 13, fontWeight: 900 }}>✓</span>
                  </div>
                </div>
                {handle && (
                  <span style={{ fontSize: 17, color: "#536471", fontFamily: "monospace" }}>{handle}</span>
                )}
              </div>
            </div>

            {/* Right: date */}
            <span style={{ fontSize: 17, color: "#536471", fontFamily: "monospace", flexShrink: 0 }}>
              {tweetDate}
            </span>
          </div>

          {/* Tweet text */}
          <div style={{ display: "flex", fontSize: tweetFontSize, fontWeight: 700, color: "#0f1419", lineHeight: 1.4, letterSpacing: "-0.01em" }}>
            {displayText}
          </div>
        </div>

        {/* ── Analysis ── */}
        {analysisText && (
          <div style={{ width: CARD_W, display: "flex", flexDirection: "column", alignItems: "center", marginTop: 40 }}>
            {/* Section label with rules */}
            <div style={{ display: "flex", alignItems: "center", width: "100%", gap: 12 }}>
              <div style={{ flex: 1, height: 1, backgroundColor: "#1a1a1a" }} />
              <span style={{ fontSize: 12, letterSpacing: "0.22em", color: "#1a1a1a", fontFamily: "monospace" }}>
                {analysisLabel}
              </span>
              <div style={{ flex: 1, height: 1, backgroundColor: "#1a1a1a" }} />
            </div>
            <div style={{
              display: "flex",
              fontSize: 29,
              color: "#374151",
              textAlign: "center",
              lineHeight: 1.55,
              marginTop: 18,
              fontFamily: "serif",
              fontStyle: "italic",
              width: "100%",
            }}>
              {analysisText}
            </div>
          </div>
        )}

        {/* ── Grade ── */}
        <div style={{ width: CARD_W, display: "flex", flexDirection: "column", alignItems: "center", marginTop: analysisText ? 36 : 52 }}>
          {/* Thin rule */}
          <div style={{ width: "100%", height: 1, backgroundColor: "#d6cfc0" }} />

          <div style={{ display: "flex", alignItems: "center", gap: 44, marginTop: 28 }}>
            {/* Letter grade */}
            {letterGrade ? (
              <span style={{
                fontSize: 152,
                fontWeight: 900,
                color: gradeColor(letterGrade),
                lineHeight: 1,
                letterSpacing: "-0.04em",
              }}>
                {letterGrade}
              </span>
            ) : (
              <span style={{ fontSize: 80, fontWeight: 900, color: "#9ca3af" }}>—</span>
            )}

            {/* Verdict block */}
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <span style={{ fontSize: 12, letterSpacing: "0.22em", color: "#9ca3af", fontFamily: "monospace" }}>
                FINAL GRADE
              </span>
              <span style={{
                fontSize: 44,
                fontWeight: 900,
                color: verdict.color,
                letterSpacing: "0.01em",
                lineHeight: 1.1,
              }}>
                {verdict.label}
              </span>
              {/* Barcode */}
              <div style={{ display: "flex", alignItems: "flex-end", height: 32, gap: 1, marginTop: 8 }}>
                {[3,1,2,1,3,2,1,2,3,1,2,3,1,2,1,3,2,1,3,1,2,1,2,3,1,2,1].map((w, i) => (
                  <div key={i} style={{
                    width: w * 2,
                    height: i % 3 === 0 ? 32 : 24,
                    backgroundColor: "#1a1a1a",
                  }} />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── Footer ── */}
        <div style={{
          marginTop: "auto",
          paddingTop: 18,
          width: CARD_W,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          borderTop: "1px solid #d1d5db",
        }}>
          <div style={{ width: 4, height: 32, backgroundColor: "#1a1a1a" }} />
          <span style={{ fontSize: 13, letterSpacing: "0.14em", color: "#6b7280", fontFamily: "monospace" }}>
            RATEMYSPORTSTAKE.COM
          </span>
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
