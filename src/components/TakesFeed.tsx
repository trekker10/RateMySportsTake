"use client";

import { useState, useRef, useEffect } from "react";
import TakeCard from "@/components/TakeCard";

interface TakesFeedProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  takes: any[];
  isLoggedIn?: boolean;
  followedTakeIds?: string[];
}

const VERDICT_OPTIONS = [
  { label: "RIGHT",        values: ["confirmed_true"] },
  { label: "PARTLY RIGHT", values: ["partially_true"] },
  { label: "WRONG",        values: ["confirmed_false"] },
  { label: "PENDING",      values: ["pending"] },
  { label: "N/A",          values: ["unresolvable"] },
];

const PAGE_SIZE_OPTIONS = [10, 25, 50];

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

function PageSizeSelect({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          display: "flex", alignItems: "center", gap: 6,
          fontFamily: "'JetBrains Mono', monospace", fontSize: 11,
          letterSpacing: "0.14em", textTransform: "uppercase", fontWeight: 700,
          padding: "9px 12px", background: "#fff", color: "#161a17",
          border: "1.5px solid #161a17", cursor: "pointer", whiteSpace: "nowrap",
        }}
      >
        {value} / page
        <span style={{ fontSize: 9 }}>{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 4px)", right: 0, zIndex: 100,
          background: "#fff", border: "1.5px solid #161a17",
          minWidth: 110, boxShadow: "4px 4px 0 #161a17",
        }}>
          {PAGE_SIZE_OPTIONS.map((n) => (
            <button
              key={n}
              onClick={() => { onChange(n); setOpen(false); }}
              style={{
                width: "100%", padding: "9px 14px", background: n === value ? "#f5f0e6" : "#fff",
                border: "none", cursor: "pointer", textAlign: "left",
                fontFamily: "'JetBrains Mono', monospace", fontSize: 11,
                letterSpacing: "0.12em", textTransform: "uppercase",
                fontWeight: n === value ? 700 : 400, color: "#161a17",
                borderBottom: "1px solid #e5e7eb",
              }}
            >
              {n} / page
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function Pagination({
  page,
  totalPages,
  onPage,
}: {
  page: number;
  totalPages: number;
  onPage: (p: number) => void;
}) {
  if (totalPages <= 1) return null;

  // Build page number list with ellipsis
  const pages: (number | "...")[] = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    if (page > 3) pages.push("...");
    for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) pages.push(i);
    if (page < totalPages - 2) pages.push("...");
    pages.push(totalPages);
  }

  const btn = (label: React.ReactNode, target: number, disabled = false, active = false) => (
    <button
      key={String(label) + String(target)}
      onClick={() => !disabled && onPage(target)}
      disabled={disabled}
      style={{
        fontFamily: "'JetBrains Mono', monospace", fontSize: 11,
        letterSpacing: "0.12em", textTransform: "uppercase", fontWeight: active ? 800 : 500,
        padding: "7px 11px", minWidth: 36,
        background: active ? "#161a17" : "#fff",
        color: active ? "#fff" : disabled ? "#d1d5db" : "#161a17",
        border: "1.5px solid " + (active ? "#161a17" : disabled ? "#e5e7eb" : "#161a17"),
        cursor: disabled ? "default" : "pointer",
      }}
    >
      {label}
    </button>
  );

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 4, justifyContent: "center", marginTop: 32, flexWrap: "wrap" }}>
      {btn("←", page - 1, page === 1)}
      {pages.map((p, i) =>
        p === "..."
          ? <span key={`ellipsis-${i}`} style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: "#9ca3af", padding: "0 4px" }}>…</span>
          : btn(p, p as number, false, p === page)
      )}
      {btn("→", page + 1, page === totalPages)}
    </div>
  );
}

export default function TakesFeed({ takes, isLoggedIn = false, followedTakeIds = [] }: TakesFeedProps) {
  const [selectedSports, setSelectedSports] = useState<string[]>([]);
  const [selectedVerdicts, setSelectedVerdicts] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  function normalizeSport(sport: string): string {
    return sport.replace(/^\d{4}(?:-\d{2,4})?\s+/i, "").trim();
  }

  const sportOptions = Array.from(
    new Set(takes.map((t) => t.sport ? normalizeSport(t.sport) : null).filter(Boolean))
  ).sort() as string[];

  const verdictOptions = VERDICT_OPTIONS
    .filter((v) => takes.some((t) => v.values.includes(t.outcome_status)))
    .map((v) => v.label);

  const searchLower = search.trim().toLowerCase();

  const filtered = takes.filter((t) => {
    const sportMatch = selectedSports.length === 0 || selectedSports.includes(normalizeSport(t.sport ?? ""));
    const verdictMatch =
      selectedVerdicts.length === 0 ||
      VERDICT_OPTIONS.filter((v) => selectedVerdicts.includes(v.label))
        .some((v) => v.values.includes(t.outcome_status));
    const searchMatch = !searchLower || [
      t.summary, t.raw_text, t.experts?.name, t.sport,
      ...(t.subjects ?? []),
    ].some((s) => typeof s === "string" && s.toLowerCase().includes(searchLower));
    return sportMatch && verdictMatch && searchMatch;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const paginated = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  function handleFilter(setter: (v: string[]) => void) {
    return (v: string[]) => { setter(v); setPage(1); };
  }
  function handleSearch(v: string) { setSearch(v); setPage(1); }
  function handlePageSize(n: number) { setPageSize(n); setPage(1); }

  return (
    <div>
      {/* Search bar */}
      <div style={{ marginBottom: 14 }}>
        <input
          type="text"
          value={search}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="Search takes, analysts, subjects…"
          style={{
            width: "100%", boxSizing: "border-box",
            fontFamily: "'Space Grotesk', sans-serif", fontSize: 14,
            padding: "10px 14px", border: "1.5px solid #161a17",
            outline: "none", color: "#161a17", background: "#fff",
          }}
        />
      </div>

      {/* Filter bar */}
      <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 20, flexWrap: "wrap" }}>
        <MultiSelect
          label="Sport"
          options={sportOptions}
          selected={selectedSports}
          onChange={handleFilter(setSelectedSports)}
        />
        <MultiSelect
          label="Verdict"
          options={verdictOptions}
          selected={selectedVerdicts}
          onChange={handleFilter(setSelectedVerdicts)}
        />
        {(selectedSports.length > 0 || selectedVerdicts.length > 0 || search) && (
          <button
            onClick={() => { setSelectedSports([]); setSelectedVerdicts([]); setSearch(""); setPage(1); }}
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
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 10, letterSpacing: "0.14em", color: "#9ca3af", textTransform: "uppercase",
        }}>
          {filtered.length} take{filtered.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Grid */}
      {paginated.length > 0 ? (
        <div
          className="takes-feed-grid"
          style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "34px", alignItems: "start" }}
          className="mt-[25px] sm:mt-[10px]"
        >
          {paginated.map((take) => (
            <TakeCard
              key={take.take_id}
              take={take}
              showExpert
              showFollow
              isLoggedIn={isLoggedIn}
              isFollowing={followedTakeIds.includes(take.take_id)}
            />
          ))}
        </div>
      ) : (
        <div style={{
          border: "2px solid #111827", padding: "48px 16px",
          textAlign: "center", fontStyle: "italic", color: "#9ca3af", background: "#fff",
        }}>
          No takes match.
        </div>
      )}

      {/* Pagination + page size */}
      <Pagination page={safePage} totalPages={totalPages} onPage={setPage} />

      {filtered.length > 0 && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 16, marginTop: 12, flexWrap: "wrap" }}>
          <p style={{
            fontFamily: "'JetBrains Mono', monospace", fontSize: 10,
            letterSpacing: "0.12em", textTransform: "uppercase", color: "#9ca3af", margin: 0,
          }}>
            Page {safePage} of {totalPages} · showing {(safePage - 1) * pageSize + 1}–{Math.min(safePage * pageSize, filtered.length)} of {filtered.length}
          </p>
          <PageSizeSelect value={pageSize} onChange={handlePageSize} />
        </div>
      )}
    </div>
  );
}
