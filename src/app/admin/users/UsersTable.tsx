"use client";

import { useState, useRef, useEffect } from "react";
import { sendPushNotification, sendPushToAll } from "./actions";

const NOTIFICATIONS = [
  {
    id: "welcome",
    label: "Welcome",
    title: "Welcome to RateMySportsTake 🏆",
    body: "The takes are in. Come see who's been right and who's been dead wrong.",
  },
  {
    id: "new_takes",
    label: "New Takes Posted",
    title: "Fresh takes just dropped 🔥",
    body: "New analyst takes are live. Come rate 'em.",
  },
  {
    id: "grading",
    label: "Takes Being Graded",
    title: "The verdict is in ⚖️",
    body: "Some takes just got graded. See who aged well.",
  },
];

interface User {
  user_id: string;
  username: string | null;
  display_name: string | null;
  favorite_sports: string[] | null;
  user_intent: string | null;
  created_at: string;
  has_push: boolean;
}

function NotifDropdown({ userId, hasPush }: { userId: string; hasPush: boolean }) {
  const [open, setOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [lastResult, setLastResult] = useState<"ok" | "err" | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  async function send(notif: (typeof NOTIFICATIONS)[0]) {
    setSending(true);
    setOpen(false);
    try {
      const result = await sendPushNotification(userId, notif.title, notif.body);
      setLastResult(result.ok ? "ok" : "err");
    } catch {
      setLastResult("err");
    } finally {
      setSending(false);
      setTimeout(() => setLastResult(null), 3000);
    }
  }

  if (!hasPush) {
    return (
      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: "#b0aca4", letterSpacing: ".1em" }}>
        NO SUB
      </span>
    );
  }

  return (
    <div ref={ref} style={{ position: "relative", display: "inline-block" }}>
      {lastResult === "ok" && (
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: "#0a7a3b", fontWeight: 700 }}>SENT ✓</span>
      )}
      {lastResult === "err" && (
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: "#e2241a", fontWeight: 700 }}>FAILED ✗</span>
      )}
      {lastResult === null && (
        <button
          onClick={() => setOpen((o) => !o)}
          disabled={sending}
          style={{
            fontFamily: "'JetBrains Mono', monospace", fontWeight: 700,
            fontSize: 10, letterSpacing: ".12em", textTransform: "uppercase",
            padding: "5px 10px", border: "1.5px solid #15201a",
            background: "#15201a", color: "#fff",
            cursor: sending ? "not-allowed" : "pointer",
            opacity: sending ? 0.6 : 1,
            display: "flex", alignItems: "center", gap: 5, whiteSpace: "nowrap",
          }}
        >
          {sending ? "SENDING…" : "NOTIFY ▾"}
        </button>
      )}
      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 4px)", right: 0, zIndex: 50,
          background: "#fff", border: "2px solid #15201a", minWidth: 200,
          boxShadow: "4px 4px 0 #15201a",
        }}>
          {NOTIFICATIONS.map((n, i) => (
            <button
              key={n.id}
              onClick={() => send(n)}
              style={{
                display: "block", width: "100%", textAlign: "left",
                padding: "10px 14px",
                borderBottom: i < NOTIFICATIONS.length - 1 ? "1px solid #e5e7eb" : "none",
                background: "#fff", cursor: "pointer", border: "none",
                borderBottomColor: i < NOTIFICATIONS.length - 1 ? "#e5e7eb" : "transparent",
                borderBottomWidth: i < NOTIFICATIONS.length - 1 ? 1 : 0,
                borderBottomStyle: "solid",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "#f5f1e8")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "#fff")}
            >
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: "#15201a" }}>
                {n.label}
              </div>
              <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 12, color: "#8a8a82", marginTop: 2 }}>
                {n.body}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

const INTENT_LABELS: Record<string, string> = {
  receipts: "Keep receipts",
  correct: "Find right takes",
  both: "Everything",
};

function SendAllButton({ subCount }: { subCount: number }) {
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ sent: number; failed: number } | null>(null);

  const welcome = NOTIFICATIONS[0];

  async function handleSendAll() {
    if (!confirm(`Send "${welcome.label}" notification to all ${subCount} subscribers?`)) return;
    setSending(true);
    setResult(null);
    try {
      const r = await sendPushToAll(welcome.title, welcome.body);
      if (r.ok) setResult({ sent: r.sent ?? 0, failed: r.failed ?? 0 });
    } finally {
      setSending(false);
      setTimeout(() => setResult(null), 5000);
    }
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <button
        onClick={handleSendAll}
        disabled={sending || subCount === 0}
        style={{
          fontFamily: "'JetBrains Mono', monospace", fontWeight: 700,
          fontSize: 11, letterSpacing: ".12em", textTransform: "uppercase",
          padding: "8px 16px", border: "2px solid #e2241a",
          background: "#e2241a", color: "#fff",
          cursor: sending || subCount === 0 ? "not-allowed" : "pointer",
          opacity: subCount === 0 ? 0.4 : 1,
          boxShadow: "3px 3px 0 rgba(226,36,26,.3)",
        }}
      >
        {sending ? "SENDING…" : `SEND WELCOME TO ALL (${subCount})`}
      </button>
      {result && (
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: "#0a7a3b", fontWeight: 700 }}>
          ✓ {result.sent} sent{result.failed > 0 ? `, ${result.failed} failed` : ""}
        </span>
      )}
    </div>
  );
}

export default function UsersTable({ users }: { users: User[] }) {
  const [search, setSearch] = useState("");
  const [sportFilter, setSportFilter] = useState("");

  const filtered = users.filter((u) => {
    const q = search.toLowerCase();
    const matchesSearch =
      !q ||
      (u.username ?? "").toLowerCase().includes(q) ||
      (u.display_name ?? "").toLowerCase().includes(q);
    const matchesSport =
      !sportFilter || (u.favorite_sports ?? []).includes(sportFilter);
    return matchesSearch && matchesSport;
  });

  const allSports = Array.from(
    new Set(users.flatMap((u) => u.favorite_sports ?? []))
  ).sort();

  const subCount = users.filter((u) => u.has_push).length;

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 26, color: "#15201a", letterSpacing: "-.02em", marginBottom: 4 }}>
          Users
        </h1>
        <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: "#8a8a82", letterSpacing: ".1em", marginBottom: 12 }}>
          {users.length} TOTAL · {subCount} PUSH SUBSCRIBERS
        </p>
        <SendAllButton subCount={subCount} />
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search username…"
          style={{
            fontFamily: "'Space Grotesk', sans-serif", fontSize: 13,
            border: "1.5px solid #d1d5db", padding: "7px 12px", outline: "none",
            width: 200, color: "#15201a",
          }}
        />
        <select
          value={sportFilter}
          onChange={(e) => setSportFilter(e.target.value)}
          style={{
            fontFamily: "'JetBrains Mono', monospace", fontSize: 11,
            border: "1.5px solid #d1d5db", padding: "7px 12px", outline: "none",
            color: "#15201a", letterSpacing: ".1em", textTransform: "uppercase",
            background: "#fff", cursor: "pointer",
          }}
        >
          <option value="">ALL SPORTS</option>
          {allSports.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        {(search || sportFilter) && (
          <button
            onClick={() => { setSearch(""); setSportFilter(""); }}
            style={{
              fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontWeight: 700,
              letterSpacing: ".12em", textTransform: "uppercase",
              padding: "7px 12px", border: "1.5px solid #e2241a",
              background: "#fff", color: "#e2241a", cursor: "pointer",
            }}
          >
            CLEAR ×
          </button>
        )}
      </div>

      {/* Table */}
      <div style={{ overflowX: "visible" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", background: "#fff", border: "2px solid #15201a" }}>
          <thead>
            <tr style={{ background: "#15201a" }}>
              {["Username", "Sports", "Intent", "Joined", "Push", "Notify"].map((h) => (
                <th key={h} style={{
                  fontFamily: "'JetBrains Mono', monospace", fontSize: 10,
                  fontWeight: 700, letterSpacing: ".14em", textTransform: "uppercase",
                  color: "#fff", padding: "10px 14px", textAlign: "left", whiteSpace: "nowrap",
                }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: "32px", textAlign: "center", color: "#8a8a82", fontStyle: "italic", fontFamily: "'Space Grotesk', sans-serif" }}>
                  No users found.
                </td>
              </tr>
            ) : (
              filtered.map((u, i) => (
                <tr
                  key={u.user_id}
                  style={{ borderBottom: "1px solid #e5e7eb", background: i % 2 === 0 ? "#fff" : "#fafafa" }}
                >
                  <td style={{ padding: "10px 14px" }}>
                    <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 14, fontWeight: 700, color: "#15201a" }}>
                      {u.username ?? <span style={{ color: "#b0aca4", fontStyle: "italic" }}>—</span>}
                    </div>
                    {u.display_name && u.display_name !== u.username && (
                      <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 11, color: "#8a8a82" }}>
                        {u.display_name}
                      </div>
                    )}
                  </td>
                  <td style={{ padding: "10px 14px" }}>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                      {(u.favorite_sports ?? []).length === 0 ? (
                        <span style={{ color: "#b0aca4", fontSize: 12, fontStyle: "italic" }}>—</span>
                      ) : (
                        (u.favorite_sports ?? []).map((s) => (
                          <span key={s} style={{
                            fontFamily: "'JetBrains Mono', monospace", fontSize: 9, fontWeight: 700,
                            letterSpacing: ".1em", textTransform: "uppercase",
                            background: "#f5f1e8", border: "1px solid #d4cfc8",
                            color: "#15201a", padding: "2px 6px",
                          }}>
                            {s}
                          </span>
                        ))
                      )}
                    </div>
                  </td>
                  <td style={{ padding: "10px 14px", fontFamily: "'Space Grotesk', sans-serif", fontSize: 12, color: "#6b7280" }}>
                    {u.user_intent ? INTENT_LABELS[u.user_intent] ?? u.user_intent : <span style={{ color: "#b0aca4", fontStyle: "italic" }}>—</span>}
                  </td>
                  <td style={{ padding: "10px 14px", fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: "#8a8a82", whiteSpace: "nowrap" }}>
                    {new Date(u.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </td>
                  <td style={{ padding: "10px 14px", textAlign: "center" }}>
                    <span style={{
                      fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fontWeight: 700,
                      color: u.has_push ? "#0a7a3b" : "#b0aca4",
                    }}>
                      {u.has_push ? "✓" : "✗"}
                    </span>
                  </td>
                  <td style={{ padding: "10px 14px" }}>
                    <NotifDropdown userId={u.user_id} hasPush={u.has_push} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
