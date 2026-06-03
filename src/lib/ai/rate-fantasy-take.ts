import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

export interface FantasyRatingResult {
  boldness_score: number;       // 0–100
  grading_criteria: string;     // "Take is TRUE if… Take is FALSE if…"
  player_adp: number | null;    // estimated ADP if mentioned / inferable
  resolution_date: string | null; // YYYY-MM-DD when outcome can be verified
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

  const today = new Date().toISOString().split("T")[0];

  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 512,
    system: [
      {
        type: "text",
        text: `You are a fantasy football take analyst for an accountability platform.
Rate how bold/contrarian a fantasy prediction is, write precise grading criteria, and determine when the outcome can be verified.
Respond with valid JSON only — no markdown, no explanation.

Boldness scale (0–100):
0–20   = Obvious/safe (predicting a consensus top-5 pick to be good)
21–40  = Low risk (minor deviation from consensus)
41–60  = Moderate (going against some consensus wisdom)
61–80  = Bold (clear contrarian stance, significant ADP deviation)
81–100 = Very bold / moonshot (strong contrarian, player heavily doubted by consensus)

For ADP-based boldness: predicting someone 30+ spots above their ADP is very bold;
predicting someone to perform at their ADP is obvious. Weight in the category —
a breakout call on a top-5 pick is less bold than one on a pick outside the top-60.

Resolution date rules:
- Season-long NFL predictions (breakout/bust/sleeper): end of that NFL regular season, typically Jan 6 of the FOLLOWING year (e.g. "2026 NFL season" resolves 2027-01-06)
- Weekly start/sit or waiver: end of that specific week
- If the prediction is about "this season" and the NFL season in question hasn't started yet (current date is before September), use the upcoming season's end date
- Never set a resolution date in the past — if the natural date would be before today (${today}), add one year`,
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
  "player_adp": <estimated ADP as a number, or null if not applicable / already known>,
  "resolution_date": "<YYYY-MM-DD when the outcome can be definitively verified, never in the past>"
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

  // If the AI returns a past date, roll it forward year-by-year until it's in the future.
  // e.g. 2026-01-15 → 2027-01-15 when today is 2026-06-03.
  let resolutionDate: string | null = null;
  if (parsed.resolution_date && typeof parsed.resolution_date === "string") {
    let proposed = parsed.resolution_date;
    let safetyLimit = 0;
    while (proposed <= today && safetyLimit < 5) {
      const d = new Date(proposed + "T00:00:00");
      d.setFullYear(d.getFullYear() + 1);
      proposed = d.toISOString().split("T")[0];
      safetyLimit++;
    }
    resolutionDate = proposed > today ? proposed : null;
  }

  return {
    boldness_score:   Math.round(Math.min(100, Math.max(0, Number(parsed.boldness_score ?? 50)))),
    grading_criteria: String(parsed.grading_criteria ?? ""),
    player_adp:       parsed.player_adp != null ? Number(parsed.player_adp) : null,
    resolution_date:  resolutionDate,
  };
}
