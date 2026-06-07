import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

const FANTASY_GUIDELINES = `# Take Resolution Guidelines — Fantasy Football Takes

## Step 1 — Identify Time Horizon from Language

| Language | Horizon |
|---|---|
| "this week", "in Week X", "start him Sunday", "sit him" | Weekly |
| "this season", "in 2026", "rest of year", "ROS" | Season-long |
| "next season", "in 2027", "redraft next year" | Next season |
| "dynasty", "long-term hold", "next 3 years" | Dynasty / multi-year |
| "never draft", "always a bust", "career backup" | Career / dynasty |

## Step 2 — Resolution Dates by Fantasy Horizon

Weekly start/sit → End of that NFL game week (Sunday night or Monday for MNF)
Waiver wire add → End of that week
Season-long projection → Jan 7 (year+1) — after fantasy championship week
Preseason/redraft take about current season → Jan 7 (same year+1)
Redraft take in offseason about next season → Jan 7 (year+2)
Dynasty / multi-year → Jan 7 (year+3 or +4) — judgment call based on language
Career / "never draft again" → Age-based (see Step 3)

Key rule: Always resolve to the fantasy championship week, not NFL regular season end.

## Step 3 — Career/Dynasty Takes: Age-Based Estimation

RB: fantasy-relevant through ~29–30 (workload drops fast)
WR: fantasy-relevant through ~33–34
TE: fantasy-relevant through ~34–35 (Kelce effect)
QB: fantasy-relevant through ~37–38

Age 22–24 → through ~30 | Age 25–27 → through ~30–31 | Age 28–29 → through ~31–32 | Age 30+ → through ~32–33

## Step 4 — Fantasy-Specific Edge Cases

ADP/draft ranking takes → resolve Jan 7 of the season they reference
Injury/usage takes ("X will be lead back once Y returns") → end of that season OR when usage clarifies, whichever first
Trade advice ("sell high on X") → end of that season
Breakout/bust calls → season-long, Jan 7 of that season's end
Dynasty rookie takes → Jan 7 three seasons out as default

## Quick Decision Tree

Weekly advice (start/sit/waiver/matchup)? → End of that game week
Season-long projection or breakout/bust call? → Jan 7 of that season's end (e.g. Jan 7, 2027 for 2026 season)
Offseason redraft take about upcoming season? → Jan 7 of that upcoming season's end
Dynasty or "long-term" language? → Jan 7, three seasons out (adjust based on player age)
"Never draft" / "always avoid" / career bust? → Age-based: RB cap at 30, WR at 34, TE at 35
ADP or draft value take? → Jan 7 of the season those drafts feed into
None of the above? → Default to Jan 7 of current season's end`;

export interface FantasyTakeAnalysis {
  player_name: string | null;
  player_position: string | null;
  category: string;
  timing_window: string;
  format: "dynasty" | "redraft" | "both";
  is_weekly: boolean;
  sport_season: string;
  resolution_date: string;
  summary: string;
  reasoning: string;
  grading_criteria: string;
}

export async function analyzeFantasyTweet(
  rawText: string,
  dateMade: string,
): Promise<FantasyTakeAnalysis> {
  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
    system: [
      {
        type: "text",
        text: `You are a fantasy sports analyst for a take accountability platform. Analyze fantasy sports tweets and extract structured metadata. Always respond with valid JSON only — no markdown, no explanation, no code fences.

Category definitions:
- breakout_call: Season-long prediction a player will finish at least one full tier above their ADP
- bust_call: Season-long prediction a drafted player (rounds 1-2) will underperform / finish outside top 24 at position
- sleeper_pick: Season-long prediction on a late-round/undrafted player who will emerge as a top option
- start_sit: Weekly prediction to start or sit a specific player this week
- waiver_add: Prediction on a low-owned player to add off waivers for a strong week or rest of season

Timing window definitions:
- post_draft: Immediately after or during the draft (pre-season hasn't started)
- preseason: During NFL preseason games (August)
- early_season: Weeks 1-6 of the regular season
- midseason: Weeks 7-11
- late_season: Weeks 12-17
- playoffs: Weeks 14+ / fantasy playoff weeks

Dynasty vs Redraft signals:
- dynasty: mentions "dynasty", "keeper", "devy", "dynasty league", age/development for future value
- redraft: mentions "this week", "this season", "2026 season", start/sit decisions, streaming
- both: applicable to both formats, or ambiguous

When determining resolution_date, follow these Fantasy Take Resolution Guidelines exactly:

${FANTASY_GUIDELINES}`,
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: [
      {
        role: "user",
        content: `Analyze this fantasy sports tweet and extract metadata.

Tweet: "${rawText}"
Date made: ${dateMade}

Return JSON with exactly these fields:
{
  "player_name": primary player mentioned (full name, or null if no specific player),
  "player_position": "QB" | "RB" | "WR" | "TE" | "K" | "DEF" | null,
  "category": "breakout_call" | "bust_call" | "sleeper_pick" | "start_sit" | "waiver_add",
  "timing_window": "post_draft" | "preseason" | "early_season" | "midseason" | "late_season" | "playoffs",
  "format": "dynasty" | "redraft" | "both",
  "is_weekly": true if this is a single-week prediction (start/sit this week, stream this week), false if season-long,
  "sport_season": the NFL season year as a string e.g. "2026 NFL" — infer from context or use the year closest to the date made,
  "resolution_date": YYYY-MM-DD date determined by the Fantasy Take Resolution Guidelines above — use the take language, sport_season, player position, and date_made to pick the correct date,
  "summary": one neutral sentence describing exactly what is being predicted,
  "reasoning": one sentence explaining your category/timing/format choices,
  "grading_criteria": "Take is TRUE if [specific measurable condition — player stats, finish position, rank relative to ADP, etc.]. Take is FALSE if [the opposite condition]."
}`,
      },
    ],
  });

  const text = response.content[0].type === "text" ? response.content[0].text : "";
  const cleaned = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();

  try {
    const parsed = JSON.parse(cleaned);
    return {
      player_name:      parsed.player_name     ?? null,
      player_position:  parsed.player_position ?? null,
      category:         parsed.category        ?? "breakout_call",
      timing_window:    parsed.timing_window   ?? "early_season",
      format:           parsed.format          ?? "both",
      is_weekly:        parsed.is_weekly       ?? false,
      sport_season:     parsed.sport_season    ?? "2026 NFL",
      resolution_date:  parsed.resolution_date ?? `${new Date().getFullYear() + 1}-01-07`,
      summary:          parsed.summary         ?? "",
      reasoning:        parsed.reasoning       ?? "",
      grading_criteria: parsed.grading_criteria ?? "",
    };
  } catch {
    return {
      player_name: null, player_position: null,
      category: "breakout_call", timing_window: "early_season",
      format: "both", is_weekly: false, sport_season: "2026 NFL",
      resolution_date: `${new Date().getFullYear() + 1}-01-07`,
      summary: "", reasoning: "", grading_criteria: "",
    };
  }
}
