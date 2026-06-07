"use server";

import { analyzeFantasyTweet } from "@/lib/ai/analyze-fantasy-take";
import { suggestBoldness } from "@/lib/fantasy-takescore";
import { getFantasyConfig } from "@/app/actions/fantasy-takescore";
import { getAdp2025 } from "@/data/adp-2025";

// ─── ADP Lookup ───────────────────────────────────────────────────────────────

async function lookupPlayerADP(playerName: string, sportSeason?: string): Promise<number | null> {
  // For 2025 takes use the bundled static CSV — instant and accurate
  const year = sportSeason?.match(/\d{4}/)?.[0];
  if (year === "2025") {
    return getAdp2025(playerName);
  }

  if (!playerName) return null;

  const nameLower = playerName.toLowerCase().trim();

  // Try FantasyPros overall ADP
  try {
    const res = await fetch("https://www.fantasypros.com/nfl/adp/overall.php", {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml",
      },
      next: { revalidate: 3600 }, // Cache for 1 hour
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const html = await res.text();

    // FantasyPros renders player rows like:
    // <a class="fp-player-link" fp-player-name="Justin Jefferson">...
    // followed by ADP values in <td> cells
    // We look for the player name in an anchor and grab the nearby ADP td

    // Try to match by fp-player-name attribute (most reliable)
    const fpNameRegex = new RegExp(
      `fp-player-name="([^"]*)"[^>]*>.*?</a>.*?<td[^>]*>([\\d.]+)</td>`,
      "si",
    );

    // Scan all rows — FantasyPros table rows look like:
    // <tr> <td>rank</td> <td class="player-label"><a ...>Name</a></td> <td>ADP</td> ...
    // Extract all player rows via regex
    const rowRegex =
      /<tr[^>]*>.*?fp-player-name="([^"]*)".*?<td[^>]*>([\d.]+)<\/td>/gis;

    const matches = [...html.matchAll(rowRegex)];
    for (const match of matches) {
      const rowName = match[1].toLowerCase().trim();
      // Match if the row name contains the searched name or vice versa
      if (rowName.includes(nameLower) || nameLower.includes(rowName)) {
        const adp = parseFloat(match[2]);
        if (!isNaN(adp)) return adp;
      }
    }

    // Fallback: simpler text search for the name near an ADP number
    const idx = html.toLowerCase().indexOf(nameLower);
    if (idx !== -1) {
      // Look for a number in the next 300 chars that looks like ADP (1-300)
      const slice = html.slice(idx, idx + 400);
      const numMatch = slice.match(/>(\d{1,3}(?:\.\d+)?)</);
      if (numMatch) {
        const adp = parseFloat(numMatch[1]);
        if (!isNaN(adp) && adp >= 1 && adp <= 300) return adp;
      }
    }
  } catch {
    // FantasyPros failed — try a fallback source
  }

  // Fallback: BeatADP (simpler HTML structure)
  try {
    const res = await fetch(
      `https://www.beatadp.com/platform-adp?search=${encodeURIComponent(playerName)}`,
      {
        headers: { "User-Agent": "Mozilla/5.0" },
        next: { revalidate: 3600 },
      },
    );
    if (res.ok) {
      const html = await res.text();
      const idx = html.toLowerCase().indexOf(nameLower);
      if (idx !== -1) {
        const slice = html.slice(idx, idx + 300);
        const numMatch = slice.match(/([\d]+\.[\d]+|[\d]{1,3})/);
        if (numMatch) {
          const adp = parseFloat(numMatch[1]);
          if (!isNaN(adp) && adp >= 1 && adp <= 300) return adp;
        }
      }
    }
  } catch {
    // Both sources failed
  }

  return null;
}

// Resolution date is now determined by the AI using fantasy_take_resolution_guidelines.md

// ─── Main action ──────────────────────────────────────────────────────────────

export interface FantasyAutoFillResult {
  player_name: string | null;
  player_position: string | null;
  player_adp: number | null;
  category: string;
  timing_window: string;
  format: "dynasty" | "redraft" | "both";
  boldness_score: number;
  sport_season: string;
  resolution_date: string;
  summary: string;
  reasoning: string;
  grading_criteria: string;
  adp_source: "fantasypros" | "estimated" | "none";
}

export async function analyzeFantasyTakeAction(
  rawText: string,
  dateMade: string,
): Promise<{ success: true; data: FantasyAutoFillResult } | { success: false; error: string }> {
  try {
    // 1. AI extraction
    const analysis = await analyzeFantasyTweet(rawText, dateMade);

    // 2. ADP lookup
    let adp: number | null = null;
    let adpSource: FantasyAutoFillResult["adp_source"] = "none";

    if (analysis.player_name) {
      adp = await lookupPlayerADP(analysis.player_name, analysis.sport_season);
      adpSource = adp !== null ? "fantasypros" : "none";
    }

    // 3. Boldness score
    const cfg = await getFantasyConfig();
    const boldness = suggestBoldness(adp, analysis.timing_window, cfg);

    return {
      success: true,
      data: {
        player_name:     analysis.player_name,
        player_position: analysis.player_position,
        player_adp:      adp,
        category:        analysis.category,
        timing_window:   analysis.timing_window,
        format:          analysis.format,
        boldness_score:  boldness,
        sport_season:    analysis.sport_season,
        resolution_date: analysis.resolution_date,
        summary:          analysis.summary,
        reasoning:        analysis.reasoning,
        grading_criteria: analysis.grading_criteria,
        adp_source:       adpSource,
      },
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Analysis failed",
    };
  }
}
