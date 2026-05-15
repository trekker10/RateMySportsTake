"use server";

import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

export interface FoundTake {
  raw_text: string;
  source_url: string;
  date_made: string;
  source_type: "article" | "podcast" | "tv_segment" | "radio" | "other";
}

export async function searchExpertTakes(
  expertName: string,
  topic: string
): Promise<FoundTake[]> {
  const query = [expertName, topic, "prediction OR take OR says"].filter(Boolean).join(" ");

  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 4096,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    tools: [{ type: "web_search_20250305", name: "web_search" } as any],
    system:
      "You are a research assistant finding sports predictions and takes from web sources. After searching, respond with a JSON array only — no markdown, no explanation.",
    messages: [
      {
        role: "user",
        content: `Search the web for specific predictions, bold claims, and takes made by ${expertName}${topic ? ` about ${topic}` : ""}. Look for quotes from articles, podcast recaps, and other web pages — not tweets.

Search query to start with: "${query}"

After searching, return a JSON array of what you find:
[
  {
    "raw_text": "the exact quote or prediction as written",
    "source_url": "the URL where you found it",
    "date_made": "YYYY-MM-DD, or empty string if unknown",
    "source_type": "article" | "podcast" | "tv_segment" | "radio" | "other"
  }
]

Only include specific, verifiable predictions or bold claims — skip general commentary. Return only the JSON array.`,
      },
    ],
  });

  // Grab the last text block (after any tool use rounds)
  const textBlocks = response.content.filter((b) => b.type === "text");
  const last = textBlocks[textBlocks.length - 1];
  if (!last || last.type !== "text") return [];

  try {
    const match = last.text.match(/\[[\s\S]*\]/);
    if (!match) return [];
    return JSON.parse(match[0]) as FoundTake[];
  } catch {
    return [];
  }
}
