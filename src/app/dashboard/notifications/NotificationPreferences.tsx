"use client";

import { useState, useEffect } from "react";
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

type PermState = "checking" | "unsupported" | "granted" | "denied" | "prompt";

export default function NotificationPreferences({ userId, isSubscribed, prefs: initialPrefs }: Props) {
  const [subscribed, setSubscribed] = useState(isSubscribed);
  const [subscribing, setSubscribing] = useState(false);
  const [prefs, setPrefs] = useState(initialPrefs);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [permState, setPermState] = useState<PermState>("checking");

  // Check current browser permission state on mount
  useEffect(() => {
    if (typeof window === "undefined") return;

    // iOS Safari requires PWA install for push — check for serviceWorker support
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      setPermState("unsupported");
      return;
    }

    const current = Notification.permission;
    if (current === "granted") {
      setPermState("granted");
      // If permission is already granted but not subscribed, auto-subscribe
      if (!isSubscribed) {
        doSubscribe();
      }
    } else if (current === "denied") {
      setPermState("denied");
    } else {
      setPermState("prompt");
    }
  }, []);

  async function doSubscribe() {
    setSubscribing(true);
    try {
      const supabase = createClient();
      const result = await subscribeUserToPush(userId, supabase);
      if (result.ok) {
        setSubscribed(true);
        setPermState("granted");
        setPrefs({ official: true, analyst_updates: true, take_updates: true });
        // Auto-save defaults
        await saveNotificationPreferences({ official: true, analyst_updates: true, take_updates: true });
      }
    } finally {
      setSubscribing(false);
    }
  }

  async function handleEnablePush() {
    setSubscribing(true);
    try {
      // Request permission first
      const permission = await Notification.requestPermission();
      if (permission === "granted") {
        setPermState("granted");
        await doSubscribe();
      } else {
        setPermState("denied");
      }
    } catch {
      setPermState("denied");
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

  function renderPushGate() {
    if (subscribed) {
      return (
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 28, paddingBottom: 28, borderBottom: "2px solid #e5e7eb" }}>
          <span style={{ fontSize: 18 }}>✅</span>
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontWeight: 700, letterSpacing: ".1em", color: "#0a7a3b" }}>
            PUSH NOTIFICATIONS ENABLED
          </span>
        </div>
      );
    }

    if (permState === "checking") return null;

    if (permState === "unsupported") {
      return (
        <div style={{ marginBottom: 28, paddingBottom: 28, borderBottom: "2px solid #e5e7eb" }}>
          <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 15, color: "#15201a", marginBottom: 8 }}>
            Enable push notifications
          </div>
          <p style={{ fontSize: 13, color: "#8a8a82", lineHeight: 1.5, marginBottom: 0 }}>
            On iPhone, add this site to your Home Screen first: tap the share icon → <strong>Add to Home Screen</strong>. Then open the app from your Home Screen and come back here.
          </p>
        </div>
      );
    }

    if (permState === "denied") {
      return (
        <div style={{ marginBottom: 28, paddingBottom: 28, borderBottom: "2px solid #e5e7eb" }}>
          <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 15, color: "#15201a", marginBottom: 8 }}>
            Notifications are blocked
          </div>
          <p style={{ fontSize: 13, color: "#8a8a82", lineHeight: 1.5, marginBottom: 12 }}>
            You've previously blocked notifications for this site. To enable them:
          </p>
          <ol style={{ fontSize: 13, color: "#6b7280", lineHeight: 1.8, paddingLeft: 18, marginBottom: 0 }}>
            <li><strong>iPhone:</strong> Settings → [your browser] → Notifications → Allow</li>
            <li><strong>Android/Chrome:</strong> tap the lock icon in the address bar → Notifications → Allow</li>
            <li>Then reload this page.</li>
          </ol>
        </div>
      );
    }

    // "prompt" state — show the enable button
    return (
      <div style={{ marginBottom: 28, paddingBottom: 28, borderBottom: "2px solid #e5e7eb" }}>
        <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 15, color: "#15201a", marginBottom: 6 }}>
          Enable push notifications
        </div>
        <p style={{ fontSize: 13, color: "#8a8a82", marginBottom: 16, lineHeight: 1.5 }}>
          Tap below — your browser will ask for permission, then you&apos;re all set.
        </p>
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
          {subscribing ? "Setting up…" : "Enable push notifications"}
        </button>
      </div>
    );
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
          {renderPushGate()}

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
                  <input type="checkbox" checked={prefs[p.key]} onChange={() => toggle(p.key)} />
                  <span className="np-track" />
                  <span className="np-thumb" />
                </label>
              </div>
            ))}
          </div>

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
