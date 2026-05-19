"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function HeroSearch() {
  const [mode, setMode] = useState<"takes" | "analysts">("takes");
  const [q, setQ] = useState("");
  const router = useRouter();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());
    router.push(mode === "takes" ? `/takes?${params}` : `/experts?${params}`);
  }

  return (
    <form onSubmit={handleSubmit} className="mt-8 flex flex-col sm:flex-row items-stretch gap-3 max-w-3xl">
      {/* Search input */}
      <div className="flex-1 flex items-stretch border-2 border-gray-900 bg-white">
        <div className="flex items-center px-4 border-r-2 border-gray-900 shrink-0">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
        </div>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={mode === "takes" ? "search takes, topics, players…" : "search analysts by name or outlet…"}
          className="flex-1 px-4 py-3.5 bg-transparent text-gray-900 placeholder-gray-400 focus:outline-none text-base min-w-0"
        />
      </div>

      {/* Toggle + CTA — side by side on mobile, stacked row on desktop */}
      <div className="flex items-stretch gap-3">
        {/* Toggle */}
        <div className="flex items-stretch border-2 border-gray-900 bg-white shrink-0">
          <button
            type="button"
            onClick={() => setMode("takes")}
            className={`px-3 py-2.5 font-mono text-[11px] tracking-widest transition-colors ${
              mode === "takes" ? "bg-gray-900 text-white" : "text-gray-400 hover:text-gray-700"
            }`}
          >
            TAKES
          </button>
          <button
            type="button"
            onClick={() => setMode("analysts")}
            className={`px-3 py-2.5 font-mono text-[11px] tracking-widest transition-colors border-l-2 border-gray-900 ${
              mode === "analysts" ? "bg-gray-900 text-white" : "text-gray-400 hover:text-gray-700"
            }`}
          >
            ANALYSTS
          </button>
        </div>

        {/* CTA */}
        <button
          type="submit"
          className="flex-1 sm:flex-none px-5 py-3 font-black italic text-base tracking-wide text-white whitespace-nowrap"
          style={{ backgroundColor: "#e2241a" }}
        >
          EXPLORE ▸
        </button>
      </div>
    </form>
  );
}
