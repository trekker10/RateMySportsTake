import { redirect } from "next/navigation";
import { checkIsAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import {
  getFantasyConfig,
  getFantasyConfigHistory,
  getFantasyDashboard,
} from "@/app/actions/fantasy-takescore";
import { getPendingFantasyTakes } from "@/app/actions/fantasy-takes";
import FantasyDashboard from "./FantasyDashboard";
import FantasyTakeEntry from "./FantasyTakeEntry";
import FantasyGradingPanel from "./FantasyGradingPanel";
import FantasyScoringConfig from "./FantasyScoringConfig";
import FantasyAccolades from "./FantasyAccolades";

const TABS = ["dashboard", "entry", "grading", "config", "accolades"] as const;
type Tab = (typeof TABS)[number];

const TAB_LABELS: Record<Tab, string> = {
  dashboard: "Dashboard",
  entry:     "Add Take",
  grading:   "Grade Pending",
  config:    "Scoring Config",
  accolades: "Accolades",
};

export default async function FantasyTakeScorePage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const isAdmin = await checkIsAdmin();
  if (!isAdmin) redirect("/");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { tab: rawTab } = await searchParams;
  const activeTab: Tab = TABS.includes(rawTab as Tab) ? (rawTab as Tab) : "dashboard";

  const [config, configHistory, experts, pendingTakes] = await Promise.all([
    getFantasyConfig(),
    getFantasyConfigHistory(),
    getFantasyDashboard(),
    getPendingFantasyTakes(),
  ]);

  // Extract slim expert list for dropdowns
  const expertList = experts.map(e => ({ expert_id: e.expert_id, name: e.name }));

  return (
    <div className="max-w-6xl space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-zinc-100 flex items-center gap-2">
          🏈 Fantasy Take Score
        </h1>
        <p className="text-sm text-zinc-400 mt-1">
          Track, grade, and score fantasy sports predictions across all analysts.
        </p>
      </div>

      {/* Tab navigation */}
      <div className="flex gap-1 border-b border-zinc-800">
        {TABS.map(tab => (
          <a
            key={tab}
            href={`/admin/fantasy-take-score?tab=${tab}`}
            className={`px-4 py-2 text-sm font-medium transition-colors rounded-t-lg ${
              activeTab === tab
                ? "bg-zinc-800 text-zinc-100 border border-b-zinc-800 border-zinc-700"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            {TAB_LABELS[tab]}
            {tab === "grading" && pendingTakes.length > 0 && (
              <span className="ml-2 inline-flex items-center justify-center px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-green-600 text-white">
                {pendingTakes.length}
              </span>
            )}
          </a>
        ))}
      </div>

      {/* Tab content */}
      <div>
        {activeTab === "dashboard" && (
          <FantasyDashboard experts={experts} />
        )}
        {activeTab === "entry" && (
          <FantasyTakeEntry experts={expertList} />
        )}
        {activeTab === "grading" && (
          <FantasyGradingPanel pendingTakes={pendingTakes} />
        )}
        {activeTab === "config" && (
          <FantasyScoringConfig
            initial={config}
            configHistory={configHistory}
            adminEmail={user?.email ?? ""}
          />
        )}
        {activeTab === "accolades" && (
          <FantasyAccolades experts={experts} />
        )}
      </div>
    </div>
  );
}
