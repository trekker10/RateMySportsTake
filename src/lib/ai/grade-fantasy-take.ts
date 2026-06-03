import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

export interface FantasyGradingResult {
  accuracy_score: number;     // 0–100, any integer
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
  "accuracy_score": <integer 0–100>,
  "grader_note": "<2-3 sentences: what actually happened and how it compares to the prediction>"
}

Accuracy scale (use any integer 0–100 — be precise, not just round numbers):
- 90–100 = Nailed it — prediction correct in every meaningful way
- 75–89  = Mostly right — core call landed, small details off
- 60–74  = Directionally right — right trend, didn't fully materialise
- 40–59  = Mixed — roughly as right as wrong
- 20–39  = Mostly wrong — prediction largely didn't pan out
- 0–19   = Wrong — clearly incorrect

Use the full range. A prediction that was 80% right should score ~80, not 75 or 100.
If the outcome truly cannot be determined yet (season/week hasn't finished, stats unavailable), set accuracy_score to null and explain in grader_note.`,
      },
    ],
  });

  const textBlocks = response.content.filter((b) => b.type === "text");
  const last = textBlocks[textBlocks.length - 1];
  if (!last || last.type !== "text") throw new Error("No text response from Claude");

  const match = last.text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("No JSON in grading response");

  const parsed = JSON.parse(match[0]);

  // Clamp to 0–100 and round to nearest integer
  const raw = Number(parsed.accuracy_score);
  const clamped = Math.round(Math.min(100, Math.max(0, raw)));

  return {
    accuracy_score: clamped,
    grader_note: parsed.grader_note ?? "",
    outcome_status: "resolved",
  };
}
