"use client";

import { useState } from "react";
import Link from "next/link";

interface FollowedAnalyst {
  expert_id: string;
  name: string;
  slug: string | null;
  avatar_url: string | null;
  upcoming30: number;
}

function initials(name: string) {
  return name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
}

function BellIcon({ on }: { on: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill={on ? "#fff" : "none"} stroke={on ? "#fff" : "#15201a"} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
      <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
    </svg>
  );
}

export default function WhoYouFollow({ analysts }: { analysts: FollowedAnalyst[] }) {
  // TODO: wire notify state to a real subscriptions table when ready
  const [notifyState, setNotifyState] = useState<Record<string, boolean>>(
    Object.fromEntries(analysts.map((a) => [a.expert_id, true]))
  );

  function toggleNotify(id: string) {
    setNotifyState((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  return (
    <div style={{ background: "#fff", border: "2px solid #15201a" }}>
      {/* Header */}
      <div style={{ background: "#f5f1e8", borderBottom: "2px solid #15201a", padding: "14px 18px", display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: 12, letterSpacing: ".18em", textTransform: "uppercase", color: "#15201a" }}>
          WHO YOU FOLLOW
        </span>
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: "#8a8a82", letterSpacing: ".1em" }}>
          {analysts.length}
        </span>
      </div>

      {/* Analyst rows */}
      <div>
        {analysts.length === 0 && (
          <p style={{ padding: "20px 18px", fontStyle: "italic", fontSize: 13, color: "#8a8a82" }}>
            You aren&apos;t following anyone yet.{" "}
            <Link href="/experts" style={{ color: "#e2241a" }}>Browse analysts →</Link>
          </p>
        )}
        {analysts.map((a, i) => {
          const on = notifyState[a.expert_id] ?? true;
          const href = a.slug ? `/experts/${a.slug}` : `/experts/${a.expert_id}`;
          return (
            <div
              key={a.expert_id}
              style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "11px 18px",
                borderBottom: i < analysts.length - 1 ? "1px solid #f0ede7" : "none",
              }}
            >
              {/* Avatar */}
              <Link href={href} style={{ flexShrink: 0, textDecoration: "none" }}>
                <div style={{
                  width: 36, height: 36, borderRadius: "50%",
                  background: "#d9dce1", overflow: "hidden",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 11, fontWeight: 700, color: "#3a4239",
                }}>
                  {a.avatar_url
                    ? <img src={a.avatar_url} alt={a.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    : initials(a.name)}
                </div>
              </Link>

              {/* Name + upcoming */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <Link href={href} style={{ textDecoration: "none" }}>
                  <span style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 12, textTransform: "uppercase", letterSpacing: "-.01em", color: "#15201a", display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {a.name}
                  </span>
                </Link>
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, letterSpacing: ".1em", color: a.upcoming30 > 0 ? "#8a8a82" : "#b0b0aa" }}>
                  {a.upcoming30 > 0
                    ? <><span style={{ color: "#e2241a", fontWeight: 700 }}>{a.upcoming30}</span> upcoming · next 30d</>
                    : "no takes · next 30d"}
                </span>
              </div>

              {/* Notify bell — placeholder */}
              <button
                onClick={() => toggleNotify(a.expert_id)}
                title={on ? "Notifications on (placeholder)" : "Notifications off (placeholder)"}
                style={{
                  width: 30, height: 30, border: "1.5px solid #15201a", borderRadius: 2,
                  background: on ? "#e2241a" : "#fff", cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                  transition: "background .15s",
                }}
              >
                <BellIcon on={on} />
              </button>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div style={{ borderTop: "2px solid #15201a", padding: "12px 18px" }}>
        <Link
          href="/experts"
          style={{
            display: "block", textAlign: "center",
            fontFamily: "'JetBrains Mono', monospace", fontWeight: 700,
            fontSize: 11, letterSpacing: ".16em", textTransform: "uppercase",
            padding: "10px", background: "#fff", color: "#15201a",
            border: "1.5px solid #15201a", textDecoration: "none",
          }}
        >
          MANAGE FOLLOWING
        </Link>
      </div>
    </div>
  );
}
