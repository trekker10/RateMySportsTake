import Anthropic from "@anthropic-ai/sdk";
import type { TakeType, TimeHorizon } from "@/types/database";

const client = new Anthropic();

interface RatingResult {
  take_type: TakeType;
  sport: string;
  subjects: string[];
  difficulty_score: number;
  falsifiability_score: number;
  confidence_claimed: number;
  time_horizon: TimeHorizon;
  time_horizon_date: string | null;
  summary: string;
  grading_criteria: string;
  flags: string[];
}

export async function rateTake(
  rawText: string,
  sport: string,
  sourceType: string,
  dateMade: string
): Promise<RatingResult> {
  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
    system: [
      {
        type: "text",
        text: "You are a sports take analyst for a take accountability platform. Objectively analyze sports takes and rate them on specific dimensions. Always respond with valid JSON only — no markdown, no explanation, no code fences.",
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: [
      {
        role: "user",
        content: `Analyze this sports take and return a JSON object.

Take: "${rawText}"
Source type: ${sourceType}
Sport context: ${sport}
Date made: ${dateMade}

Return JSON with exactly these fields:
{
  "take_type": one of "prediction" | "opinion" | "narrative" | "criticism" | "praise" | "stat_claim",
  "sport": standardized sport name (NBA, NFL, MLB, NHL, Soccer, College Football, College Basketball, MMA, Golf, Tennis, Other),
  "subjects": array of player and team names mentioned,
  "difficulty_score": integer 1-10 (1=safe/obvious take, 10=extremely bold or contrarian),
  "falsifiability_score": integer 1-10 (1=pure opinion that can never be proven, 10=clearly measurable outcome),
  "confidence_claimed": integer 1-10 (1=heavily hedged, 10=stated as an absolute guarantee),
  "time_horizon": one of "immediate" | "this_season" | "this_year" | "multi_year" | "career" | "unresolvable",
  "time_horizon_date": estimated YYYY-MM-DD when the outcome will be known, or null if unresolvable,
  "summary": one neutral sentence restating exactly what is being claimed,
  "grading_criteria": specific measurable definition of what would make this take TRUE (used for grading later),
  "flags": array of zero or more from ["bold_call", "guaranteed", "flip_risk", "vague", "unfalsifiable", "recency_bias", "hot_take", "contrarian"]
}`,
      },
    ],
  });

  const text =
    response.content[0].type === "text" ? response.content[0].text : "";
  const parsed = JSON.parse(text);

  return {
    take_type: parsed.take_type,
    sport: parsed.sport,
    subjects: parsed.subjects ?? [],
    difficulty_score: parsed.difficulty_score,
    falsifiability_score: parsed.falsifiability_score,
    confidence_claimed: parsed.confidence_claimed,
    time_horizon: parsed.time_horizon,
    time_horizon_date: parsed.time_horizon_date ?? null,
    summary: parsed.summary,
    grading_criteria: parsed.grading_criteria,
    flags: parsed.flags ?? [],
  };
}
