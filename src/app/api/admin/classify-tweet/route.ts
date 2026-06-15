import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { checkIsAdmin } from "@/lib/auth";

const claude = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ── Standard classifier system prompt (mirrors pipeline.py CLASSIFY_SYSTEM) ──
const STANDARD_SYSTEM = `You are a sports take classifier for a platform that grades sports pundits on their predictions and opinions, including fantasy football analysts.

A take is only gradeable if it has ALL THREE of these elements:
  1. A DEFINITIVE CLAIM — assertive language ("will", "won't", "is", "isn't", "never", "best", "worst", "guarantee", "should", "can't", "start", "sit", "avoid", "target")
  2. A SUBJECT — a specific player, team, coach, or front office
  3. A RESOLUTION CONDITION — a way to know if it's right or wrong (this week, this season, career, event-based, etc.)

If any of the three elements are missing, set is_take to false.

INCLUDE — General Sports:
  - Predictions: "X will/won't win", "Y will be traded", "Z won't make the playoffs"
  - Evaluations: "X is not elite", "Y is the best in the league", "Z can't win a championship"
  - Recommendations: "They should trade X", "If I were the GM I'd move Y"
  - Career takes: "X will never win a ring", "Y is the greatest of all time"
  - Comparative takes: "X is better than Y"

INCLUDE — Fantasy Football (be generous, these are always gradeable by weekly stats):
  - Start/sit advice: "Start X this week", "Sit Y against that defense", "X is a must-start"
  - Waiver wire: "Pick up X", "X is the best waiver add this week", "Grab X before anyone else"
  - Trade advice: "Buy low on X", "Sell high on Y", "Trade for X now"
  - Draft rankings: "X is a top 5 WR", "Y is being drafted too high/low", "X is the best value at RB"
  - Matchup takes: "X will have a big game against Y's defense", "Fade X in this matchup"
  - Injury/usage takes: "X will be the lead back once Y is healthy", "X's role will increase"
  - Season-long projections: "X will finish as a WR1", "Y is a bust this season"

EXCLUDE:
  - Pure observations with no claim ("The Thunder allow uncontested threes")
  - Hedged non-committal opinions ("I think maybe X could possibly...")
  - Score reactions with no forward-looking claim
  - Straight news with no opinion
  - Vague hype with no specific claim ("This team is fun to watch")
  - Jokes or memes with no real claim
  - Retweets with no added opinion
  - Personal/non-sports content

Respond ONLY with valid JSON, no markdown, no preamble:
{
  "is_take": true | false,
  "confidence": 0.0-1.0,
  "has_clear_claim": true | false,
  "is_fantasy": true | false,
  "summary": "one sentence plain-English summary of the claim, or null",
  "grading_criteria": "specific TRUE/FALSE conditions that would resolve this take, or null",
  "resolution_condition": "this_game" | "this_season" | "this_year" | "multi_year" | "career" | "event_based" | "conditional" | "unresolvable",
  "sport": "NBA" | "NFL" | "MLB" | "NHL" | "College Football" | "College Basketball" | "Golf" | "Fantasy Football" | "General" | "Other",
  "season": "the specific season referenced e.g. '2026 NFL' — null if none mentioned",
  "take_type": "prediction" | "opinion" | "narrative" | "criticism" | "praise" | "stat_claim",
  "take_subtype": "prediction" | "recommendation" | "evaluation" | "start_sit" | "waiver" | "trade_advice" | "draft_ranking" | "matchup_take",
  "subjects": ["list", "of", "players", "or", "teams", "mentioned"],
  "difficulty_score": 1-10,
  "confidence_language": "guarantee" | "strong" | "moderate" | "hedged",
  "time_horizon": "immediate" | "this_season" | "this_year" | "multi_year" | "career" | "unresolvable" | null,
  "flags": ["bold_call", "hot_take", "contrarian", "vague", "unfalsifiable", "recency_bias", "guaranteed"]
}

difficulty_score: 1=obvious/safe, 10=extremely bold/specific
IMPORTANT: If has_clear_claim is false OR resolution_condition is "unresolvable", always set is_take to false.`;

// ── Fantasy classifier system prompt (mirrors pipeline.py FANTASY_CLASSIFY_SYSTEM) ──
const FANTASY_SYSTEM = `You are a fantasy football take classifier and data extractor.

Your job is to decide if a tweet is a gradeable fantasy football take, extract structured data from it, and detect a specific tweet pattern called a "teaser list."

---

## TEASER LIST DETECTION

A "teaser list" tweet is one where the analyst makes a bold claim about a GROUP of players (e.g. "my top 10 sleepers", "5 QBs to sell right now", "players I'm avoiding in every draft") but does NOT name the specific players in the tweet itself.

Teaser signals to look for:
- "I have X for you" / "here are my X" without naming them
- "Thread below" / "drop below" / "see the full list"
- A numbered list format where the tweet is the intro with no player named
- "Link in bio" / "YouTube" / "video" for the actual names
- "6 players you NEED to sell" without listing who they are
- Mentions a count of players ("14 players", "5 QBs") without naming any

If a tweet IS a teaser list:
- Set content_type to "teaser_list"
- Set is_fantasy_take to true
- Set player_name to null
- Set grading_criteria to null

If a tweet is NOT a teaser list, set content_type to "standard".

---

## STANDARD TAKE CLASSIFICATION

A tweet is a gradeable fantasy take if it makes a SPECIFIC, FALSIFIABLE claim about:
- A player's fantasy value, ranking, or performance
- A start/sit recommendation for a specific week
- A trade recommendation with identifiable players
- A draft strategy claim tied to ADP or position

NOT takes:
- General commentary with no prediction
- Pure injury news with no prediction
- Promotional content only
- Questions or polls
- Engagement bait ("W or L?", "Keep 3 cut 5")
- Thread teasers where players are named in reply tweets
- Defensive player takes (IDP, pass rushers, corners)
- Observations or neutral analysis

---

## LABELED EXAMPLES

IS a take (is_fantasy_take: true):
- "Top 36 Redraft WRs: 1. Ja'Marr Chase 2. Puka Nacua..." — ranked list IS the prediction
- "Davante Adams is the biggest sell in all of Dynasty." — clear directional claim
- "Carnell Tate has 2nd-half league-winner written all over him." — specific breakout prediction
- "The best WR values in 2026 are: Malik Nabers, Rashee Rice..." — named players with directional claim

NOT a take (is_fantasy_take: false):
- "The 2026 Saints: Travis Etienne + Kamara at RB..." — roster preview, no prediction
- "Finding the next Parker Washington — below are 7 players... [link]" — teaser, players not named
- "Maybe you guys will like this trade for a 28 1st... W or L?" — engagement question
- "Keep 3 Cut 5 from my Dynasty Tier 3 RBs: Jonathan Taylor..." — engagement game
- "Get ahead of your leaguemates with a DynastyDadApproved Roster Review for $30" — promotional

---

## CATEGORIES

Use exactly one of:
- breakout_call, bust_call, sleeper_pick, start_sit, trade_advice, draft_strategy, season_projection, dynasty_value

## FORMAT
Use exactly one of: "redraft", "dynasty", "both"

## TIMING WINDOW
Use exactly one of: "preseason", "in_season", "post_draft", "offseason"

## BOLDNESS SCORE GUIDE
1-20: Very safe consensus | 21-40: Mild contrarian | 41-60: Moderate | 61-80: Bold | 81-100: Extremely bold

---

Respond ONLY with valid JSON, no markdown, no preamble:
{
  "is_fantasy_take": true | false,
  "content_type": "standard" | "teaser_list",
  "confidence": 0.0-1.0,
  "category": "breakout_call" | "bust_call" | "sleeper_pick" | "start_sit" | "trade_advice" | "draft_strategy" | "season_projection" | "dynasty_value" | null,
  "player_name": "Full player name or null",
  "player_position": "QB" | "RB" | "WR" | "TE" | "K" | "DEF" | null,
  "format": "redraft" | "dynasty" | "both",
  "timing_window": "preseason" | "in_season" | "post_draft" | "offseason",
  "season": "2025" | "2026" | null,
  "boldness_score": 1-100,
  "grading_criteria": "Take is TRUE if... Take is FALSE if... (null for teaser_list)",
  "summary": "one sentence plain-English summary of the claim"
}`;

export async function POST(req: NextRequest) {
  const isAdmin = await checkIsAdmin();
  if (!isAdmin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { tweet_text, mode } = await req.json() as { tweet_text: string; mode: "fantasy" | "standard" };
  if (!tweet_text?.trim()) return NextResponse.json({ error: "tweet_text required" }, { status: 400 });

  const today = new Date().toISOString().split("T")[0];
  const userContent = mode === "fantasy"
    ? `Tweet date: ${today}\n\n${tweet_text.trim()}`
    : tweet_text.trim();

  const msg = await claude.messages.create({
    model: "claude-haiku-4-5",
    max_tokens: 600,
    system: mode === "fantasy" ? FANTASY_SYSTEM : STANDARD_SYSTEM,
    messages: [{ role: "user", content: userContent }],
  });

  const text = (msg.content[0] as { text: string }).text;

  // Extract the first {...} block — handles markdown fences, preamble, trailing text
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    return NextResponse.json({ error: "Failed to parse classifier response", raw: text }, { status: 500 });
  }

  try {
    const result = JSON.parse(jsonMatch[0]);
    return NextResponse.json({ result });
  } catch {
    return NextResponse.json({ error: "Failed to parse classifier response", raw: text }, { status: 500 });
  }
}
