import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

export interface FantasyGradingResult {
  accuracy_score: 100 | 75 | 60 | 50 | 25 | 0;
  grader_note: string;        // 2-3 sentences on what actually happened
  outcome_status: "resolved";
}

const CATEGORY_CRITERIA: Record<string, string> = {
  breakout_call:
    "A season-long breakout call hits if the player finishes at least one full tier above their preseason ADP — e.g. finishing top-12 when drafted outside top-24, or top-24 when drafted outside top-36.",
  bust_call:
    "A bust call hits if the player drafted in rounds 1-3 finishes well below positional expectations — e.g. outside top-24 at their position despite being a top-36 pick.",
  sleeper_pick:
    "A sleeper pick hits if the player (drafted outside top 100 overall) finishes as a top-20 option at their position for the season.",
  start_sit:
    "A weekly START call hits if the player finishes top-12 at their position that scoring week. A SIT call hits if the player finishes outside the top-20 at their position that week.",
  waiver_add:
    "A waiver add hits if the player (owned in under 30% of leagues) finishes as a top-20 weekly scorer at their position that scoring week or run of weeks.",
};

export async function gradeFantasyTake(params: {
  expertName: string;
  rawText: string;
  category: string;
  playerName: string | null;
  playerPosition: string | null;
  playerAdp: number | null;
  timingWindow: string | null;
  boldnessScore: number | null;
  dateMade: string;
  resolutionDate: string | null;
  sportSeason: string | null;
}): Promise<FantasyGradingResult> {
  const {
    expertName, rawText, category, playerName, playerPosition,
    playerAdp, timingWindow, boldnessScore, dateMade, resolutionDate, sportSeason,
  } = params;

  const categoryCriteria = CATEGORY_CRITERIA[category] ?? "Evaluate based on whether the prediction came true.";

  const playerDesc = [
    playerName,
    playerPosition ? `(${playerPosition})` : null,
    playerAdp ? `ADP ${playerAdp}` : null,
  ].filter(Boolean).join(" ");

  const contextLines = [
    `Expert: ${expertName}`,
    `Take: "${rawText}"`,
    `Category: ${category.replace(/_/g, " ")}`,
    playerDesc ? `Player: ${playerDesc}` : null,
    sportSeason ? `Season/Sport: ${sportSeason}` : null,
    timingWindow ? `Timing: ${timingWindow.replace(/_/g, " ")}` : null,
    boldnessScore != null ? `Boldness score: ${boldnessScore}/100` : null,
    `Made on: ${dateMade}`,
    resolutionDate ? `Should resolve by: ${resolutionDate}` : null,
  ].filter(Boolean).join("\n");

  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    tools: [{ type: "web_search_20250305", name: "web_search" } as any],
    system: [
      {
        type: "text",
        text: "You are a fantasy football take grader. Search the web to find actual player stats and fantasy outcomes, then grade the prediction using the provided accuracy scale. Respond with a JSON object only — no markdown, no explanation.",
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: [
      {
        role: "user",
        content: `Grade this fantasy football prediction.

${contextLines}

Grading criteria for this category:
${categoryCriteria}

Search the web for actual stats and fantasy results for ${playerName ?? "the relevant player(s)"} for the ${sportSeason ?? "relevant season/week"}. Then return ONLY this JSON:

{
  "accuracy_score": <one of: 100, 75, 60, 50, 25, 0>,
  "grader_note": "<2-3 sentences: what actually happened and how it compares to the prediction>"
}

Accuracy scale:
- 100 = Nailed It — prediction was completely correct, player/outcome matched perfectly
- 75  = Mostly Right — core prediction held, minor details off
- 60  = Directionally Right — headed the right direction but didn't fully land
- 50  = Half Right — mixed, about as right as wrong
- 25  = Mostly Wrong — prediction mostly didn't pan out
- 0   = Wrong — prediction was clearly incorrect

If the outcome cannot be determined yet (season/week hasn't finished, stats unavailable), set accuracy_score to null and explain in grader_note. But only use null if truly unresolvable — otherwise pick the closest tier.`,
      },
    ],
  });

  const textBlocks = response.content.filter((b) => b.type === "text");
  const last = textBlocks[textBlocks.length - 1];
  if (!last || last.type !== "text") throw new Error("No text response from Claude");

  const match = last.text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("No JSON in grading response");

  const parsed = JSON.parse(match[0]);

  // Snap to the nearest valid tier
  const VALID_SCORES = [100, 75, 60, 50, 25, 0] as const;
  const raw = Number(parsed.accuracy_score);
  const snapped = VALID_SCORES.reduce((prev, curr) =>
    Math.abs(curr - raw) < Math.abs(prev - raw) ? curr : prev
  );

  return {
    accuracy_score: snapped,
    grader_note: parsed.grader_note ?? "",
    outcome_status: "resolved",
  };
}
