"use client";

import { useState, useRef, useEffect } from "react";
import TakeCard from "@/components/TakeCard";

interface TakesFeedProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  takes: any[];
}

const VERDICT_OPTIONS = [
  { label: "RIGHT",       values: ["confirmed_true"] },
  { label: "PARTLY RIGHT", values: ["partially_true"] },
  { label: "WRONG",       values: ["confirmed_false"] },
  { label: "PENDING",     values: ["pending"] },
  { label: "N/A",         values: ["unresolvable"] },
];

function MultiSelect({
  label,
  options,
  selected,
  onChange,
}: {
  label: string;
  options: string[];
  selected: string[];
  onChange: (next: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function toggle(opt: string) {
    onChange(selected.includes(opt)
      ? selected.filter((s) => s !== opt)
      : [...selected, opt]);
  }

  const activeCount = selected.length;

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          display: "flex", alignItems: "center", gap: 8,
          fontFamily: "'JetBrains Mono', monospace", fontSize: 11,
          letterSpacing: "0.14em", textTransform: "uppercase", fontWeight: 700,
          padding: "9px 14px", background: activeCount > 0 ? "#161a17" : "#fff",
          color: activeCount > 0 ? "#fff" : "#161a17",
          border: "1.5px solid #161a17", cursor: "pointer", whiteSpace: "nowrap",
        }}
      >
        {label}{activeCount > 0 ? ` (${activeCount})` : ""}
        <span style={{ fontSize: 9, marginLeft: 2 }}>{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 4px)", left: 0, zIndex: 100,
          background: "#fff", border: "1.5px solid #161a17",
          minWidth: 180, boxShadow: "4px 4px 0 #161a17",
        }}>
          {options.map((opt) => {
            const checked = selected.includes(opt);
            return (
              <button
                key={opt}
                onClick={() => toggle(opt)}
                style={{
                  width: "100%", display: "flex", alignItems: "center", gap: 10,
                  padding: "9px 14px", background: checked ? "#f5f0e6" : "#fff",
                  border: "none", cursor: "pointer", textAlign: "left",
                  fontFamily: "'JetBrains Mono', monospace", fontSize: 11,
                  letterSpacing: "0.12em", textTransform: "uppercase", fontWeight: checked ? 700 : 400,
                  color: "#161a17", borderBottom: "1px solid #e5e7eb",
                }}
              >
                <span style={{
                  width: 14, height: 14, border: "1.5px solid #161a17",
                  background: checked ? "#161a17" : "#fff", display: "inline-flex",
                  alignItems: "center", justifyContent: "center", flexShrink: 0,
                }}>
                  {checked && <span style={{ color: "#fff", fontSize: 9, lineHeight: 1 }}>✓</span>}
                </span>
                {opt}
              </button>
            );
          })}
          {selected.length > 0 && (
            <button
              onClick={() => onChange([])}
              style={{
                width: "100%", padding: "8px 14px", background: "transparent",
                border: "none", cursor: "pointer",
                fontFamily: "'JetBrains Mono', monospace", fontSize: 10,
                letterSpacing: "0.12em", textTransform: "uppercase",
                color: "#9ca3af", textAlign: "left",
              }}
            >
              Clear
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default function TakesFeed({ takes }: TakesFeedProps) {
  const [selectedSports, setSelectedSports] = useState<string[]>([]);
  const [selectedVerdicts, setSelectedVerdicts] = useState<string[]>([]);

  // Derive sport options dynamically from actual takes data
  const sportOptions = Array.from(
    new Set(takes.map((t) => t.sport).filter(Boolean))
  ).sort() as string[];

  const filtered = takes.filter((t) => {
    const sportMatch = selectedSports.length === 0 || selectedSports.includes(t.sport);
    const verdictMatch =
      selectedVerdicts.length === 0 ||
      VERDICT_OPTIONS.filter((v) => selectedVerdicts.includes(v.label))
        .some((v) => v.values.includes(t.outcome_status));
    return sportMatch && verdictMatch;
  });

  const verdictOptions = VERDICT_OPTIONS
    .filter((v) => takes.some((t) => v.values.includes(t.outcome_status)))
    .map((v) => v.label);

  return (
    <div>
      {/* Filter bar */}
      <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 20, flexWrap: "wrap" }}>
        <MultiSelect
          label="Sport"
          options={sportOptions}
          selected={selectedSports}
          onChange={setSelectedSports}
        />
        <MultiSelect
          label="Verdict"
          options={verdictOptions}
          selected={selectedVerdicts}
          onChange={setSelectedVerdicts}
        />
        {(selectedSports.length > 0 || selectedVerdicts.length > 0) && (
          <button
            onClick={() => { setSelectedSports([]); setSelectedVerdicts([]); }}
            style={{
              fontFamily: "'JetBrains Mono', monospace", fontSize: 10,
              letterSpacing: "0.12em", textTransform: "uppercase",
              color: "#9ca3af", background: "none", border: "none", cursor: "pointer",
            }}
          >
            Clear all
          </button>
        )}
        <span style={{
          marginLeft: "auto", fontFamily: "'JetBrains Mono', monospace",
          fontSize: 10, letterSpacing: "0.14em", color: "#9ca3af", textTransform: "uppercase",
        }}>
          {filtered.length} take{filtered.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Grid */}
      {filtered.length > 0 ? (
        <div
          className="takes-feed-grid"
          style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px", alignItems: "start" }}
        >
          {filtered.map((take) => (
            <TakeCard key={take.take_id} take={take} showExpert />
          ))}
        </div>
      ) : (
        <div style={{
          border: "2px solid #111827", padding: "48px 16px",
          textAlign: "center", fontStyle: "italic", color: "#9ca3af", background: "#fff",
        }}>
          No takes match the selected filters.
        </div>
      )}
    </div>
  );
}
