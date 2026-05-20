"use client";

import { useState } from "react";
import type { TakeScoreConfig } from "@/lib/takescore";
import ScoringConfig from "./ScoringConfig";
import TakeEntry from "./TakeEntry";
import AnalystDashboard from "./AnalystDashboard";
import AccoladesPanel from "./AccoladesPanel";

type Tab = "config" | "entry" | "analysts" | "accolades";

const TABS: { key: Tab; label: string }[] = [
  { key: "config",    label: "Scoring Config" },
  { key: "entry",     label: "Take Entry & Grading" },
  { key: "analysts",  label: "Analyst Dashboard" },
  { key: "accolades", label: "Accolades" },
];

export default function TakeScoreAdmin({
  config,
  configHistory,
  adminEmail,
}: {
  config: TakeScoreConfig;
  configHistory: Array<{ id: string; changed_at: string; changed_by: string; changes: Record<string, unknown> }>;
  adminEmail: string;
}) {
  const [tab, setTab] = useState<Tab>("config");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">TakeScore Admin</h1>
        <p className="mt-1 text-zinc-400">Configure the scoring engine, enter takes, grade outcomes, and manage accolades.</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-zinc-800">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
              tab === t.key
                ? "border-white text-white"
                : "border-transparent text-zinc-400 hover:text-zinc-200"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "config"    && <ScoringConfig config={config} configHistory={configHistory} adminEmail={adminEmail} />}
      {tab === "entry"     && <TakeEntry />}
      {tab === "analysts"  && <AnalystDashboard />}
      {tab === "accolades" && <AccoladesPanel />}
    </div>
  );
}
