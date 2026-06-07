"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { checkIsAdmin } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export interface Player {
  player_id: string;
  canonical_name: string;
  aliases: string[];
  sport: string | null;
  position: string | null;
  team: string | null;
  active: boolean;
  created_at: string;
  takes_count?: number;
}

export async function getPlayers(): Promise<Player[]> {
  const isAdmin = await checkIsAdmin();
  if (!isAdmin) return [];

  const supabase = createAdminClient();
  const { data } = await supabase
    .from("players")
    .select("*")
    .order("canonical_name");

  return (data ?? []) as Player[];
}

export async function createPlayer(fields: {
  canonical_name: string;
  aliases: string[];
  sport: string;
  position: string;
  team: string;
  active: boolean;
}): Promise<{ success: boolean; error?: string }> {
  const isAdmin = await checkIsAdmin();
  if (!isAdmin) return { success: false, error: "Unauthorized" };

  const supabase = createAdminClient();
  const { error } = await supabase.from("players").insert({
    player_id: crypto.randomUUID(),
    ...fields,
  });

  if (error) return { success: false, error: error.message };
  revalidatePath("/admin/players");
  return { success: true };
}

export async function updatePlayer(
  playerId: string,
  fields: {
    canonical_name: string;
    aliases: string[];
    sport: string;
    position: string;
    team: string;
    active: boolean;
  }
): Promise<{ success: boolean; error?: string }> {
  const isAdmin = await checkIsAdmin();
  if (!isAdmin) return { success: false, error: "Unauthorized" };

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("players")
    .update(fields)
    .eq("player_id", playerId);

  if (error) return { success: false, error: error.message };
  revalidatePath("/admin/players");
  return { success: true };
}

export async function deletePlayer(
  playerId: string
): Promise<{ success: boolean; error?: string }> {
  const isAdmin = await checkIsAdmin();
  if (!isAdmin) return { success: false, error: "Unauthorized" };

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("players")
    .delete()
    .eq("player_id", playerId);

  if (error) return { success: false, error: error.message };
  revalidatePath("/admin/players");
  return { success: true };
}

export async function importPlayersFromTags(): Promise<{
  success: boolean;
  imported: number;
  error?: string;
}> {
  const isAdmin = await checkIsAdmin();
  if (!isAdmin) return { success: false, imported: 0, error: "Unauthorized" };

  const supabase = createAdminClient();

  // Gather all player_tags from takes + fantasy_takes
  const [takesRes, fantasyRes] = await Promise.all([
    supabase.from("takes").select("player_tags"),
    supabase.from("fantasy_takes").select("player_tags"),
  ]);

  const allNames = new Set<string>();
  for (const row of takesRes.data ?? []) {
    for (const name of row.player_tags ?? []) {
      if (name?.trim()) allNames.add(name.trim());
    }
  }
  for (const row of fantasyRes.data ?? []) {
    for (const name of row.player_tags ?? []) {
      if (name?.trim()) allNames.add(name.trim());
    }
  }

  // Get existing canonical names + aliases to avoid duplicates
  const { data: existing } = await supabase
    .from("players")
    .select("canonical_name, aliases");

  const known = new Set<string>();
  for (const p of existing ?? []) {
    known.add(p.canonical_name.toLowerCase());
    for (const a of p.aliases ?? []) known.add(a.toLowerCase());
  }

  const toInsert = [...allNames].filter(
    (n) => !known.has(n.toLowerCase())
  );

  if (toInsert.length === 0) return { success: true, imported: 0 };

  const rows = toInsert.map((name) => ({
    player_id: crypto.randomUUID(),
    canonical_name: name,
    aliases: [],
    sport: null,
    position: null,
    team: null,
    active: true,
  }));

  const { error } = await supabase.from("players").insert(rows);
  if (error) return { success: false, imported: 0, error: error.message };

  revalidatePath("/admin/players");
  return { success: true, imported: toInsert.length };
}

export async function mergePlayers(
  keepId: string,
  mergeIds: string[]
): Promise<{ success: boolean; error?: string }> {
  const isAdmin = await checkIsAdmin();
  if (!isAdmin) return { success: false, error: "Unauthorized" };

  const supabase = createAdminClient();

  // Fetch the player to keep + all players being merged away
  const { data: allPlayers } = await supabase
    .from("players")
    .select("player_id, canonical_name, aliases")
    .in("player_id", [keepId, ...mergeIds]);

  if (!allPlayers) return { success: false, error: "Players not found" };

  const keeper = allPlayers.find((p) => p.player_id === keepId);
  if (!keeper) return { success: false, error: "Keep player not found" };

  const mergedPlayers = allPlayers.filter((p) => p.player_id !== keepId);

  // Build new aliases: existing keeper aliases + canonical names of merged players + their aliases
  const newAliasSet = new Set<string>(keeper.aliases ?? []);
  for (const mp of mergedPlayers) {
    newAliasSet.add(mp.canonical_name); // their canonical name becomes an alias
    for (const a of mp.aliases ?? []) newAliasSet.add(a);
  }
  // Don't include the keeper's own canonical name as an alias
  newAliasSet.delete(keeper.canonical_name);

  // Update the keeper's aliases
  const { error: updateError } = await supabase
    .from("players")
    .update({ aliases: [...newAliasSet] })
    .eq("player_id", keepId);

  if (updateError) return { success: false, error: updateError.message };

  // Delete the merged-away players
  const { error: deleteError } = await supabase
    .from("players")
    .delete()
    .in("player_id", mergeIds);

  if (deleteError) return { success: false, error: deleteError.message };

  revalidatePath("/admin/players");
  return { success: true };
}

export async function getPlayerTakeCounts(): Promise<Record<string, number>> {
  const isAdmin = await checkIsAdmin();
  if (!isAdmin) return {};

  const supabase = createAdminClient();

  const [players, takes, fantasyTakes] = await Promise.all([
    supabase.from("players").select("player_id, canonical_name"),
    supabase.from("takes").select("player_tags"),
    supabase.from("fantasy_takes").select("player_tags"),
  ]);

  const counts: Record<string, number> = {};

  for (const player of players.data ?? []) {
    const name = player.canonical_name.toLowerCase();
    let count = 0;
    for (const row of takes.data ?? []) {
      if ((row.player_tags ?? []).some((t: string) => t.toLowerCase() === name)) count++;
    }
    for (const row of fantasyTakes.data ?? []) {
      if ((row.player_tags ?? []).some((t: string) => t.toLowerCase() === name)) count++;
    }
    counts[player.player_id] = count;
  }

  return counts;
}
