import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

export interface FantasyTakeAnalysis {
  player_name: string | null;
  player_position: string | null;        // QB, RB, WR, TE, K, DEF
  category: string;                      // breakout_call | bust_call | sleeper_pick | start_sit | waiver_add
  timing_window: string;                 // preseason | post_draft | early_season | midseason | late_season | playoffs
  format: "dynasty" | "redraft" | "both";
  is_weekly: boolean;                    // true = start/sit/waiver week-specific take
  sport_season: string;                  // e.g. "2026 NFL"
  summary: string;
  reasoning: string;
  grading_criteria: string;             // "Take is TRUE if X. Take is FALSE if Y."
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
- both: applicable to both formats, or ambiguous`,
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
  "summary": one neutral sentence describing exactly what is being predicted,
  "reasoning": one sentence explaining your category/timing/format choices,
  "grading_criteria": "Take is TRUE if [specific measurable condition — player stats, finish position, rank relative to ADP, etc.]. Take is FALSE if [the opposite condition]."
}`,
      },
    ],
  });

  const text = response.content[0].type === "text" ? response.content[0].text : "";

  try {
    const parsed = JSON.parse(text);
    return {
      player_name:     parsed.player_name ?? null,
      player_position: parsed.player_position ?? null,
      category:        parsed.category        ?? "breakout_call",
      timing_window:   parsed.timing_window   ?? "early_season",
      format:          parsed.format          ?? "both",
      is_weekly:       parsed.is_weekly       ?? false,
      sport_season:    parsed.sport_season    ?? "2026 NFL",
      summary:          parsed.summary          ?? "",
      reasoning:        parsed.reasoning        ?? "",
      grading_criteria: parsed.grading_criteria ?? "",
    };
  } catch {
    return {
      player_name: null, player_position: null,
      category: "breakout_call", timing_window: "early_season",
      format: "both", is_weekly: false, sport_season: "2026 NFL",
      summary: "", reasoning: "", grading_criteria: "",
    };
  }
}
