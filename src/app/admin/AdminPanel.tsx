"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { toggleFlag, type FeatureFlag } from "@/app/actions/flags";

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

export default function AdminPanel({
  initialFlags,
  stats,
}: {
  initialFlags: FeatureFlag[];
  stats: DashboardStats;
}) {
  const [flags, setFlags] = useState(initialFlags);
  const [isPending, startTransition] = useTransition();
  const [lastSaved, setLastSaved] = useState<string | null>(null);

  function handleToggle(key: string, enabled: boolean) {
    setFlags((prev) =>
      prev.map((f) => (f.key === key ? { ...f, enabled } : f))
    );
    startTransition(async () => {
      await toggleFlag(key, enabled);
      setLastSaved(FLAG_LABELS[key] ?? key);
    });
  }

  return (
    <div className="max-w-3xl space-y-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Admin Panel</h1>
          <p className="mt-1 text-gray-500">Control site-wide features and access.</p>
        </div>
        {isPending && (
          <span className="text-sm text-gray-500">Saving…</span>
        )}
        {!isPending && lastSaved && (
          <span className="text-sm text-emerald-400">✓ Saved</span>
        )}
      </div>

      {/* ── Today at a glance ── */}
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
  );
}
