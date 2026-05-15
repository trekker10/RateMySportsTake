import Link from "next/link";
import type { Expert } from "@/types/database";

export default function ExpertCard({ expert }: { expert: Expert }) {
  const initials = expert.name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <Link href={`/experts/${expert.expert_id}`}>
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5 hover:border-zinc-600 transition-colors space-y-4">

        {/* Identity */}
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 shrink-0 rounded-full overflow-hidden bg-zinc-800 flex items-center justify-center text-sm font-bold text-zinc-300">
            {expert.avatar_url ? (
              <img src={expert.avatar_url} alt={expert.name} className="h-full w-full object-cover" />
            ) : (
              initials
            )}
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-zinc-100 truncate">{expert.name}</p>
            {expert.outlet && (
              <p className="text-xs text-zinc-500 truncate">{expert.outlet}</p>
            )}
          </div>
        </div>

        {/* Sport tags */}
        {expert.sport_focus.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {expert.sport_focus.map((s) => (
              <span key={s} className="rounded-full bg-zinc-800 px-2 py-0.5 text-xs text-zinc-400">
                {s}
              </span>
            ))}
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <div>
            <p className="text-lg font-bold text-emerald-400">
              {expert.overall_rating > 0 ? expert.overall_rating.toFixed(1) : "—"}
            </p>
            <p className="text-xs text-zinc-600">Rating</p>
          </div>
          <div>
            <p className="text-lg font-bold text-zinc-200">{expert.total_takes}</p>
            <p className="text-xs text-zinc-600">Takes</p>
          </div>
          <div>
            <p className="text-lg font-bold text-zinc-200">
              {expert.accuracy_rate > 0 ? `${expert.accuracy_rate.toFixed(0)}%` : "—"}
            </p>
            <p className="text-xs text-zinc-600">Accuracy</p>
          </div>
        </div>
      </div>
    </Link>
  );
}
