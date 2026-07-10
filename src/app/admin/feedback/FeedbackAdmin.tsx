"use client";

import { useState } from "react";

interface FeedbackRow {
  id: string;
  category: string;
  message: string;
  email: string | null;
  screenshot_name: string | null;
  created_at: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  analysts: "Analysts to add",
  things:   "Things to add",
  general:  "General feedback",
  bug:      "Bug report",
  grading:  "Grading dispute",
};

const CATEGORY_COLORS: Record<string, { bg: string; color: string }> = {
  analysts: { bg: "#dbeafe", color: "#1d4ed8" },
  things:   { bg: "#ede9fe", color: "#6d28d9" },
  general:  { bg: "#f3f4f6", color: "#374151" },
  bug:      { bg: "#fee2e2", color: "#b91c1c" },
  grading:  { bg: "#fef9c3", color: "#a16207" },
};

type SortKey = "newest" | "oldest" | "category";

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString("en-US", {
    month: "short", day: "numeric", year: "numeric",
    hour: "numeric", minute: "2-digit",
  });
}

export default function FeedbackAdmin({ initialRows }: { initialRows: FeedbackRow[] }) {
  const [rows]            = useState<FeedbackRow[]>(initialRows);
  const [sort, setSort]   = useState<SortKey>("newest");
  const [filter, setFilter] = useState<string>("all");
  const [expanded, setExpanded] = useState<string | null>(null);

  const filtered = rows.filter((r) => filter === "all" || r.category === filter);

  const sorted = [...filtered].sort((a, b) => {
    if (sort === "newest")   return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    if (sort === "oldest")   return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    if (sort === "category") return (a.category ?? "").localeCompare(b.category ?? "");
    return 0;
  });

  const categories = Array.from(new Set(rows.map((r) => r.category))).sort();

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ margin: "0 0 4px", fontSize: 28, fontWeight: 800, color: "#111827", letterSpacing: "-0.02em" }}>
          Feedback
        </h1>
        <p style={{ margin: 0, fontSize: 14, color: "#6b7280" }}>
          {rows.length} submission{rows.length !== 1 ? "s" : ""} from ratemysportstake.com/feedback
        </p>
      </div>

      {/* Controls */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
        {/* Category filter */}
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          <button
            onClick={() => setFilter("all")}
            style={{
              padding: "6px 12px", border: "1px solid", borderRadius: 6, fontSize: 12, fontWeight: 600,
              cursor: "pointer",
              background: filter === "all" ? "#111827" : "#fff",
              color:      filter === "all" ? "#fff"    : "#374151",
              borderColor: filter === "all" ? "#111827" : "#d1d5db",
            }}
          >
            All ({rows.length})
          </button>
          {categories.map((cat) => {
            const c = CATEGORY_COLORS[cat] ?? { bg: "#f3f4f6", color: "#374151" };
            const count = rows.filter((r) => r.category === cat).length;
            return (
              <button
                key={cat}
                onClick={() => setFilter(cat)}
                style={{
                  padding: "6px 12px", border: "1px solid", borderRadius: 6, fontSize: 12, fontWeight: 600,
                  cursor: "pointer",
                  background: filter === cat ? c.color : "#fff",
                  color:      filter === cat ? "#fff"   : c.color,
                  borderColor: c.color,
                }}
              >
                {CATEGORY_LABELS[cat] ?? cat} ({count})
              </button>
            );
          })}
        </div>

        {/* Sort */}
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 12, color: "#6b7280", fontWeight: 600 }}>Sort:</span>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            style={{
              border: "1px solid #d1d5db", borderRadius: 6, padding: "6px 10px",
              fontSize: 12, fontFamily: "inherit", color: "#111827",
              background: "#fff", cursor: "pointer", outline: "none",
            }}
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="category">By category</option>
          </select>
        </div>
      </div>

      {/* Table */}
      {sorted.length === 0 ? (
        <div style={{ padding: "60px 20px", textAlign: "center", background: "#fff", border: "1px solid #e5e7eb", borderRadius: 8 }}>
          <p style={{ margin: "0 0 6px", fontSize: 24 }}>📭</p>
          <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: "#374151" }}>No feedback yet</p>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: "#9ca3af" }}>Submissions from /feedback will appear here.</p>
        </div>
      ) : (
        <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 8, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "#f9fafb" }}>
                {["Submitted", "Category", "Message", "Email", ""].map((h) => (
                  <th key={h} style={{
                    padding: "10px 16px", textAlign: "left",
                    fontWeight: 700, fontSize: 10, letterSpacing: "0.1em",
                    textTransform: "uppercase", color: "#6b7280",
                    borderBottom: "1px solid #e5e7eb", whiteSpace: "nowrap",
                  }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.map((row) => {
                const catColor = CATEGORY_COLORS[row.category] ?? { bg: "#f3f4f6", color: "#374151" };
                const isExpanded = expanded === row.id;
                return (
                  <>
                    <tr
                      key={row.id}
                      style={{
                        borderBottom: isExpanded ? "none" : "1px solid #f3f4f6",
                        background: isExpanded ? "#fafafa" : "#fff",
                      }}
                    >
                      {/* Date */}
                      <td style={{ padding: "12px 16px", whiteSpace: "nowrap", color: "#6b7280", fontSize: 12 }}>
                        {fmtDate(row.created_at)}
                      </td>

                      {/* Category badge */}
                      <td style={{ padding: "12px 16px", whiteSpace: "nowrap" }}>
                        <span style={{
                          fontSize: 10, fontWeight: 700, letterSpacing: "0.08em",
                          textTransform: "uppercase", padding: "3px 8px", borderRadius: 99,
                          background: catColor.bg, color: catColor.color,
                        }}>
                          {CATEGORY_LABELS[row.category] ?? row.category}
                        </span>
                      </td>

                      {/* Message preview */}
                      <td style={{ padding: "12px 16px", color: "#374151", maxWidth: 360 }}>
                        <span style={{
                          display: "block", overflow: "hidden", textOverflow: "ellipsis",
                          whiteSpace: isExpanded ? "normal" : "nowrap",
                          lineHeight: 1.5,
                        }}>
                          {row.message}
                        </span>
                        {row.screenshot_name && (
                          <span style={{ display: "block", fontSize: 11, color: "#9ca3af", marginTop: 3, fontFamily: "monospace" }}>
                            📎 {row.screenshot_name}
                          </span>
                        )}
                      </td>

                      {/* Email */}
                      <td style={{ padding: "12px 16px", color: "#6b7280", fontSize: 12, whiteSpace: "nowrap" }}>
                        {row.email ? (
                          <a href={`mailto:${row.email}`} style={{ color: "#2563eb", textDecoration: "none", fontWeight: 500 }}>
                            {row.email}
                          </a>
                        ) : (
                          <span style={{ color: "#d1d5db" }}>—</span>
                        )}
                      </td>

                      {/* Expand toggle */}
                      <td style={{ padding: "12px 16px", textAlign: "right" }}>
                        <button
                          onClick={() => setExpanded(isExpanded ? null : row.id)}
                          style={{
                            background: "none", border: "1px solid #e5e7eb", borderRadius: 4,
                            padding: "4px 8px", cursor: "pointer", fontSize: 11,
                            color: "#6b7280", fontWeight: 600,
                          }}
                        >
                          {isExpanded ? "▲ Less" : "▼ More"}
                        </button>
                      </td>
                    </tr>

                    {/* Expanded message row */}
                    {isExpanded && (
                      <tr key={`${row.id}-expanded`} style={{ borderBottom: "1px solid #f3f4f6", background: "#fafafa" }}>
                        <td colSpan={5} style={{ padding: "0 16px 16px 16px" }}>
                          <div style={{
                            background: "#fff", border: "1px solid #e5e7eb", borderRadius: 6,
                            padding: "14px 16px", fontSize: 14, color: "#111827",
                            lineHeight: 1.65, whiteSpace: "pre-wrap",
                          }}>
                            {row.message}
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
