import Anthropic from "@anthropic-ai/sdk";

export interface TakeInput {
  take_id: string;
  date_made: string;
  summary: string | null;
  raw_text: string | null;
  grading_criteria: string | null;
}

export interface FlipFlopPair {
  take_a_id: string;
  take_b_id: string;
  contradiction_summary: string;
}

export async function detectFlipFlops(takes: TakeInput[]): Promise<FlipFlopPair[]> {
  if (takes.length < 2) return [];

  const client = new Anthropic();

  // Format each take for the prompt — prefer grading_criteria (most specific), then summary, then raw
  const takesText = takes
    .map((t) => {
      const claim =
        t.grading_criteria?.trim() ||
        t.summary?.trim() ||
        t.raw_text?.trim() ||
        "(no text)";
      return `ID: ${t.take_id}\nDate: ${t.date_made}\nClaim: ${claim}`;
    })
    .join("\n\n---\n\n");

  const response = await client.messages.create({
    model: "claude-haiku-4-5",
    max_tokens: 2048,
    system: [
      {
        type: "text",
        text: "You are a sports analyst identifying flip-flops — cases where a pundit directly contradicted themselves. Respond with valid JSON only, no markdown.",
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: [
      {
        role: "user",
        content: `Find ALL flip-flops in these takes from a single analyst.

A flip-flop is: same subject (player, team, or specific topic) + opposing conclusion + both takes made within 365 days of each other. Generic opinion shifts ("I changed my mind about the team's potential") don't count — both takes must make concrete, falsifiable claims that directly contradict each other.

Takes:
${takesText}

Return JSON:
{
  "pairs": [
    {
      "take_a_id": "uuid-of-earlier-take",
      "take_b_id": "uuid-of-later-take",
      "contradiction_summary": "one punchy sentence — what they said, then what they said next"
    }
  ]
}

If no qualifying contradictions exist, return { "pairs": [] }.`,
      },
    ],
  });

  const raw = response.content[0].type === "text" ? response.content[0].text : "";
  const text = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();

  let parsed: { pairs?: FlipFlopPair[] };
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error(`AI returned invalid JSON: ${text.slice(0, 300)}`);
  }

  // Validate — only keep pairs where both IDs exist in the input
  const validIds = new Set(takes.map((t) => t.take_id));
  return (parsed.pairs ?? []).filter(
    (p) =>
      p.take_a_id &&
      p.take_b_id &&
      p.contradiction_summary &&
      validIds.has(p.take_a_id) &&
      validIds.has(p.take_b_id) &&
      p.take_a_id !== p.take_b_id
  );
}
