import Anthropic from "@anthropic-ai/sdk";
import { createAdminClient } from "@/lib/supabase/admin";
import type { TakeType, TimeHorizon } from "@/types/database";

const client = new Anthropic();

const ANALYST_GUIDELINES = `# Take Resolution Guidelines — Sports Analyst Takes

## Step 1 — Identify Time Horizon from Language

| Language in Take | Time Horizon |
|---|---|
| "this week", "Sunday", "tonight", "in this game" | immediate |
| "this season", "this year", "in 2026", "down the stretch" | this_season |
| "next season", "going forward", "in the next few years" | multi_year |
| "never", "ever", "GOAT", "greatest", "in his career" | career |
| "by [future year]", "in the next X years" | multi_year |
| "if [condition]", "when [event] happens" | event_based |

## Step 2 — Resolution Dates by Sport & Horizon

If a SPORTS CALENDAR REFERENCE block is provided in the user message, use those exact dates.
Fall back to these rules only when the calendar doesn't cover the specific event:

NFL season calendar (critical — read carefully):
- Tweet in Feb–Jul of year Y → predicting the UPCOMING Y season → resolves Jan 7 of year Y+1
- Tweet in Aug–Dec of year Y → predicting the CURRENT Y season → resolves Jan 7 of year Y+1
- Tweet in Jan of year Y → tail end of Y-1 season → resolves Jan 7 of year Y

NFL: Immediate → end of that game week (next Monday) | This season / "in 2026" → Jan 7 of the following year (end of regular season, NOT Super Bowl) | Offseason/roster/draft → Sep 1 of the upcoming season | Multi-year → Jan 7 of the referenced future season end | Career → age-based
NBA: Immediate → end of that game night | This season → Jun 30 | Multi-year → end of referenced year | Career → age-based
MLB: Immediate → end of that game | This season → Nov 1 | Multi-year → end of referenced year | Career → age-based
NHL: This season → Jul 1 (after Stanley Cup) | Career → age-based

IMPORTANT for NFL "best season of career" or "career year" takes: These resolve at end of regular season (Jan 7), NOT Super Bowl. Stats like receptions, yards, and TDs are counted in the regular season only.

## Step 3 — Career Takes: Age-Based Estimation

Age 20–25 → career end ~35–37 | Age 26–29 → ~34–36 | Age 30–32 → ~35–37 | Age 33+ → ~36–38

NFL position adjustments: QB extend to ~38–40 | RB cap at ~31–32 | WR/TE through ~34–36 | Defensive through ~32–34
NBA position adjustments: Guards/wings through ~36–38 | Bigs/centers through ~33–35

Hard cap: resolution_date must not exceed 5 years from the tweet's posted date. For multi_year and career takes, cap at exactly 5 years out if the age-based estimate would go further.

## Step 4 — Edge Cases

- Contradicted early (injury, trade, firing) → grade immediately
- Conditional takes → resolve when condition triggers, or end of season
- Vague with no time reference → default to this_season
- Coach/GM/front office takes → end of current season or when decision is made

## Quick Decision Tree

Specific game or matchup? → immediate: end of that game week
"This season" / specific current year? → this_season: end of league regular season (Jan 7 NFL, Jun 30 NBA, Nov 1 MLB, Jul 1 NHL)
Offseason roster/draft/trade take? → Sep 1 NFL or start of referenced season
Future year or "next season"? → multi_year: end of that future season
"Never" / "career" / "GOAT" language? → career: age-based estimate (capped at 5 years)
None of the above? → default to this_season`;

interface RatingResult {
  take_type: TakeType;
  sport: string;
  subjects: string[];
  player_tags: string[];
  team_tags: string[];
  league_tag: string | null;
  difficulty_score: number;
  boldness_score: number;
  confidence_claimed: number;
  time_horizon: TimeHorizon;
  time_horizon_date: string | null;
  summary: string;
  grading_criteria: string;
  flags: string[];
}

async function buildCalendarBlock(tweetDate: string): Promise<string> {
  try {
    const supabase = createAdminClient();
    const today = tweetDate;
    const twoYearsOut = new Date(tweetDate);
    twoYearsOut.setFullYear(twoYearsOut.getFullYear() + 2);
    const twoYearsStr = twoYearsOut.toISOString().split("T")[0];

    const { data } = await supabase
      .from("sports_calendar")
      .select("event_name, league, event_date, is_estimated")
      .gte("event_date", today)
      .lte("event_date", twoYearsStr)
      .order("event_date");

    if (!data || data.length === 0) return "";

    const lines = ["SPORTS CALENDAR REFERENCE (use these exact dates for resolution_date calculations):"];
    for (const e of data) {
      const est = e.is_estimated ? " (est.)" : "";
      lines.push(`  ${e.event_date} — ${e.event_name} [${e.league}]${est}`);
    }
    return lines.join("\n");
  } catch (err) {
    console.warn("Could not load sports calendar:", err);
    return "";
  }
}

function applyFiveYearCap(date: string | null, tweetDate: string): string | null {
  if (!date) return null;
  const cap = new Date(tweetDate);
  cap.setFullYear(cap.getFullYear() + 5);
  const capStr = cap.toISOString().split("T")[0];
  if (date > capStr) {
    console.warn(`resolution_date ${date} exceeds 5-year cap — clamping to ${capStr}`);
    return capStr;
  }
  return date;
}

export async function rateTake(
  rawText: string,
  sport: string,
  sourceType: string,
  dateMade: string
): Promise<RatingResult> {
  const calendarBlock = await buildCalendarBlock(dateMade);

  const userContent = [
    calendarBlock ? calendarBlock + "\n" : "",
    `[Tweet posted on: ${dateMade}]`,
    "",
    `Analyze this sports take and return a JSON object.`,
    "",
    `Take: "${rawText}"`,
    `Source type: ${sourceType}`,
    `Sport context: ${sport}`,
    `Date made: ${dateMade}`,
    "",
    `Return JSON with exactly these fields:`,
    `{`,
    `  "take_type": one of "prediction" | "opinion" | "narrative" | "criticism" | "praise" | "stat_claim",`,
    `  "sport": standardized sport name (NBA, NFL, MLB, NHL, Soccer, College Football, College Basketball, MMA, Golf, Tennis, Other),`,
    `  "league_tag": more specific than sport when possible — e.g. "NFL Draft" or "NBA Draft" for draft takes, otherwise same as sport,`,
    `  "subjects": array of player and team names mentioned,`,
    `  "player_tags": array of full player names only (NOT coaches, teams, or analysts) — e.g. ["Patrick Mahomes"]. Return [] if none.,`,
    `  "team_tags": array of team names only (NOT players or coaches) — e.g. ["Kansas City Chiefs"]. Return [] if none.,`,
    `  "difficulty_score": integer 1-10 (1=safe/obvious take, 10=extremely bold or contrarian),`,
    `  "boldness_score": integer 0-100 mapping of difficulty (0-9=obvious, 10-39=safe, 40-69=moderate, 70-89=bold, 90-100=very bold/contrarian),`,
    `  "confidence_claimed": integer 1-10 (1=heavily hedged, 10=stated as an absolute guarantee),`,
    `  "time_horizon": one of "immediate" | "this_season" | "this_year" | "multi_year" | "career" | "unresolvable",`,
    `  "time_horizon_date": YYYY-MM-DD resolution date — use the sports calendar above when it covers this event, otherwise follow the guidelines. Must not exceed 5 years from the tweet date.,`,
    `  "summary": one sentence restating the claim in first person as if the analyst said it themselves (e.g. "I think Romeo Doubs will be transformative for the Patriots." — NOT "The analyst predicts..."),`,
    `  "grading_criteria": specific measurable definition of what would make this take TRUE (used for grading later). For career-comparison takes, state the condition in relative terms WITHOUT citing specific historical stat numbers you may not have accurate data for. Let the grader look up exact career highs at resolution time.,`,
    `  "flags": array of zero or more from ["bold_call", "guaranteed", "flip_risk", "vague", "unfalsifiable", "recency_bias", "hot_take", "contrarian"]`,
    `}`,
  ].filter(Boolean).join("\n");

  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
    system: [
      {
        type: "text",
        text: `You are a sports take analyst for a take accountability platform. Objectively analyze sports takes and rate them on specific dimensions. Always respond with valid JSON only — no markdown, no explanation, no code fences.

When determining time_horizon and time_horizon_date, follow these resolution guidelines exactly:

${ANALYST_GUIDELINES}`,
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: [{ role: "user", content: userContent }],
  });

  const raw = response.content[0].type === "text" ? response.content[0].text : "";
  const text = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let parsed: any;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error(`AI returned invalid JSON: ${text.slice(0, 200)}`);
  }

  const rawDate = parsed.time_horizon_date ?? null;
  const cappedDate = applyFiveYearCap(rawDate, dateMade);

  return {
    take_type: parsed.take_type,
    sport: parsed.sport,
    subjects: parsed.subjects ?? [],
    player_tags: parsed.player_tags ?? [],
    team_tags: parsed.team_tags ?? [],
    league_tag: parsed.league_tag ?? parsed.sport ?? null,
    difficulty_score: parsed.difficulty_score,
    boldness_score: parsed.boldness_score ?? Math.min(100, Math.max(0, (parsed.difficulty_score ?? 5) * 10)),
    confidence_claimed: parsed.confidence_claimed,
    time_horizon: parsed.time_horizon,
    time_horizon_date: cappedDate,
    summary: parsed.summary,
    grading_criteria: parsed.grading_criteria,
    flags: parsed.flags ?? [],
  };
}
