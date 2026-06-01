"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Mode = "analysts" | "gurus";

const GREEN = "#15803d";
const RED   = "#e2241a";

export default function HeroSection() {
  const [mode, setMode] = useState<Mode>("analysts");
  const [q, setQ]       = useState("");
  const router          = useRouter();

  const isGurus = mode === "gurus";
  const accent  = isGurus ? GREEN : RED;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());
    if (isGurus) params.set("fantasy", "true");
    router.push(`/experts?${params}`);
  }

  return (
    <>
      {/* Dynamic headline */}
      <h1
        className="hero-headline mt-4 font-black italic leading-none tracking-tighter text-gray-900"
      >
        HOLD<br />
        <span style={{ color: accent, transition: "color 0.2s" }}>
          {isGurus ? "THE GURUS" : "THE TAKES"}
        </span><br />
        <span style={{
          WebkitTextStroke: `2px #1a1a1a`,
          WebkitTextFillColor: "transparent",
        } as React.CSSProperties}>
          ACCOUNTABLE.
        </span>
      </h1>

      <p className="mt-6 max-sm:mt-7 text-xl max-sm:text-[19px] max-sm:leading-[1.5] text-gray-500 max-w-xl max-sm:max-w-[34ch]">
        {isGurus
          ? "Fantasy football gurus make bold calls, AI keeps receipts, AI grades them."
          : "Popular sports analysts make takes, AI keeps receipts, AI grades them."}
      </p>

      {/* Search bar */}
      <form onSubmit={handleSubmit} className="mt-8 max-sm:mt-9 flex flex-col sm:flex-row items-stretch gap-3 max-w-3xl max-sm:max-w-full">
        {/* Search input */}
        <div className="flex-1 flex items-stretch border-2 border-gray-900 bg-white max-sm:h-14 max-sm:mb-4">
          <div className="flex items-center px-4 border-r-2 border-gray-900 shrink-0">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" />
            </svg>
          </div>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={isGurus ? "search fantasy gurus by name or platform…" : "search analysts by name or outlet…"}
            className="flex-1 px-4 py-3.5 bg-transparent text-gray-900 placeholder-gray-400 focus:outline-none text-base min-w-0"
          />
        </div>

        {/* Toggle + CTA */}
        <div className="flex items-stretch gap-3 max-sm:flex-col">
          {/* Mode toggle */}
          <div className="flex items-stretch border-2 border-gray-900 bg-white shrink-0 max-sm:w-full max-sm:h-12">
            <button
              type="button"
              onClick={() => setMode("analysts")}
              className="max-sm:flex-1 max-sm:flex max-sm:items-center max-sm:justify-center px-3 py-2.5 font-mono text-[11px] tracking-widest transition-colors"
              style={{
                backgroundColor: !isGurus ? "#1a1a1a" : "transparent",
                color: !isGurus ? "#fff" : "#9ca3af",
              }}
            >
              ANALYSTS
            </button>
            <button
              type="button"
              onClick={() => setMode("gurus")}
              className="max-sm:flex-1 max-sm:flex max-sm:items-center max-sm:justify-center px-3 py-2.5 font-mono text-[11px] tracking-widest transition-colors border-l-2 border-gray-900"
              style={{
                backgroundColor: isGurus ? GREEN : "transparent",
                color: isGurus ? "#fff" : "#9ca3af",
              }}
            >
              FANTASY GURUS
            </button>
          </div>

          {/* CTA button */}
          <button
            type="submit"
            className="sm:flex-none px-5 py-3 max-sm:py-0 max-sm:h-[52px] max-sm:w-full max-sm:flex max-sm:items-center max-sm:justify-center font-black italic text-base tracking-wide text-white whitespace-nowrap transition-colors"
            style={{ backgroundColor: accent, transition: "background-color 0.2s" }}
          >
            {isGurus ? "GURUS ▸" : "EXPLORE ▸"}
          </button>
        </div>
      </form>
    </>
  );
}
