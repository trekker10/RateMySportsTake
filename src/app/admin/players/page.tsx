import { redirect } from "next/navigation";
import { checkIsAdmin } from "@/lib/auth";
import { getPlayers, getPlayerTakeCounts } from "@/app/actions/players";
import PlayersClient from "./PlayersClient";

export default async function AdminPlayersPage() {
  const isAdmin = await checkIsAdmin();
  if (!isAdmin) redirect("/");

  const [players, takeCounts] = await Promise.all([
    getPlayers(),
    getPlayerTakeCounts(),
  ]);

  const playersWithCounts = players.map((p) => ({
    ...p,
    takes_count: takeCounts[p.player_id] ?? 0,
  }));

  return <PlayersClient initialPlayers={playersWithCounts} />;
}
