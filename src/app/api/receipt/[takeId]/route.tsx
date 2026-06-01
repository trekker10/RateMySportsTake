import { ImageResponse } from "@vercel/og";
import { createClient } from "@/lib/supabase/server";
import { getTakeScoreConfig } from "@/app/actions/takescore";
import { scoreToGrade } from "@/lib/takescore";

export const runtime = "edge";

function verdictLabel(status: string) {
  if (status === "confirmed_true")  return { label: "NAILED IT",    color: "#0a7a3b" };
  if (status === "confirmed_false") return { label: "MISSED IT",    color: "#e2241a" };
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

// Trim analysis text to ~2 sentences, max 300 chars
function trimAnalysis(text: string): string {
  const sentences = text.match(/[^.!?]+[.!?]+/g) ?? [];
  let result = "";
  for (const s of sentences) {
    if ((result + s).length > 300) break;
    result += s;
    if (result.split(/[.!?]/).filter(Boolean).length >= 2) break;
  }
  return result.trim() || text.slice(0, 300).trim();
}

// Simple barcode lines
function Barcode() {
  const bars = [3,1,2,1,3,2,1,2,3,1,2,3,1,2,1,3,2,1,3,1,2,1,2,3,1,2,1];
  return (
    <div style={{ display: "flex", alignItems: "flex-end", height: 40, gap: 1 }}>
      {bars.map((w, i) => (
        <div key={i} style={{
          width: w * 2,
          height: i % 3 === 0 ? 40 : 32,
          backgroundColor: "#1a1a1a",
        }} />
      ))}
    </div>
  );
}

function Divider({ label }: { label: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", width: "100%", gap: 8 }}>
      <div style={{ flex: 1, height: 1, backgroundColor: "#1a1a1a" }} />
      <span style={{ fontSize: 11, letterSpacing: "0.22em", color: "#1a1a1a", fontFamily: "monospace", whiteSpace: "nowrap" }}>
        {label}
      </span>
      <div style={{ flex: 1, height: 1, backgroundColor: "#1a1a1a" }} />
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
  const verdict = verdictLabel(take.outcome_status);
  const letterGrade = take.grade != null ? scoreToGrade(take.grade, gradeConfig) : null;

  // Prefer verbatim raw_text, fall back to summary — strip trailing t.co URLs
  const rawDisplay = take.raw_text?.trim() || take.summary?.trim() || "";
  const displayText = rawDisplay.replace(/\s*https?:\/\/t\.co\/\S+/g, "").trim();

  const d = new Date(take.date_made);
  const dateMade = `${d.toLocaleDateString("en-US", { month: "short" }).toUpperCase()} '${String(d.getFullYear()).slice(2)}`;

  // Analysis blurb: only show for graded takes (outcome_notes / grade_notes)
  // Do NOT show grading_criteria — it reads like internal scoring instructions
  const rawAnalysis =
    take.outcome_notes?.trim() ||
    take.grade_notes?.trim() ||
    null;
  const analysisText = rawAnalysis ? trimAnalysis(rawAnalysis) : null;

  // Scale take font based on text length — large enough to be readable on a phone share
  const textLen = displayText.length;
  const takeFontSize = textLen < 60 ? 72 : textLen < 120 ? 58 : textLen < 200 ? 46 : textLen < 320 ? 38 : 30;

  const handle = expert?.twitter_handle
    ? (expert.twitter_handle.startsWith("@") ? expert.twitter_handle : `@${expert.twitter_handle}`)
    : null;

  const cream = "#f5f1e9";

  // Image is full-width portrait — receipt fills the whole canvas
  const W = 1080;
  const H = 1350;

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
          padding: "52px 80px 44px",
          gap: 0,
        }}
      >
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: 0, marginBottom: 4 }}>
          {["RATE", "MY", "SPORTS", "TAKE"].map((word, i) => (
            <div key={word} style={{ display: "flex", alignItems: "center" }}>
              <span style={{ fontSize: 48, fontWeight: 900, color: "#1a1a1a", letterSpacing: "-0.03em", fontFamily: "Inter, sans-serif" }}>
                {word}
              </span>
              {i < 3 && (
                <span style={{ fontSize: 48, fontWeight: 900, color: "#e2241a", fontFamily: "Inter, sans-serif" }}>/</span>
              )}
            </div>
          ))}
        </div>
        <p style={{ fontSize: 12, letterSpacing: "0.2em", color: "#4b5563", fontFamily: "monospace", margin: "0 0 24px" }}>
          THE ACCOUNTABILITY INDEX
        </p>

        {/* ANALYST */}
        <Divider label="ANALYST" />
        <p style={{ fontSize: 72, fontWeight: 900, color: "#1a1a1a", letterSpacing: "-0.03em", fontFamily: "Inter, sans-serif", margin: "14px 0 0", textAlign: "center", textTransform: "uppercase" }}>
          {expert?.name ?? "Unknown Analyst"}
        </p>
        {handle && (
          <p style={{ fontSize: 22, color: "#6b7280", fontFamily: "monospace", margin: "4px 0 0", letterSpacing: "0.05em" }}>
            {handle}
          </p>
        )}

        {/* THE TAKE */}
        <div style={{ marginTop: 24, width: "100%", display: "flex", flexDirection: "column", alignItems: "center" }}>
          <Divider label="THE TAKE" />
        </div>
        <p style={{
          fontSize: takeFontSize,
          fontStyle: "italic",
          color: "#1a1a1a",
          textAlign: "center",
          lineHeight: 1.45,
          margin: "20px 0 8px",
          fontFamily: "serif",
          maxWidth: "100%",
          wordBreak: "break-word",
          overflowWrap: "break-word",
        }}>
          &ldquo;{displayText}&rdquo;
        </p>
        <p style={{ fontSize: 18, letterSpacing: "0.18em", color: "#6b7280", fontFamily: "monospace", margin: "0 0 24px" }}>
          POSTED · {dateMade}
        </p>

        {/* THE ANALYSIS */}
        {analysisText && (
          <>
            <div style={{ width: "100%", display: "flex", flexDirection: "column", alignItems: "center" }}>
              <Divider label="THE ANALYSIS" />
            </div>
            <p style={{
              fontSize: 32,
              color: "#374151",
              textAlign: "center",
              lineHeight: 1.55,
              margin: "18px 0 24px",
              fontFamily: "serif",
              fontStyle: "italic",
              maxWidth: "100%",
              wordBreak: "break-word",
              overflowWrap: "break-word",
            }}>
              {analysisText}
            </p>
          </>
        )}

        {/* FINAL GRADE */}
        <div style={{ width: "100%", display: "flex", flexDirection: "column", alignItems: "center" }}>
          <Divider label="FINAL GRADE" />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 40, marginTop: 20, marginBottom: 8 }}>
          {letterGrade ? (
            <span style={{ fontSize: 112, fontWeight: 900, color: gradeColor(letterGrade), fontFamily: "sans-serif", lineHeight: 1 }}>
              {letterGrade}
            </span>
          ) : (
            <span style={{ fontSize: 56, fontWeight: 900, color: "#9ca3af", fontFamily: "sans-serif" }}>—</span>
          )}
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={{ fontSize: 12, letterSpacing: "0.2em", color: "#9ca3af", fontFamily: "monospace" }}>VERDICT</span>
            <span style={{ fontSize: 32, fontWeight: 900, color: verdict.color, fontFamily: "sans-serif", letterSpacing: "0.02em" }}>
              {verdict.label}
            </span>
            <Barcode />
          </div>
        </div>

        {/* Footer */}
        <div style={{ marginTop: "auto", borderTop: "1px solid #d1d5db", paddingTop: 18, width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ width: 4, height: 36, backgroundColor: "#1a1a1a" }} />
          <p style={{ fontSize: 13, letterSpacing: "0.14em", color: "#6b7280", fontFamily: "monospace", textAlign: "center" }}>
            RateMySportsTake.com
          </p>
          <div style={{ width: 4, height: 36, backgroundColor: "#1a1a1a" }} />
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
