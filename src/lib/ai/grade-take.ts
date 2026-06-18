import Anthropic from "@anthropic-ai/sdk";
import type { AgingVerdict, OutcomeStatus } from "@/types/database";

const client = new Anthropic();

export interface GradingResult {
  outcome_status: OutcomeStatus;
  outcome_notes: string;
  outcome_date: string;
  grade: number;
  grade_breakdown: {
    accuracy_score: number;
    difficulty_bonus: number;
    confidence_penalty: number;
  };
  grade_notes: string;
  aging_verdict: AgingVerdict;
}

export async function gradeTake(params: {
  expertName: string;
  rawText: string;
  summary: string;
  gradingCriteria: string;
  dateMade: string;
  timeHorizonDate: string;
  difficultyScore: number;
  confidenceClaimed: number;
}): Promise<GradingResult> {
  const {
    expertName, rawText, summary, gradingCriteria,
    dateMade, timeHorizonDate, difficultyScore, confidenceClaimed,
  } = params;

  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 2048,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    tools: [{ type: "web_search_20250305", name: "web_search" } as any],
    system: [
      {
        type: "text",
        text: "You are a sports take grader. Search the web to find out what actually happened, then grade the prediction objectively. Respond with a single valid JSON object only — no markdown, no explanation, no literal newlines inside string values (use a space instead).",
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: [
      {
        role: "user",
        content: `Grade this sports prediction.

Expert: ${expertName}
Take: "${rawText}"
One-line summary: ${summary}
Made on: ${dateMade}
Should resolve by: ${timeHorizonDate}
What makes this TRUE: ${gradingCriteria}
Difficulty: ${difficultyScore}/10
Confidence claimed: ${confidenceClaimed}/10

Search the web to find out what actually happened, then return this JSON:
{
  "outcome_status": "confirmed_true" | "confirmed_false" | "partially_true" | "unresolvable",
  "outcome_notes": "2-3 sentences on what actually happened and how it compares to the prediction",
  "grade": integer 0-100,
  "grade_breakdown": {
    "accuracy_score": 0-100,
    "difficulty_bonus": 0-20,
    "confidence_penalty": 0-20
  },
  "grade_notes": "2-3 sentences explaining the grade",
  "aging_verdict": "aged_well" | "aged_poorly" | "neutral" | "too_soon"
}

Grading scale:
- 90-100: Nailed it, especially impressive if it was a bold call
- 70-89: Mostly correct, core prediction held up
- 50-69: Partially right, mixed results
- 30-49: Mostly wrong
- 0-29: Clearly wrong — dock harder the more confidently it was stated

difficulty_bonus: up to +20 for bold correct predictions (difficulty 8-10)
confidence_penalty: up to +20 for overconfident wrong predictions (confidence 8-10 on a wrong call)
Final grade = clamp(accuracy_score + difficulty_bonus - confidence_penalty, 0, 100)`,
      },
    ],
  });

  const textBlocks = response.content.filter((b) => b.type === "text");
  const last = textBlocks[textBlocks.length - 1];
  if (!last || last.type !== "text") throw new Error("No text response from Claude");

  const match = last.text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("No JSON in grading response");

  let jsonStr = match[0];

  // Sanitize: replace literal newlines/tabs inside JSON string values
  // so that badly-escaped Claude output doesn't break JSON.parse
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(jsonStr);
  } catch {
    // Replace literal newlines inside quoted strings with a space
    jsonStr = jsonStr.replace(/"((?:[^"\\]|\\.)*)"/g, (_m, inner: string) =>
      `"${inner.replace(/\n/g, " ").replace(/\r/g, "").replace(/\t/g, " ")}"`
    );
    try {
      parsed = JSON.parse(jsonStr);
    } catch (e2) {
      throw new Error(`Grading JSON parse failed: ${e2 instanceof Error ? e2.message : e2} — raw: ${jsonStr.slice(0, 300)}`);
    }
  }

  return {
    ...parsed,
    outcome_date: new Date().toISOString().split("T")[0],
  } as GradingResult;
}
