import Anthropic from "@anthropic-ai/sdk";
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
"Never" / "career" / "GOAT" language? → career: age-based estimate
None of the above? → default to this_season`;

interface RatingResult {
  take_type: TakeType;
  sport: string;
  subjects: string[];
  difficulty_score: number;
  boldness_score: number;
  confidence_claimed: number;
  time_horizon: TimeHorizon;
  time_horizon_date: string | null;
  summary: string;
  grading_criteria: string;
  flags: string[];
}

export async function rateTake(
  rawText: string,
  sport: string,
  sourceType: string,
  dateMade: string
): Promise<RatingResult> {
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
    messages: [
      {
        role: "user",
        content: `Analyze this sports take and return a JSON object.

Take: "${rawText}"
Source type: ${sourceType}
Sport context: ${sport}
Date made: ${dateMade}

Return JSON with exactly these fields:
{
  "take_type": one of "prediction" | "opinion" | "narrative" | "criticism" | "praise" | "stat_claim",
  "sport": standardized sport name (NBA, NFL, MLB, NHL, Soccer, College Football, College Basketball, MMA, Golf, Tennis, Other),
  "subjects": array of player and team names mentioned,
  "difficulty_score": integer 1-10 (1=safe/obvious take, 10=extremely bold or contrarian),
  "boldness_score": integer 0-100 mapping of difficulty (0-9=obvious, 10-39=safe, 40-69=moderate, 70-89=bold, 90-100=very bold/contrarian),
  "confidence_claimed": integer 1-10 (1=heavily hedged, 10=stated as an absolute guarantee),
  "time_horizon": one of "immediate" | "this_season" | "this_year" | "multi_year" | "career" | "unresolvable",
  "time_horizon_date": YYYY-MM-DD resolution date determined by the guidelines above — use the sport, horizon type, and date_made to pick the correct date,
  "summary": one sentence restating the claim in first person as if the analyst said it themselves (e.g. "I think Romeo Doubs will be transformative for the Patriots." — NOT "The analyst predicts..."),
  "grading_criteria": specific measurable definition of what would make this take TRUE (used for grading later). For career-comparison takes like "best season of career", state the condition in relative terms (e.g. "Pickens surpasses his career highs in at least 2 of 3 major receiving categories — receptions, yards, TDs — by end of the 2026 regular season") WITHOUT citing specific historical stat numbers you may not have accurate data for. Let the grader look up the exact career highs at resolution time.,
  "flags": array of zero or more from ["bold_call", "guaranteed", "flip_risk", "vague", "unfalsifiable", "recency_bias", "hot_take", "contrarian"]
}`,
      },
    ],
  });

  const raw =
    response.content[0].type === "text" ? response.content[0].text : "";
  const text = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let parsed: any;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error(`AI returned invalid JSON: ${text.slice(0, 200)}`);
  }

  return {
    take_type: parsed.take_type,
    sport: parsed.sport,
    subjects: parsed.subjects ?? [],
    difficulty_score: parsed.difficulty_score,
    boldness_score: parsed.boldness_score ?? Math.min(100, Math.max(0, (parsed.difficulty_score ?? 5) * 10)),
    confidence_claimed: parsed.confidence_claimed,
    time_horizon: parsed.time_horizon,
    time_horizon_date: parsed.time_horizon_date ?? null,
    summary: parsed.summary,
    grading_criteria: parsed.grading_criteria,
    flags: parsed.flags ?? [],
  };
}
