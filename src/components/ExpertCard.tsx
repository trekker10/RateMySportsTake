import Link from "next/link";
import type { Expert } from "@/types/database";
import type { Accolade } from "@/lib/accolades";
import { expertUrl } from "@/lib/expert-url";
import Avatar from "@/components/Avatar";

export default function ExpertCard({ expert, accolades = [] }: { expert: Expert; accolades?: Accolade[] }) {
  const initials = expert.name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <Link href={expertUrl(expert)}>
      <div className="rounded-2xl border border-gray-200 bg-white p-6 hover:border-gray-300 hover:shadow-md transition-all space-y-5">

        {/* Top: headshot + name/bio */}
        <div className="flex items-start gap-4">
          <div className="h-20 w-20 shrink-0 rounded-full overflow-hidden bg-gray-200 flex items-center justify-center text-xl font-bold text-gray-600">
            <Avatar
              name={expert.name}
              avatarUrl={expert.avatar_url}
              className="h-full w-full object-cover"
              textClassName=""
            />
          </div>
          <div className="min-w-0 pt-1">
            <p className="text-xl font-bold text-gray-900 leading-tight">{expert.name}</p>
            {expert.outlet && (
              <p className="text-sm text-gray-500 mt-0.5">{expert.outlet}</p>
            )}
            {expert.sport_focus.length > 0 && (
              <p className="text-xs text-gray-400 mt-1">{expert.sport_focus.join(", ")}</p>
            )}
            {accolades.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {accolades.map((a) => (
                  <span key={a.label} className={`rounded-full px-2.5 py-0.5 text-xs ${a.className}`}>
                    {a.emoji} {a.label}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Bottom: TakeScore box + stats */}
        <div className="flex items-center gap-5">
          <div className="shrink-0 rounded-xl border-2 border-gray-200 px-5 py-3 text-center min-w-[90px]">
            <p className="text-3xl font-black text-gray-900">
              {expert.overall_rating > 0 ? <>{Math.round(expert.overall_rating)}<span className="text-xs font-normal text-gray-400">/100</span></> : "—"}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">TakeScore</p>
          </div>

          <div className="flex gap-5">
            <div className="text-center">
              <p className="text-xl font-bold text-gray-800">{expert.total_takes}</p>
              <p className="text-xs text-gray-400 mt-0.5">Total Takes</p>
            </div>
            <div className="text-center">
              <p className="text-xl font-bold text-gray-800">
                {expert.accuracy_rate > 0 ? `${Math.round(expert.accuracy_rate)}%` : "—"}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">Accuracy</p>
            </div>
            <div className="text-center">
              <p className="text-xl font-bold text-gray-800">
                {expert.boldness_avg > 0 ? expert.boldness_avg.toFixed(1) : "—"}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">Boldness</p>
            </div>
          </div>
        </div>

      </div>
    </Link>
  );
}
