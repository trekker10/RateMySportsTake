"use client";

import { useState } from "react";
import { saveNotificationPreferences } from "./actions";
import { subscribeUserToPush } from "@/lib/push";
import { createClient } from "@/lib/supabase/client";

const PREFS = [
  {
    key: "official" as const,
    title: "RateMySportsTake Official",
    sub: "Site updates, new features, and announcements from us.",
    icon: "📣",
  },
  {
    key: "analyst_updates" as const,
    title: "Followed Analyst Updates",
    sub: "Get notified when analysts you follow have new takes posted.",
    icon: "🔔",
  },
  {
    key: "take_updates" as const,
    title: "Followed Take Updates",
    sub: "Get notified when takes you've saved are graded.",
    icon: "⚖️",
  },
];

interface Props {
  userId: string;
  isSubscribed: boolean;
  prefs: { official: boolean; analyst_updates: boolean; take_updates: boolean };
}

export default function NotificationPreferences({ userId, isSubscribed, prefs: initialPrefs }: Props) {
  const [subscribed, setSubscribed] = useState(isSubscribed);
  const [subscribing, setSubscribing] = useState(false);
  const [prefs, setPrefs] = useState(initialPrefs);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [permDenied, setPermDenied] = useState(false);

  async function handleEnablePush() {
    setSubscribing(true);
    try {
      const supabase = createClient();
      const result = await subscribeUserToPush(userId, supabase);
      if (result.ok) {
        setSubscribed(true);
        // Default all prefs to true on first subscribe
        setPrefs({ official: true, analyst_updates: true, take_updates: true });
      } else {
        setPermDenied(true);
      }
    } catch {
      setPermDenied(true);
    } finally {
      setSubscribing(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    await saveNotificationPreferences(prefs);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  function toggle(key: keyof typeof prefs) {
    setPrefs((p) => ({ ...p, [key]: !p[key] }));
    setSaved(false);
  }

  return (
    <>
      <style>{`
        .np-card { background: #fff; border: 3px solid #15201a; box-shadow: 8px 8px 0 #15201a; max-width: 540px; padding: 36px 40px; box-sizing: border-box; }
        .np-toggle { position: relative; width: 48px; height: 26px; flex-shrink: 0; }
        .np-toggle input { opacity: 0; width: 0; height: 0; position: absolute; }
        .np-track { position: absolute; inset: 0; border: 2px solid #15201a; background: #fff; cursor: pointer; transition: background .15s; }
        .np-toggle input:checked + .np-track { background: #15201a; }
        .np-thumb { position: absolute; top: 3px; left: 3px; width: 16px; height: 16px; background: #d1d5db; transition: transform .15s, background .15s; pointer-events: none; }
        .np-toggle input:checked ~ .np-thumb { transform: translateX(22px); background: #e2241a; }
        @media (max-width: 480px) { .np-card { padding: 24px 20px; box-shadow: 5px 5px 0 #15201a; } }
      `}</style>

      <div style={{ maxWidth: 600, padding: "0 0 60px" }}>
        {/* Back link */}
        <a href="/dashboard" style={{
          fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: ".14em",
          textTransform: "uppercase", color: "#8a8a82", fontWeight: 700,
          textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 6, marginBottom: 28,
        }}>
          ← Back to Dashboard
        </a>

        <h1 style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 28, color: "#15201a", letterSpacing: "-.02em", marginBottom: 6 }}>
          Manage Notifications
        </h1>
        <p style={{ fontStyle: "italic", fontSize: 15, color: "#8a8a82", marginBottom: 32 }}>
          Choose what you want to hear about — and what you don&apos;t.
        </p>

        <div className="np-card">
          {/* Push subscription gate */}
          {!subscribed ? (
            <div style={{ marginBottom: 32, paddingBottom: 32, borderBottom: "2px solid #e5e7eb" }}>
              <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 16, color: "#15201a", marginBottom: 6 }}>
                Enable push notifications
              </div>
              <p style={{ fontSize: 13, color: "#8a8a82", marginBottom: 16, lineHeight: 1.5 }}>
                Your browser needs permission to send you notifications. This is required for any of the options below.
              </p>
              {permDenied ? (
                <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: "#e2241a", fontWeight: 700, letterSpacing: ".08em" }}>
                  Permission denied — enable notifications in your browser settings and reload.
                </p>
              ) : (
                <button
                  onClick={handleEnablePush}
                  disabled={subscribing}
                  style={{
                    fontFamily: "'JetBrains Mono', monospace", fontWeight: 700,
                    fontSize: 11, letterSpacing: ".12em", textTransform: "uppercase",
                    padding: "10px 20px", border: "2px solid #15201a",
                    background: "#15201a", color: "#fff",
                    cursor: subscribing ? "not-allowed" : "pointer",
                    opacity: subscribing ? 0.6 : 1,
                    boxShadow: "3px 3px 0 rgba(21,32,26,.2)",
                  }}
                >
                  {subscribing ? "Requesting permission…" : "Enable push notifications"}
                </button>
              )}
            </div>
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 28, paddingBottom: 28, borderBottom: "2px solid #e5e7eb" }}>
              <span style={{ fontSize: 18 }}>✅</span>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontWeight: 700, letterSpacing: ".1em", color: "#0a7a3b" }}>
                PUSH NOTIFICATIONS ENABLED
              </span>
            </div>
          )}

          {/* Pref toggles */}
          <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
            {PREFS.map((p, i) => (
              <div
                key={p.key}
                style={{
                  display: "flex", alignItems: "center", gap: 16,
                  padding: "18px 0",
                  borderBottom: i < PREFS.length - 1 ? "1px solid #e5e7eb" : "none",
                  opacity: !subscribed ? 0.4 : 1,
                  pointerEvents: !subscribed ? "none" : "auto",
                }}
              >
                <span style={{ fontSize: 22, flexShrink: 0 }}>{p.icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 15, color: "#15201a" }}>
                    {p.title}
                  </div>
                  <div style={{ fontSize: 13, color: "#8a8a82", marginTop: 2 }}>{p.sub}</div>
                </div>
                <label className="np-toggle">
                  <input
                    type="checkbox"
                    checked={prefs[p.key]}
                    onChange={() => toggle(p.key)}
                  />
                  <span className="np-track" />
                  <span className="np-thumb" />
                </label>
              </div>
            ))}
          </div>

          {/* Save */}
          {subscribed && (
            <div style={{ marginTop: 28, display: "flex", alignItems: "center", gap: 14 }}>
              <button
                onClick={handleSave}
                disabled={saving}
                style={{
                  fontFamily: "'JetBrains Mono', monospace", fontWeight: 700,
                  fontSize: 11, letterSpacing: ".12em", textTransform: "uppercase",
                  padding: "12px 24px", border: "2px solid #15201a",
                  background: "#15201a", color: "#fff",
                  cursor: saving ? "not-allowed" : "pointer",
                  opacity: saving ? 0.6 : 1,
                  boxShadow: "4px 4px 0 rgba(21,32,26,.2)",
                }}
              >
                {saving ? "Saving…" : "Save preferences"}
              </button>
              {saved && (
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: "#0a7a3b", fontWeight: 700, letterSpacing: ".1em" }}>
                  SAVED ✓
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
