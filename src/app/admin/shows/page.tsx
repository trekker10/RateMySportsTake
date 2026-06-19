import { redirect } from "next/navigation";
import { checkIsAdmin } from "@/lib/auth";
import { getShows } from "@/app/actions/shows";
import ShowsClient from "./ShowsClient";
import Link from "next/link";

export default async function ManageShowsPage() {
  const isAdmin = await checkIsAdmin();
  if (!isAdmin) redirect("/");

  const shows = await getShows();

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Manage Shows</h1>
        <p className="mt-1 text-zinc-400">
          Store show logos and names for ESPN, FS1, The Herd, and any other network or podcast.
          Paste a direct image URL — the logo will preview before you save.
        </p>
      </div>

      <ShowsClient initialShows={shows} />

      <Link href="/admin" className="inline-block text-sm text-zinc-500 hover:text-zinc-300 transition-colors">
        ← Back to Admin
      </Link>
    </div>
  );
}
