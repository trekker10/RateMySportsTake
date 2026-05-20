"use client";

import { useState, useEffect, useTransition } from "react";
import { getAccoladesAdmin, setFlipFlopper, syncAllAccolades } from "@/app/actions/takescore";
import { ACCOLADE_DEFS } from "@/lib/takescore";

function initials(name: string) {
  return name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
}

export default function AccoladesPanel() {
  const [data, setData] = useState<Awaited<ReturnType<typeof getAccoladesAdmin>>>([]);
  const [isPending, startTransition] = useTransition();
  const [search, setSearch] = useState("");

  function reload() {
    startTransition(async () => {
      const d = await getAccoladesAdmin();
      setData(d);
    });
  }

  useEffect(() => { reload(); }, []);

  function handleSync() {
    startTransition(async () => {
      await syncAllAccolades();
      reload();
    });
  }

  function handleFlipFlopper(expertId: string, currentlyHas: boolean) {
    startTransition(async () => {
      await setFlipFlopper(expertId, !currentlyHas);
      reload();
    });
  }

  const filtered = data.filter(d => d.expert_name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search analysts…"
          className="rounded-lg bg-zinc-800 border border-zinc-700 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none w-56"
        />
        <button
          onClick={handleSync}
          disabled={isPending}
          className="px-4 py-2 rounded-lg border border-zinc-700 text-sm text-zinc-300 hover:border-zinc-500 hover:text-zinc-100 transition-colors disabled:opacity-50"
        >
          {isPending ? "Syncing…" : "Sync All Accolades"}
        </button>
      </div>

      {/* Legend */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
        <p className="text-xs font-semibold text-zinc-400 mb-2">All Accolade Types</p>
        <div className="flex flex-wrap gap-2">
          {ACCOLADE_DEFS.map(d => (
            <span key={d.key} className="text-xs px-2 py-1 rounded bg-zinc-800 text-zinc-300">
              {d.emoji} {d.label}{d.isManual ? " (manual)" : ""}
            </span>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-zinc-800 bg-zinc-900 divide-y divide-zinc-800">
        {filtered.length === 0 && !isPending && (
          <p className="px-4 py-8 text-center text-zinc-500 text-sm">No analysts found.</p>
        )}
        {filtered.map(analyst => {
          const hasFlipFlopper = analyst.accolades.some(a => a.key === "flip_flopper");
          return (
            <div key={analyst.expert_id} className="px-5 py-4">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-full bg-zinc-700 shrink-0 overflow-hidden flex items-center justify-center text-xs font-bold text-zinc-300">
                  {analyst.avatar_url
                    ? <img src={analyst.avatar_url} className="w-full h-full object-cover" alt="" />
                    : initials(analyst.expert_name)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-zinc-100 text-sm">{analyst.expert_name}</p>

                  {analyst.accolades.length === 0 ? (
                    <p className="text-xs text-zinc-600 mt-1">No accolades</p>
                  ) : (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {analyst.accolades.map(a => (
                        <div key={a.key} className="flex items-center gap-1 bg-zinc-800 rounded px-2 py-1">
                          <span className="text-xs">{a.emoji} {a.label}</span>
                          {a.is_manual && <span className="text-[9px] text-zinc-500 ml-1">manual</span>}
                          <span className="text-[9px] text-zinc-600 ml-1">
                            since {new Date(a.earned_at).toLocaleDateString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Flip Flopper toggle */}
                <button
                  onClick={() => handleFlipFlopper(analyst.expert_id, hasFlipFlopper)}
                  disabled={isPending}
                  className={`shrink-0 text-xs px-3 py-1.5 rounded-lg border transition-colors disabled:opacity-50 ${
                    hasFlipFlopper
                      ? "border-orange-600 text-orange-400 hover:border-orange-400"
                      : "border-zinc-700 text-zinc-400 hover:border-zinc-500 hover:text-zinc-200"
                  }`}
                >
                  {hasFlipFlopper ? "🔄 Remove Flip Flopper" : "+ Flip Flopper"}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
