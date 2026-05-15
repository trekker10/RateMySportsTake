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
          className="flex-1 rounded-lg bg-white border border-gray-300 px-4 py-2.5 text-gray-900 placeholder-gray-400 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
        />
        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg bg-gray-800 px-5 py-2.5 text-gray-200 hover:bg-gray-700 transition-colors disabled:opacity-50"
        >
          {isPending ? "…" : "Search"}
        </button>
        {hasFilters && (
          <button
            type="button"
            onClick={clearFilters}
            className="rounded-lg border border-gray-300 px-4 py-2.5 text-gray-500 hover:text-gray-700 transition-colors text-sm"
          >
            Clear
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {SPORTS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setSport(sport === s ? "" : s)}
            className={`rounded-full px-3 py-1 text-xs transition-colors border ${
              sport === s
                ? "bg-emerald-500 text-white border-emerald-500 font-semibold"
                : "bg-white text-gray-600 border-gray-300 hover:border-gray-400"
            }`}
          >
            {s}
          </button>
        ))}
      </div>
    </form>
  );
}
