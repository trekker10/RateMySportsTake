"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";

const SPORTS = [
  "NBA", "NFL", "MLB", "NHL", "Soccer",
  "College Football", "College Basketball", "MMA", "Golf", "Tennis",
];

export default function TakesSearch() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [q, setQ] = useState(searchParams.get("q") ?? "");
  const [sport, setSport] = useState(searchParams.get("sport") ?? "");
  const [isPending, startTransition] = useTransition();

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    startTransition(() => {
      const params = new URLSearchParams();
      if (q.trim()) params.set("q", q.trim());
      if (sport) params.set("sport", sport);
      router.push(`/takes?${params.toString()}`);
    });
  }

  function clearFilters() {
    setQ("");
    setSport("");
    router.push("/takes");
  }

  const hasFilters = q || sport;

  return (
    <form onSubmit={handleSearch} className="space-y-3">
      <div className="flex gap-3">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by player, team, or keyword…"
          className="flex-1 rounded-lg bg-zinc-900 border border-zinc-700 px-4 py-2.5 text-zinc-50 placeholder-zinc-600 focus:border-emerald-500 focus:outline-none"
        />
        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg bg-zinc-800 px-5 py-2.5 text-zinc-300 hover:bg-zinc-700 transition-colors disabled:opacity-50"
        >
          {isPending ? "…" : "Search"}
        </button>
        {hasFilters && (
          <button
            type="button"
            onClick={clearFilters}
            className="rounded-lg border border-zinc-700 px-4 py-2.5 text-zinc-500 hover:text-zinc-300 transition-colors text-sm"
          >
            Clear
          </button>
        )}
      </div>

      {/* Sport filter pills */}
      <div className="flex flex-wrap gap-2">
        {SPORTS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setSport(sport === s ? "" : s)}
            className={`rounded-full px-3 py-1 text-xs transition-colors ${
              sport === s
                ? "bg-emerald-500 text-black font-semibold"
                : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
            }`}
          >
            {s}
          </button>
        ))}
      </div>
    </form>
  );
}
