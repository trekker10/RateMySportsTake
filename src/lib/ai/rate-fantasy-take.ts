import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

export interface FantasyRatingResult {
  boldness_score: number;       // 0–100
  grading_criteria: string;     // "Take is TRUE if… Take is FALSE if…"
  player_adp: number | null;    // estimated ADP if mentioned / inferable
  resolution_date: string | null; // YYYY-MM-DD when outcome can be verified
  sport_season: string | null;  // corrected season label if the stored one was wrong
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

CRITICAL — Sport season and resolution date:
The NFL season labeled "20XX NFL" runs September–January of 20XX/20XX+1 (e.g. "2026 NFL" = Sep 2026–Jan 2027).
End-of-regular-season dates: "2025 NFL" → 2026-01-05; "2026 NFL" → 2027-01-06; "2027 NFL" → 2028-01-03.

Step 1 — Detect stale sport_season: if date_made is AFTER the natural end of the stored sport_season, the analyst is talking about the NEXT season. E.g. date_made = 2026-06-03 with sport_season = "2025 NFL" (which ended 2026-01-05) → the take is actually about the "2026 NFL" season.

Step 2 — Set resolution_date based on the CORRECT season:
- Season-long predictions: end of the correct NFL regular season week 18
- Weekly start/sit or waiver: the Tuesday after that game week
- If outcome already happened: the actual past date it became clear

Step 3 — Return the corrected sport_season label in your JSON if you had to fix it.`,
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
  "grading_criteria": "<Take is TRUE if [specific measurable condition]. Take is FALSE if [opposite]>",
  "player_adp": <estimated ADP as a number, or null>,
  "resolution_date": "<YYYY-MM-DD — end of the CORRECT season/week, can be past if outcome already happened>",
  "sport_season": "<corrected season label e.g. '2026 NFL', or null if no correction needed>"
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

  // Accept any valid date — past dates are fine (they show as "Overdue", which is correct)
  const resolutionDate: string | null =
    parsed.resolution_date && typeof parsed.resolution_date === "string"
      ? parsed.resolution_date
      : null;

  return {
    boldness_score:   Math.round(Math.min(100, Math.max(0, Number(parsed.boldness_score ?? 50)))),
    grading_criteria: String(parsed.grading_criteria ?? ""),
    player_adp:       parsed.player_adp != null ? Number(parsed.player_adp) : null,
    resolution_date:  resolutionDate,
    sport_season:     parsed.sport_season && typeof parsed.sport_season === "string" ? parsed.sport_season : null,
  };
}
