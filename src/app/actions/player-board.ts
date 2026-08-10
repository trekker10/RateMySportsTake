"use server";

import { createAdminClient } from "@/lib/supabase/admin";

export interface PlayerBoardRow {
  fantasy_take_id: string;
  player_name: string | null;
  player_position: string | null;
  player_rating: number | null;
  date_made: string;
  source_url: string | null;
  team: string | null;
  player_adp: number | null;
}

export async function getExpertPlayerBoard(expertId: string): Promise<PlayerBoardRow[]> {
  const supabase = createAdminClient();

  // Fetch all fantasy takes with a rating for this expert
  const { data: takes } = await supabase
    .from("fantasy_takes")
    .select("fantasy_take_id, player_name, player_position, player_rating, date_made, source_url, player_adp")
    .eq("expert_id", expertId)
    .not("player_rating", "is", null)
    .order("date_made", { ascending: false });

  if (!takes || takes.length === 0) return [];

  // Keep only the most recent rating per player (already ordered DESC by date_made)
  const seen = new Set<string>();
  const deduped = takes.filter(t => {
    const key = (t.player_name ?? "").toLowerCase().trim();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // Look up team for each unique player name from the players table
  const playerNames = deduped.map(t => t.player_name).filter(Boolean) as string[];
  let teamMap: Record<string, string> = {};

  if (playerNames.length > 0) {
    const { data: players } = await supabase
      .from("players")
      .select("canonical_name, aliases, team")
      .eq("active", true);

    if (players) {
      for (const take of deduped) {
        const nameLower = (take.player_name ?? "").toLowerCase().trim();
        const match = players.find(p => {
          if ((p.canonical_name ?? "").toLowerCase() === nameLower) return true;
          return (p.aliases ?? []).some((a: string) => a.toLowerCase() === nameLower);
        });
        if (match?.team) teamMap[nameLower] = match.team;
      }
    }
  }

  return deduped.map(t => ({
    ...t,
    team: teamMap[(t.player_name ?? "").toLowerCase().trim()] ?? null,
  }));
}
