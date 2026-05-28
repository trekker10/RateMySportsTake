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

// Simple barcode lines as SVG-ish pattern using divs
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

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ takeId: string }> }
) {
  const { takeId } = await params;
  const supabase = await createClient();

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
  const displayText = (take.summary ?? take.raw_text).replace(/^The analyst/i, "Analyst");
  const dateMade = new Date(take.date_made).toLocaleDateString("en-US", {
    month: "long", day: "numeric", year: "numeric",
  }).toUpperCase();

  // Scale font based on text length
  const textLen = displayText.length;
  const fontSize = textLen < 80 ? 32 : textLen < 140 ? 26 : textLen < 220 ? 22 : 18;

  const handle = expert?.twitter_handle
    ? (expert.twitter_handle.startsWith("@") ? expert.twitter_handle : `@${expert.twitter_handle}`)
    : null;

  const bg = "#2a0a08"; // dark maroon background
  const cream = "#f5f1e9"; // receipt paper

  return new ImageResponse(
    (
      <div
        style={{
          width: 1080,
          height: 1080,
          backgroundColor: bg,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "serif",
        }}
      >
        {/* Receipt card */}
        <div
          style={{
            width: 700,
            backgroundColor: cream,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            padding: "48px 56px 40px",
            gap: 0,
          }}
        >
          {/* Logo */}
          <div style={{ display: "flex", alignItems: "center", gap: 0, marginBottom: 4 }}>
            {["RATE", "MY", "SPORTS", "TAKE"].map((word, i) => (
              <div key={word} style={{ display: "flex", alignItems: "center" }}>
                <span style={{ fontSize: 28, fontWeight: 900, color: "#1a1a1a", letterSpacing: "-0.02em", fontFamily: "sans-serif" }}>
                  {word}
                </span>
                {i < 3 && (
                  <span style={{ fontSize: 28, fontWeight: 900, color: "#e2241a", fontFamily: "sans-serif" }}>/</span>
                )}
              </div>
            ))}
          </div>
          <p style={{ fontSize: 11, letterSpacing: "0.2em", color: "#4b5563", fontFamily: "monospace", margin: "0 0 20px" }}>
            THE ACCOUNTABILITY INDEX
          </p>

          {/* Divider + ANALYST */}
          <Divider label="ANALYST" />

          {/* Name */}
          <p style={{ fontSize: 38, fontWeight: 900, color: "#1a1a1a", letterSpacing: "-0.01em", fontFamily: "sans-serif", margin: "12px 0 0", textAlign: "center", textTransform: "uppercase" }}>
            {expert?.name ?? "Unknown Analyst"}
          </p>
          {handle && (
            <p style={{ fontSize: 14, color: "#6b7280", fontFamily: "monospace", margin: "4px 0 0", letterSpacing: "0.05em" }}>
              {handle}
            </p>
          )}

          {/* Divider + THE TAKE */}
          <div style={{ marginTop: 20, width: "100%", display: "flex", flexDirection: "column", alignItems: "center" }}>
            <Divider label="THE TAKE" />
          </div>

          {/* Take text */}
          <p style={{
            fontSize,
            fontStyle: "italic",
            color: "#1a1a1a",
            textAlign: "center",
            lineHeight: 1.45,
            margin: "18px 0 18px",
            fontFamily: "serif",
          }}>
            &ldquo;{displayText}&rdquo;
          </p>

          {/* Date */}
          <p style={{ fontSize: 11, letterSpacing: "0.18em", color: "#6b7280", fontFamily: "monospace", margin: "0 0 20px" }}>
            TAKE MADE ON {dateMade}
          </p>

          {/* Divider + FINAL GRADE */}
          <div style={{ width: "100%", display: "flex", flexDirection: "column", alignItems: "center" }}>
            <Divider label="FINAL GRADE" />
          </div>

          {/* Grade + Verdict row */}
          <div style={{ display: "flex", alignItems: "center", gap: 32, marginTop: 16, marginBottom: 4 }}>
            {letterGrade ? (
              <span style={{ fontSize: 96, fontWeight: 900, color: gradeColor(letterGrade), fontFamily: "sans-serif", lineHeight: 1 }}>
                {letterGrade}
              </span>
            ) : (
              <span style={{ fontSize: 48, fontWeight: 900, color: "#9ca3af", fontFamily: "sans-serif" }}>—</span>
            )}
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <span style={{ fontSize: 11, letterSpacing: "0.2em", color: "#9ca3af", fontFamily: "monospace" }}>VERDICT</span>
              <span style={{ fontSize: 28, fontWeight: 900, color: verdict.color, fontFamily: "sans-serif", letterSpacing: "0.02em" }}>
                {verdict.label}
              </span>
              <Barcode />
            </div>
          </div>

          {/* Footer */}
          <div style={{ marginTop: 20, borderTop: "1px solid #d1d5db", paddingTop: 16, width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ width: 4, height: 32, backgroundColor: "#1a1a1a" }} />
            <p style={{ fontSize: 12, letterSpacing: "0.14em", color: "#6b7280", fontFamily: "monospace", textAlign: "center" }}>
              See more receipts at{"\n"}RateMySportsTake.com
            </p>
            <div style={{ width: 4, height: 32, backgroundColor: "#1a1a1a" }} />
          </div>
        </div>
      </div>
    ),
    {
      width: 1080,
      height: 1080,
    }
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
