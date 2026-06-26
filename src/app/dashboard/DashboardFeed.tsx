"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import TakeCard from "@/components/TakeCard";
import { saveTake, unsaveTake } from "@/app/actions/saves";

interface DashboardFeedProps {
  takes: any[];
  initialSavedIds: string[];
}

const STATUS_OPTIONS = [
  { label: "RIGHT",   value: "confirmed_true" },
  { label: "WRONG",   value: "confirmed_false" },
  { label: "PENDING", value: "pending" },
];

function normalizeSport(sport: string | null | undefined): string {
  if (!sport) return "Unknown";
  return sport.replace(/^\d{4}(?:-\d{2,4})?\s+/i, "");
}

function MultiSelect({
  label,
  options,
  selected,
  onChange,
}: {
  label: string;
  options: { label: string; value: string }[];
  selected: Set<string>;
  onChange: (v: Set<string>) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  function toggle(value: string) {
    const next = new Set(selected);
    next.has(value) ? next.delete(value) : next.add(value);
    onChange(next);
  }

  const active = selected.size > 0;

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          fontFamily: "'JetBrains Mono', monospace", fontWeight: 700,
          fontSize: 11, letterSpacing: ".14em", textTransform: "uppercase",
          padding: "7px 12px", border: `1.5px solid ${active ? "#15201a" : "#d1d5db"}`,
          background: active ? "#15201a" : "#fff", color: active ? "#fff" : "#15201a",
          cursor: "pointer", display: "flex", alignItems: "center", gap: 6, whiteSpace: "nowrap",
        }}
      >
        {label}{active ? ` (${selected.size})` : ""} ▾
      </button>
      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 4px)", left: 0, zIndex: 40,
          background: "#fff", border: "1.5px solid #15201a", minWidth: 160,
          boxShadow: "4px 4px 0 #15201a",
        }}>
          {options.map((opt) => (
            <label key={opt.value} style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "8px 12px", cursor: "pointer",
              fontFamily: "'JetBrains Mono', monospace", fontSize: 11,
              letterSpacing: ".12em", textTransform: "uppercase",
              background: selected.has(opt.value) ? "#f5f1e8" : "#fff",
              borderBottom: "1px solid #f0ede7",
            }}>
              <input
                type="checkbox"
                checked={selected.has(opt.value)}
                onChange={() => toggle(opt.value)}
                style={{ accentColor: "#e2241a" }}
              />
              {opt.label}
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

export default function DashboardFeed({ takes, initialSavedIds }: DashboardFeedProps) {
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set(initialSavedIds));
  const [analystFilter, setAnalystFilter] = useState<Set<string>>(new Set());
  const [sportFilter, setSportFilter] = useState<Set<string>>(new Set());
  const [statusFilter, setStatusFilter] = useState<Set<string>>(new Set());

  // Derive analyst options from takes
  const analystOptions = Array.from(
    new Map(takes.map((t) => [t.experts?.expert_id, { label: t.experts?.name ?? "Unknown", value: t.experts?.expert_id ?? "" }])).values()
  ).filter((o) => o.value);

  // Derive sport options
  const sportOptions = Array.from(new Set(takes.map((t) => normalizeSport(t.sport)).filter(Boolean)))
    .sort()
    .map((s) => ({ label: s, value: s }));

  // Filter logic: AND across categories, OR within
  const filtered = takes.filter((t) => {
    if (analystFilter.size > 0 && !analystFilter.has(t.experts?.expert_id ?? "")) return false;
    if (sportFilter.size > 0 && !sportFilter.has(normalizeSport(t.sport))) return false;
    if (statusFilter.size > 0) {
      const status = t.outcome_status ?? "pending";
      const match =
        (statusFilter.has("confirmed_true") && status === "confirmed_true") ||
        (statusFilter.has("confirmed_false") && (status === "confirmed_false" || status === "partially_true")) ||
        (statusFilter.has("pending") && (status === "pending" || status === "unresolvable"));
      if (!match) return false;
    }
    return true;
  });

  const hasFilters = analystFilter.size > 0 || sportFilter.size > 0 || statusFilter.size > 0;

  function clearAll() {
    setAnalystFilter(new Set());
    setSportFilter(new Set());
    setStatusFilter(new Set());
  }

  const handleSave = useCallback(async (takeId: string, save: boolean) => {
    // Optimistic update
    setSavedIds((prev) => {
      const next = new Set(prev);
      save ? next.add(takeId) : next.delete(takeId);
      return next;
    });
    try {
      save ? await saveTake(takeId) : await unsaveTake(takeId);
    } catch {
      // Revert on error
      setSavedIds((prev) => {
        const next = new Set(prev);
        save ? next.delete(takeId) : next.add(takeId);
        return next;
      });
    }
  }, []);

  return (
    <div>
      {/* Header + filters */}
      <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 10, marginBottom: 16 }}>
        <span style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 15, textTransform: "uppercase", letterSpacing: "-.01em", color: "#15201a" }}>
          YOUR FEED
        </span>
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: "#8a8a82", letterSpacing: ".1em" }}>
          {filtered.length} take{filtered.length !== 1 ? "s" : ""}
        </span>
      </div>

      <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 8, marginBottom: 20 }}>
        <MultiSelect label="ANALYST" options={analystOptions} selected={analystFilter} onChange={setAnalystFilter} />
        <MultiSelect label="SPORT"   options={sportOptions}   selected={sportFilter}   onChange={setSportFilter} />
        <MultiSelect label="STATUS"  options={STATUS_OPTIONS} selected={statusFilter}  onChange={setStatusFilter} />
        {hasFilters && (
          <button
            onClick={clearAll}
            style={{
              fontFamily: "'JetBrains Mono', monospace", fontWeight: 700,
              fontSize: 11, letterSpacing: ".14em", textTransform: "uppercase",
              padding: "7px 12px", border: "1.5px solid #e2241a",
              background: "#fff", color: "#e2241a", cursor: "pointer",
            }}
          >
            CLEAR ×
          </button>
        )}
      </div>

      {/* Feed */}
      {filtered.length === 0 ? (
        <div style={{
          border: "1.5px dashed #d1d5db", padding: "40px 24px", textAlign: "center",
          fontStyle: "italic", color: "#8a8a82", fontSize: 15,
        }}>
          No takes match these filters.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {filtered.map((take) => {
            // Countdown row for pending takes grading soon (≤7 days)
            const isPending = !take.outcome_status || take.outcome_status === "pending";
            const resDate = take.time_horizon_date;
            const daysLeft = resDate
              ? Math.ceil((new Date(resDate).getTime() - Date.now()) / 86_400_000)
              : null;
            const gradingSoon = isPending && daysLeft !== null && daysLeft <= 7 && daysLeft >= 0;

            return (
              <div key={take.take_id}>
                {gradingSoon && (
                  <div style={{
                    background: "#fff5f5", border: "1.5px solid #e2241a", borderBottom: "none",
                    padding: "8px 16px", display: "flex", alignItems: "center", gap: 10,
                    fontFamily: "'JetBrains Mono', monospace", fontSize: 11, letterSpacing: ".14em",
                  }}>
                    <span style={{ color: "#e2241a", fontWeight: 700 }}>
                      {daysLeft === 0 ? "TODAY" : `${daysLeft}D`}
                    </span>
                    <span style={{ color: "#8a8a82" }}>GRADES SOON</span>
                  </div>
                )}
                <TakeCard
                  take={take}
                  showExpert
                  showSave
                  showResolutionDate
                  isSaved={savedIds.has(take.take_id)}
                  onSave={handleSave}
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
