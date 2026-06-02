import { ImageResponse } from "@vercel/og";
import { createAdminClient } from "@/lib/supabase/admin";
import { scoreToGrade, DEFAULT_CONFIG, type TakeScoreConfig } from "@/lib/takescore";

async function fetchGradeConfig(supabase: ReturnType<typeof createAdminClient>): Promise<TakeScoreConfig> {
  const { data } = await supabase.from("take_score_config").select("*").eq("id", "default").single();
  const dbValues = Object.fromEntries(
    Object.entries(data ?? {}).filter(([, v]) => v != null),
  );
  return { ...DEFAULT_CONFIG, ...dbValues } as TakeScoreConfig;
}

export const runtime = "edge";

// ── Color system ─────────────────────────────────────────────────────────────
const PAPER   = "#f1ece0";
const INK     = "#161a17";
const INK_SOFT = "#454b46";
const INK_FAINT = "#8b9088";
const STAGE   = "#0c1410";
const GOOD    = "#1f8a4c";
const MID     = "#b8860b";
const LOSE    = "#c0392b";
const NEUTRAL = "#8b9088";

function outcomeColor(outcome: "good" | "mid" | "bad" | "pending"): string {
  if (outcome === "good") return GOOD;
  if (outcome === "mid")  return MID;
  if (outcome === "bad")  return LOSE;
  return NEUTRAL;
}

// ── Verdict from accuracy ─────────────────────────────────────────────────────
function fantasyVerdict(
  status: string,
  accuracy: number | null,
): { label: string; outcome: "good" | "mid" | "bad" | "pending" } {
  if (status !== "resolved" || accuracy === null)
    return { label: "PENDING", outcome: "pending" };
  if (accuracy >= 75) return { label: "NAILED IT",            outcome: "good" };
  if (accuracy >= 60) return { label: "MOSTLY RIGHT",         outcome: "good" };
  if (accuracy >= 50) return { label: "DIRECTIONALLY RIGHT",  outcome: "mid"  };
  if (accuracy >= 25) return { label: "HALF RIGHT",           outcome: "mid"  };
  if (accuracy > 0)   return { label: "MOSTLY WRONG",         outcome: "bad"  };
  return                     { label: "WHIFFED",              outcome: "bad"  };
}

// ── Text sanitiser — strip newlines, emojis, and extra whitespace ─────────────
function sanitize(raw: string): string {
  return raw
    // collapse all line-break variants to a single space
    .replace(/\r?\n|\r/g, " ")
    // strip emoji / pictograph ranges that loaded fonts can't render
    .replace(/[\u{1F000}-\u{1FFFF}]/gu, "")
    .replace(/[\u{2600}-\u{27BF}]/gu, "")
    // collapse runs of whitespace
    .replace(/\s{2,}/g, " ")
    .trim();
}

// ── Text-size thresholds — large, canvas-filling sizes for 920px width ───────
function callFontSize(chars: number): number {
  if (chars <= 60)  return 52;
  if (chars <= 100) return 44;
  if (chars <= 140) return 36;
  if (chars <= 180) return 29;
  return 24;
}

function callText(raw: string): string {
  if (raw.length <= 200) return raw;
  return raw.slice(0, 197).replace(/[.,;:]$/, "") + "\u2026";
}

function analysisFontSize(chars: number): number {
  if (chars <= 175) return 24;
  if (chars <= 250) return 21;
  if (chars <= 340) return 18;
  return 15;
}

function analysisText(raw: string): string {
  if (raw.length <= 345) return raw;
  return raw.slice(0, 342).replace(/[.,;:]$/, "") + "\u2026";
}

function analystFontSize(name: string): number {
  if (name.length <= 14) return 84;
  if (name.length <= 22) return 68;
  if (name.length <= 34) return 54;
  return 42;
}

function verdictFontSize(label: string): number {
  if (label.length <= 16) return 52;
  if (label.length <= 22) return 42;
  return 32;
}

// ── Font fetcher (TTF — Satori does not support WOFF2) ───────────────────────
async function fetchFont(family: string): Promise<ArrayBuffer | null> {
  try {
    // Use an old IE UA so Google Fonts returns TTF (format('truetype'))
    // instead of WOFF2, which Satori / fontkit cannot parse.
    const css = await fetch(
      `https://fonts.googleapis.com/css2?family=${family}&display=swap`,
      {
        headers: {
          "User-Agent": "Mozilla/4.0 (compatible; MSIE 5.0; Windows NT 5.0)",
        },
      },
    ).then((r) => r.text());

    const matches = [...css.matchAll(/src: url\((.+?)\) format\('truetype'\)/g)];
    const url = matches[matches.length - 1]?.[1];
    if (!url) return null;
    return await fetch(url).then((r) => r.arrayBuffer());
  } catch {
    return null;
  }
}

// ── Shared components ─────────────────────────────────────────────────────────
function SectionLabel({ text, monoFont }: { text: string; monoFont: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", width: "100%", gap: 10 }}>
      <div style={{ flex: 1, height: 2, backgroundColor: INK }} />
      <span
        style={{
          fontSize: 11,
          letterSpacing: "0.22em",
          color: INK,
          fontFamily: monoFont,
          whiteSpace: "nowrap",
        }}
      >
        {text}
      </span>
      <div style={{ flex: 1, height: 2, backgroundColor: INK }} />
    </div>
  );
}

function Barcode() {
  const bars = [3,1,2,1,3,2,1,2,3,1,2,3,1,2,1,3,2,1,3,1,2,1,2,3,1,2,1,3,2,1];
  return (
    <div style={{ display: "flex", alignItems: "flex-end", height: 44, gap: 2 }}>
      {bars.map((w, i) => (
        <div
          key={i}
          style={{
            width: w * 3,
            height: i % 3 === 0 ? 44 : 34,
            backgroundColor: INK,
          }}
        />
      ))}
    </div>
  );
}

// ── Perforated edge strip ─────────────────────────────────────────────────────
// Sits between a dark band and the cream body.
// "top"    → cream circles flush to bottom of dark band (bottom halves visible)
// "bottom" → cream circles flush to top of dark band (top halves visible)
function PerfStrip({ edge }: { edge: "top" | "bottom" }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: edge === "top" ? "flex-end" : "flex-start",
        height: 10,
        overflow: "hidden",
        width: 1080,
        backgroundColor: STAGE,
        flexShrink: 0,
      }}
    >
      {Array.from({ length: 64 }).map((_, i) => (
        <div
          key={i}
          style={{
            width: 18,
            height: 18,
            borderRadius: 9,
            backgroundColor: PAPER,
            flexShrink: 0,
          }}
        />
      ))}
    </div>
  );
}

// ── Route handler ─────────────────────────────────────────────────────────────
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ takeId: string }> },
) {
  const { takeId } = await params;
  const supabase = createAdminClient();

  // Fonts — load in parallel, fall back gracefully
  const [archivoData, spaceData, monoData] = await Promise.all([
    fetchFont("Archivo+Black"),
    fetchFont("Space+Grotesk:wght@400"),
    fetchFont("JetBrains+Mono"),
  ]);

  const [{ data: take }, gradeConfig] = await Promise.all([
    supabase
      .from("fantasy_takes")
      .select(
        "fantasy_take_id, raw_text, outcome_status, accuracy_score, grader_note, player_name, player_position, expert_id, experts(name)",
      )
      .eq("fantasy_take_id", takeId)
      .single(),
    fetchGradeConfig(supabase),
  ]);

  if (!take) return new Response("Not found", { status: 404 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const expertName: string = (take as any).experts?.name ?? "Unknown";
  const { label: verdictLabel, outcome } = fantasyVerdict(
    take.outcome_status,
    take.accuracy_score,
  );
  const outcomeCol = outcomeColor(outcome);

  const grade =
    take.accuracy_score != null
      ? scoreToGrade(take.accuracy_score, gradeConfig)
      : null;

  // Call text — sanitise newlines/emojis before sizing
  const rawCall = sanitize(take.raw_text ?? "");
  const displayCall = callText(rawCall);
  const callSize    = callFontSize(rawCall.length);

  // Analysis text (grader note → trimmed; pending → blank)
  const rawAnalysis   = sanitize(take.grader_note ?? "");
  const displayAnalysis = rawAnalysis ? analysisText(rawAnalysis) : null;
  const analysisSize    = displayAnalysis ? analysisFontSize(rawAnalysis.length) : 20;

  // Analyst name sizing
  const analystSize = analystFontSize(expertName);
  const vSize       = verdictFontSize(verdictLabel);

  const ARCHIVO = archivoData ? "Archivo Black" : "sans-serif";
  const SPACE   = spaceData   ? "Space Grotesk" : "sans-serif";
  const MONO    = monoData    ? "JetBrains Mono" : "monospace";

  const W = 1080;
  const H = 1080;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fonts: any[] = [];
  if (archivoData) fonts.push({ name: "Archivo Black", data: archivoData, weight: 900, style: "normal" });
  if (spaceData)   fonts.push({ name: "Space Grotesk", data: spaceData,   weight: 400, style: "normal" });
  if (monoData)    fonts.push({ name: "JetBrains Mono", data: monoData,   weight: 400, style: "normal" });

  return new ImageResponse(
    (
      // ── Full-bleed receipt — no side margins ─────────────────────────────────
      <div
        style={{
          width: W,
          height: H,
          backgroundColor: PAPER,
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* ── Dark top band ───────────────────────────────────────────────── */}
        <div style={{ width: W, height: 32, backgroundColor: STAGE, flexShrink: 0 }} />
        {/* Top perf strip — cream circles eating into dark band */}
        <PerfStrip edge="top" />

        {/* ── Paper body ──────────────────────────────────────────────────── */}
        <div
          style={{
            flex: 1,
            backgroundColor: PAPER,
            padding: "32px 80px 24px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 0,
          }}
        >
          {/* ── Wordmark ─────────────────────────────────────────────────── */}
          <div style={{ display: "flex", alignItems: "center", marginBottom: 4 }}>
            {(["RATE", "MY", "FANTASY", "TAKE"] as const).map((word, i) => (
              <div key={word} style={{ display: "flex", alignItems: "center" }}>
                <span
                  style={{
                    fontFamily: ARCHIVO,
                    fontSize: 42,
                    fontWeight: 900,
                    color: INK,
                    letterSpacing: "-0.03em",
                  }}
                >
                  {word}
                </span>
                {i < 3 && (
                  <span style={{ fontFamily: ARCHIVO, fontSize: 42, fontWeight: 900, color: GOOD }}>
                    /
                  </span>
                )}
              </div>
            ))}
          </div>

          {/* ── ANALYST ──────────────────────────────────────────────────── */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              width: "100%",
              marginTop: 20,
              gap: 0,
            }}
          >
            <SectionLabel text="ANALYST" monoFont={MONO} />
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                width: "100%",
                margin: "14px 0 18px",
              }}
            >
              <span
                style={{
                  fontFamily: ARCHIVO,
                  fontSize: analystSize,
                  fontWeight: 900,
                  fontStyle: "italic",
                  color: INK,
                  textTransform: "uppercase",
                  letterSpacing: "-0.02em",
                  textAlign: "center",
                }}
              >
                {expertName}
              </span>
            </div>
          </div>

          {/* ── THE CALL ─────────────────────────────────────────────────── */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              width: "100%",
              gap: 0,
            }}
          >
            <SectionLabel text="THE CALL" monoFont={MONO} />
            <p
              style={{
                fontFamily: SPACE,
                fontSize: callSize,
                fontStyle: "italic",
                fontWeight: 400,
                color: INK,
                textAlign: "center",
                lineHeight: 1.5,
                margin: "14px 0 18px",
                width: 920,
              }}
            >
              &ldquo;{displayCall}&rdquo;
            </p>
          </div>

          {/* ── THE ANALYSIS ─────────────────────────────────────────────── */}
          {displayAnalysis && (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                width: "100%",
                gap: 0,
              }}
            >
              <SectionLabel text="THE ANALYSIS" monoFont={MONO} />
              <p
                style={{
                  fontFamily: SPACE,
                  fontSize: analysisSize,
                  color: INK_SOFT,
                  textAlign: "center",
                  lineHeight: 1.65,
                  margin: "14px 0 18px",
                  width: 920,
                }}
              >
                {displayAnalysis}
              </p>
            </div>
          )}

          {/* ── FINAL GRADE ──────────────────────────────────────────────── */}
          <div
            style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "100%", gap: 0 }}
          >
            <SectionLabel text="FINAL GRADE" monoFont={MONO} />
          </div>
          <div
            style={{ display: "flex", alignItems: "center", gap: 36, margin: "18px 0 20px" }}
          >
            {grade ? (
              <span
                style={{ fontFamily: ARCHIVO, fontSize: 160, fontWeight: 900, color: outcomeCol, lineHeight: 1 }}
              >
                {grade}
              </span>
            ) : (
              <span
                style={{ fontFamily: ARCHIVO, fontSize: 110, fontWeight: 900, color: INK_FAINT, lineHeight: 1 }}
              >
                —
              </span>
            )}
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <span style={{ fontFamily: MONO, fontSize: 15, letterSpacing: "0.2em", color: INK_FAINT }}>
                VERDICT
              </span>
              <span
                style={{
                  fontFamily: ARCHIVO,
                  fontSize: vSize,
                  fontWeight: 900,
                  color: outcomeCol,
                  letterSpacing: "0.01em",
                  whiteSpace: "nowrap",
                }}
              >
                {verdictLabel}
              </span>
            </div>
          </div>

          {/* ── Barcode ──────────────────────────────────────────────────── */}
          <Barcode />

          {/* ── Footer ───────────────────────────────────────────────────── */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              width: "100%",
              marginTop: 18,
              gap: 8,
            }}
          >
            <div style={{ flex: 1, height: 1, backgroundColor: INK_FAINT }} />
            <span
              style={{
                fontFamily: MONO,
                fontSize: 13,
                letterSpacing: "0.14em",
                color: INK_FAINT,
                whiteSpace: "nowrap",
              }}
            >
              RateMySportsTake.com
            </span>
            <div style={{ flex: 1, height: 1, backgroundColor: INK_FAINT }} />
          </div>
        </div>

        {/* Bottom perf strip then dark band */}
        <PerfStrip edge="bottom" />
        <div style={{ width: W, height: 32, backgroundColor: STAGE, flexShrink: 0 }} />
      </div>
    ),
    {
      width: W,
      height: H,
      fonts: fonts.length > 0 ? fonts : undefined,
    },
  );
}
