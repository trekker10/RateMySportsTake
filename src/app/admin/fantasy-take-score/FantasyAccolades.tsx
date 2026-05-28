"use client";

import { FANTASY_ACCOLADE_DEFS } from "@/lib/fantasy-takescore";
import type { FantasyDashboardRow } from "@/app/actions/fantasy-takescore";

export default function FantasyAccolades({ experts }: { experts: FantasyDashboardRow[] }) {
  // Filter to experts with at least one fantasy accolade
  const expertsWithAccolades = experts.filter(e => e.accolades.length > 0);

  if (expertsWithAccolades.length === 0) {
    return (
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 py-16 text-center">
        <p className="text-zinc-400 text-lg font-semibold">No fantasy accolades yet.</p>
        <p className="text-zinc-500 text-sm mt-1">
          Accolades are earned automatically as analysts accumulate graded fantasy takes.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          {FANTASY_ACCOLADE_DEFS.map(def => (
            <div
              key={def.key}
              className="flex items-center gap-2 px-3 py-2 rounded-lg border border-zinc-800 bg-zinc-800/50"
            >
              <span className="text-xl">{def.emoji}</span>
              <div>
                <p className="text-xs font-semibold text-zinc-300">{def.label}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-zinc-400">
        {expertsWithAccolades.length} analyst{expertsWithAccolades.length !== 1 ? "s" : ""} with fantasy accolades.
      </p>

      {expertsWithAccolades.map(expert => (
        <div
          key={expert.expert_id}
          className="rounded-xl border border-zinc-800 bg-zinc-900 p-5"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-full bg-zinc-700 flex items-center justify-center text-zinc-300 text-sm font-bold">
              {expert.name.charAt(0)}
            </div>
            <div>
              <p className="font-semibold text-zinc-100">{expert.name}</p>
              {expert.is_fantasy_guru && (
                <p className="text-[10px] text-green-400 font-semibold uppercase tracking-wider">Fantasy Guru</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {expert.accolades.map(accoladeKey => {
              const def = FANTASY_ACCOLADE_DEFS.find(d => d.key === accoladeKey);
              if (!def) return null;
              return (
                <div
                  key={accoladeKey}
                  className="flex items-center gap-3 px-3 py-3 rounded-lg border border-zinc-700 bg-zinc-800"
                >
                  <span className="text-2xl">{def.emoji}</span>
                  <div>
                    <p className="text-sm font-semibold text-zinc-200">{def.label}</p>
                    <p className="text-[10px] text-zinc-500 uppercase tracking-wider">{accoladeKey.replace(/_/g, " ")}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {/* Accolade glossary */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
        <h3 className="font-semibold text-zinc-100 mb-3">Accolade Glossary</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {FANTASY_ACCOLADE_DEFS.map(def => (
            <div key={def.key} className="flex items-start gap-2 py-1.5 border-b border-zinc-800 last:border-0">
              <span className="text-lg mt-0.5">{def.emoji}</span>
              <div>
                <p className="text-sm font-medium text-zinc-200">{def.label}</p>
                <p className="text-xs text-zinc-500 capitalize">{def.key.replace(/_/g, " ")}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
