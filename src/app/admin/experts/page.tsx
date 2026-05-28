import { redirect } from "next/navigation";
import { checkIsAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import VerifiedToggle from "@/components/VerifiedToggle";
import FantasyGuruToggle from "@/components/FantasyGuruToggle";

export default async function AdminExpertsPage() {
  const isAdmin = await checkIsAdmin();
  if (!isAdmin) redirect("/");

  const supabase = await createClient();
  const { data: experts } = await supabase
    .from("experts")
    .select("expert_id, name, outlet, twitter_handle, avatar_url, total_takes, verified, is_fantasy_guru")
    .order("name");

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Manage Profiles</h1>
        <p className="mt-1 text-zinc-400">Toggle verification to add analysts to the leaderboard. Edit profile info, images, and social links.</p>
      </div>

      <div className="rounded-xl border border-zinc-800 bg-zinc-900 divide-y divide-zinc-800">
        {experts?.map((expert) => {
          const initials = expert.name
            .split(" ")
            .map((w: string) => w[0])
            .join("")
            .slice(0, 2)
            .toUpperCase();

          return (
            <div key={expert.expert_id} className="flex items-center gap-4 px-5 py-4">
              <div className="shrink-0 h-10 w-10 rounded-full overflow-hidden bg-zinc-800 flex items-center justify-center text-sm font-bold text-zinc-300">
                {expert.avatar_url ? (
                  <img src={expert.avatar_url} alt={expert.name} className="h-full w-full object-cover" />
                ) : (
                  initials
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-zinc-100 truncate">{expert.name}</p>
                <p className="text-sm text-zinc-500 truncate">
                  {expert.outlet && <span>{expert.outlet}</span>}
                  {expert.outlet && expert.twitter_handle && <span> · </span>}
                  {expert.twitter_handle && <span>{expert.twitter_handle}</span>}
                  {!expert.outlet && !expert.twitter_handle && <span>No profile info</span>}
                </p>
              </div>
              <div className="text-sm text-zinc-500 shrink-0">{expert.total_takes} takes</div>

              {/* Toggles with labels */}
              <div className="flex items-center gap-5 shrink-0">
                <div className="flex flex-col items-start gap-1">
                  <span className="text-[10px] font-mono tracking-widest text-zinc-500 uppercase">Analyst</span>
                  <VerifiedToggle expertId={expert.expert_id} initialVerified={expert.verified ?? false} />
                </div>
                <div className="flex flex-col items-start gap-1">
                  <span className="text-[10px] font-mono tracking-widest uppercase" style={{ color: "#16a34a" }}>Fantasy Guru</span>
                  <FantasyGuruToggle expertId={expert.expert_id} initialValue={expert.is_fantasy_guru ?? false} />
                </div>
              </div>

              <Link
                href={`/admin/experts/${expert.expert_id}/edit`}
                className="shrink-0 rounded-lg border border-zinc-700 px-3 py-1.5 text-sm text-zinc-300 hover:border-zinc-500 hover:text-zinc-100 transition-colors"
              >
                Edit
              </Link>
            </div>
          );
        })}
        {!experts?.length && (
          <p className="px-5 py-8 text-center text-zinc-500">No experts yet.</p>
        )}
      </div>

      <Link href="/admin" className="inline-block text-sm text-zinc-500 hover:text-zinc-300 transition-colors">
        ← Back to Admin
      </Link>
    </div>
  );
}
