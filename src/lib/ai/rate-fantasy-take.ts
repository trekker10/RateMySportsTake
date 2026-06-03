import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

export interface FantasyRatingResult {
  boldness_score: number;       // 0–100
  grading_criteria: string;     // "Take is TRUE if… Take is FALSE if…"
  player_adp: number | null;    // estimated ADP if mentioned / inferable
}

const CATEGORY_CONTEXT: Record<string, string> = {
  breakout_call:  "Season-long prediction a player will finish at least one full tier above their ADP",
  bust_call:      "Season-long prediction a drafted player will underperform / finish outside top-24 at position",
  sleeper_pick:   "Season-long sleeper — late-round or undrafted player expected to emerge as a top option",
  start_sit:      "Weekly start/sit recommendation",
  waiver_add:     "Waiver wire add for a strong week or rest of season",
  draft_strategy: "Draft strategy or ADP-based value call",
};

export async function rateFantasyTake(params: {
  rawText: string;
  playerName: string | null;
  playerPosition: string | null;
  playerAdp: number | null;
  category: string;
  timingWindow: string | null;
  sportSeason: string | null;
  dateMade: string;
}): Promise<FantasyRatingResult> {
  const {
    rawText, playerName, playerPosition, playerAdp,
    category, timingWindow, sportSeason, dateMade,
  } = params;

  const categoryDesc = CATEGORY_CONTEXT[category] ?? "Fantasy football prediction";

  const contextLines = [
    `Take: "${rawText}"`,
    `Category: ${category.replace(/_/g, " ")} — ${categoryDesc}`,
    playerName     ? `Player: ${playerName}${playerPosition ? ` (${playerPosition})` : ""}` : null,
    playerAdp != null ? `Known ADP: ${playerAdp}` : null,
    timingWindow   ? `Timing: ${timingWindow.replace(/_/g, " ")}` : null,
    sportSeason    ? `Season: ${sportSeason}` : null,
    `Date made: ${dateMade}`,
  ].filter(Boolean).join("\n");

  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 512,
    system: [
      {
        type: "text",
        text: `You are a fantasy football take analyst for an accountability platform.
Rate how bold/contrarian a fantasy prediction is and write precise grading criteria.
Respond with valid JSON only — no markdown, no explanation.

Boldness scale (0–100):
0–20   = Obvious/safe (predicting a consensus top-5 pick to be good)
21–40  = Low risk (minor deviation from consensus)
41–60  = Moderate (going against some consensus wisdom)
61–80  = Bold (clear contrarian stance, significant ADP deviation)
81–100 = Very bold / moonshot (strong contrarian, player heavily doubted by consensus)

For ADP-based boldness: predicting someone 30+ spots above their ADP is very bold;
predicting someone to perform at their ADP is obvious. Weight in the category —
a breakout call on a top-5 pick is less bold than one on a pick outside the top-60.`,
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: [
      {
        role: "user",
        content: `Rate this fantasy take.

${contextLines}

Return ONLY this JSON:
{
  "boldness_score": <integer 0–100>,
  "grading_criteria": "<Take is TRUE if [specific measurable condition — player stats, finish position, rank vs ADP, etc.]. Take is FALSE if [opposite]>",
  "player_adp": <estimated ADP as a number, or null if not applicable / already known>
}`,
      },
    ],
  });

  const raw = response.content[0].type === "text" ? response.content[0].text : "";
  const text = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error(`AI returned invalid JSON: ${text.slice(0, 200)}`);
  }

  return {
    boldness_score:   Math.round(Math.min(100, Math.max(0, Number(parsed.boldness_score ?? 50)))),
    grading_criteria: String(parsed.grading_criteria ?? ""),
    player_adp:       parsed.player_adp != null ? Number(parsed.player_adp) : null,
  };
}
