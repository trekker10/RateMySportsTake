"use client";

import { useState, useTransition } from "react";
import { toggleFlag, type FeatureFlag } from "@/app/actions/flags";

const FLAG_LABELS: Record<string, string> = {
  require_auth_for_submissions: "Require login to submit takes",
  new_signups_enabled:          "Allow new user signups",
  import_enabled:               "Show Import tab",
  grading_enabled:              "Enable daily auto-grading",
  public_browsing:              "Allow browsing without login",
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
}: {
  initialFlags: FeatureFlag[];
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
    <div className="max-w-2xl space-y-10">
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
