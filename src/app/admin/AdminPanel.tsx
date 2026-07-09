"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { toggleFlag, type FeatureFlag } from "@/app/actions/flags";
import { setCrowdSetting, type CrowdSettings } from "@/app/actions/crowdSettings";

interface DashboardStats {
  addedToday: number;
  analystToday: number;
  fantasyToday: number;
  totalGraded: number;
  analystGraded: number;
  fantasyGraded: number;
  reviewQueue: number;
  analystOverdue: number;
  fantasyOverdue: number;
}

function StatCard({
  label,
  value,
  sub,
  accent,
  href,
}: {
  label: string;
  value: number;
  sub: string;
  accent?: string;
  href?: string;
}) {
  const inner = (
    <div className="rounded-xl border border-gray-200 bg-white px-6 py-5 space-y-1 h-full">
      <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">{label}</p>
      <p
        className="text-4xl font-black leading-none"
        style={{ color: accent ?? "#111827" }}
      >
        {value.toLocaleString()}
      </p>
      <p className="text-sm text-gray-500">{sub}</p>
    </div>
  );
  if (href) {
    return <Link href={href} className="block hover:opacity-80 transition-opacity">{inner}</Link>;
  }
  return inner;
}

const FLAG_LABELS: Record<string, string> = {
  require_auth_for_submissions: "Require login to submit takes",
  new_signups_enabled:          "Allow new user signups",
  import_enabled:               "Show Import tab",
  grading_enabled:              "Enable daily auto-grading",
  public_browsing:              "Allow browsing without login",
  show_submit_nav:              "Show Submit link in nav (admins always see it)",
};

function Toggle({
  flag,
  onToggle,
}: {
  flag: FeatureFlag;
  onToggle: (key: string, enabled: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between py-4 border-b border-gray-200 last:border-0">
      <div>
        <p className="font-medium text-gray-900">
          {FLAG_LABELS[flag.key] ?? flag.key}
        </p>
        {flag.description && (
          <p className="text-sm text-gray-500 mt-0.5">{flag.description}</p>
        )}
      </div>
      <button
        onClick={() => onToggle(flag.key, !flag.enabled)}
        className={`relative ml-6 inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
          flag.enabled ? "bg-emerald-500" : "bg-gray-300"
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
            flag.enabled ? "translate-x-6" : "translate-x-1"
          }`}
        />
      </button>
    </div>
  );
}

type Tab = "dashboard" | "crowd-forecast";

export default function AdminPanel({
  initialFlags,
  stats,
  crowdSettings,
}: {
  initialFlags: FeatureFlag[];
  stats: DashboardStats;
  crowdSettings: CrowdSettings;
}) {
  const [tab, setTab] = useState<Tab>("dashboard");
  const [flags, setFlags] = useState(initialFlags);
  const [isPending, startTransition] = useTransition();
  const [lastSaved, setLastSaved] = useState<string | null>(null);

  // Crowd Forecast settings state
  const [minVotes, setMinVotes] = useState(crowdSettings.minVotes);
  const [minVotesDraft, setMinVotesDraft] = useState(String(crowdSettings.minVotes));
  const [cfSaving, setCfSaving] = useState(false);
  const [cfSaved, setCfSaved] = useState(false);

  function handleToggle(key: string, enabled: boolean) {
    setFlags((prev) =>
      prev.map((f) => (f.key === key ? { ...f, enabled } : f))
    );
    startTransition(async () => {
      await toggleFlag(key, enabled);
      setLastSaved(FLAG_LABELS[key] ?? key);
    });
  }

  async function saveMinVotes() {
    const val = parseInt(minVotesDraft, 10);
    if (isNaN(val) || val < 1) return;
    setCfSaving(true);
    await setCrowdSetting("crowd_forecast_min_votes", String(val));
    setMinVotes(val);
    setCfSaving(false);
    setCfSaved(true);
    setTimeout(() => setCfSaved(false), 2500);
  }

  const TABS: { id: Tab; label: string }[] = [
    { id: "dashboard",      label: "Dashboard" },
    { id: "crowd-forecast", label: "Crowd Forecast" },
  ];

  return (
    <div className="max-w-4xl space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Admin Panel</h1>
          <p className="mt-1 text-gray-500">Control site-wide features and access.</p>
        </div>
        {isPending && <span className="text-sm text-gray-500">Saving…</span>}
        {!isPending && lastSaved && <span className="text-sm text-emerald-400">✓ Saved</span>}
      </div>

      {/* ── Tabs ── */}
      <div className="flex gap-1 border-b border-gray-200">
        {TABS.map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`px-5 py-2.5 text-sm font-semibold tracking-wide rounded-t-lg transition-colors ${
              tab === id
                ? "bg-white border border-b-white border-gray-200 text-gray-900 -mb-px"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── Dashboard tab ── */}
      {tab === "dashboard" && (
        <div className="space-y-10">
          {/* Today at a glance */}
          <section className="space-y-3">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-500">
              Today at a Glance
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <StatCard
                label="Added today"
                value={stats.addedToday}
                sub={`${stats.analystToday} analyst · ${stats.fantasyToday} fantasy`}
              />
              <StatCard
                label="Total graded"
                value={stats.totalGraded}
                sub={`${stats.analystGraded} analyst · ${stats.fantasyGraded} fantasy`}
                accent="#15803d"
              />
              <StatCard
                label="Review queue"
                value={stats.reviewQueue}
                sub={`${stats.analystOverdue} analyst · ${stats.fantasyOverdue} fantasy overdue`}
                accent={stats.reviewQueue > 0 ? "#d97706" : "#111827"}
                href="/admin/takes"
              />
            </div>
          </section>

          {/* Feature flags */}
          <section className="space-y-1">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-500 mb-3">
              Feature Flags
            </h2>
            <div className="rounded-xl border border-gray-200 bg-white px-5 divide-y divide-gray-200">
              {flags.map((flag) => (
                <Toggle key={flag.key} flag={flag} onToggle={handleToggle} />
              ))}
            </div>
          </section>

          {/* Quick links */}
          <section className="space-y-3">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-500">
              Quick Links
            </h2>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Browse Takes", href: "/takes" },
                { label: "Experts", href: "/experts" },
                { label: "Manage Profiles", href: "/admin/experts" },
                { label: "Review Takes", href: "/admin/takes" },
                { label: "TakeScore Admin", href: "/admin/takescore" },
                { label: "Fantasy TakeScore Admin", href: "/admin/fantasy-take-score" },
                { label: "Submit a Take", href: "/submit" },
                { label: "Import Takes", href: "/import" },
                { label: "Grade Dashboard", href: "/grade" },
              ].map(({ label, href }) => (
                <a
                  key={href}
                  href={href}
                  className="rounded-xl border border-gray-200 bg-white px-5 py-4 text-gray-700 hover:border-gray-400 hover:text-gray-900 transition-colors"
                >
                  {label} →
                </a>
              ))}
            </div>
          </section>
        </div>
      )}

      {/* ── Crowd Forecast tab ── */}
      {tab === "crowd-forecast" && (
        <div className="space-y-8">
          <section className="space-y-4">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Crowd Forecast Settings</h2>
              <p className="mt-1 text-sm text-gray-500">
                Configure how the voting panel behaves across the site.
              </p>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white divide-y divide-gray-200">
              {/* Minimum votes threshold */}
              <div className="px-6 py-5 flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-8">
                <div className="flex-1">
                  <p className="font-medium text-gray-900">Minimum votes to reveal results</p>
                  <p className="text-sm text-gray-500 mt-0.5">
                    The crowd forecast bar and percentages stay hidden until this many votes have been cast.
                    Currently <strong>{minVotes}</strong>.
                  </p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={minVotesDraft}
                    onChange={(e) => { setMinVotesDraft(e.target.value); setCfSaved(false); }}
                    className="w-20 rounded-lg border border-gray-300 px-3 py-2 text-center text-lg font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <button
                    onClick={saveMinVotes}
                    disabled={cfSaving || parseInt(minVotesDraft, 10) === minVotes || isNaN(parseInt(minVotesDraft, 10))}
                    className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-semibold disabled:opacity-40 hover:bg-emerald-700 transition-colors"
                  >
                    {cfSaving ? "Saving…" : cfSaved ? "✓ Saved" : "Save"}
                  </button>
                </div>
              </div>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
