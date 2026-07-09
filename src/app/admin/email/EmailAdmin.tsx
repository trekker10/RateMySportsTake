"use client";

import { useState, useEffect } from "react";

// ── Types ─────────────────────────────────────────────────────────────────────

interface BodyJson {
  hero_image_url?: string;
  heading?: string;
  body?: string;
  cta_text?: string;
  cta_url?: string;
}

interface EmailTemplate {
  id: string;
  name: string;
  status: "active" | "paused" | "draft";
  category: "onboarding" | "trigger" | "scheduled" | "manual";
  subject: string;
  preview_text: string;
  from_name: string;
  default_segment: string;
  body_json: BodyJson;
  updated_at: string;
}

type Tab = "templates" | "scheduled" | "triggers" | "history";

const STATUS_LABELS: Record<string, string> = {
  active: "ACTIVE",
  paused: "PAUSED",
  draft: "DRAFT",
};

const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  active:  { bg: "#dcfce7", color: "#15803d" },
  paused:  { bg: "#fef9c3", color: "#a16207" },
  draft:   { bg: "#f3f4f6", color: "#6b7280" },
};

const CATEGORY_COLORS: Record<string, { bg: string; color: string }> = {
  onboarding: { bg: "#dbeafe", color: "#1d4ed8" },
  trigger:    { bg: "#fee2e2", color: "#b91c1c" },
  scheduled:  { bg: "#ede9fe", color: "#6d28d9" },
  manual:     { bg: "#f3f4f6", color: "#6b7280" },
};

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  const weeks = Math.floor(days / 7);
  const months = Math.floor(days / 30);
  if (mins < 2)    return "just now";
  if (mins < 60)   return `${mins}m ago`;
  if (hours < 24)  return `${hours}h ago`;
  if (days < 7)    return `${days}d ago`;
  if (weeks < 5)   return `${weeks}w ago`;
  return `${months}mo ago`;
}

// ── Live email preview pane ────────────────────────────────────────────────────

function EmailPreview({ template }: { template: EmailTemplate }) {
  const bj = template.body_json ?? {};
  return (
    <div style={{ fontFamily: "Arial, sans-serif", background: "#f3f4f6", padding: "24px 16px", minHeight: "100%" }}>
      <div style={{ maxWidth: 480, margin: "0 auto", background: "#fff", border: "2px solid #15201a" }}>
        {/* Header */}
        <div style={{ background: "#15201a", padding: "14px 22px" }}>
          <span style={{ fontFamily: "'Arial Black', Arial, sans-serif", fontWeight: 900, fontSize: 13, letterSpacing: "0.06em", color: "#fff" }}>
            RATE/MY/SPORTS/TAKE
          </span>
        </div>

        {/* Hero image */}
        {bj.hero_image_url ? (
          <img src={bj.hero_image_url} alt="" style={{ display: "block", width: "100%" }} />
        ) : (
          <div style={{ background: "#f0f0f0", borderBottom: "1px dashed #d1d5db", padding: "28px 0", textAlign: "center", color: "#9ca3af", fontSize: 12, letterSpacing: "0.08em", textTransform: "uppercase" as const }}>
            HERO IMAGE
          </div>
        )}

        {/* Body */}
        <div style={{ padding: "28px 28px 24px" }}>
          {bj.heading && (
            <h1 style={{ margin: "0 0 14px", fontFamily: "'Arial Black', Arial, sans-serif", fontWeight: 900, fontSize: 22, letterSpacing: "-0.02em", color: "#15201a", lineHeight: 1.2 }}>
              {bj.heading}
            </h1>
          )}
          {bj.body && (
            <p style={{ margin: "0 0 22px", fontSize: 14, lineHeight: 1.65, color: "#3a4239" }}>
              {bj.body}
            </p>
          )}
          {bj.cta_text && (
            <div>
              <a
                href={bj.cta_url ?? "#"}
                style={{
                  display: "inline-block",
                  background: "#e2241a", color: "#fff",
                  fontFamily: "'Arial Black', Arial, sans-serif",
                  fontWeight: 900, fontSize: 11,
                  letterSpacing: "0.12em", textTransform: "uppercase" as const,
                  padding: "12px 22px", textDecoration: "none",
                }}
              >
                {bj.cta_text}
              </a>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ borderTop: "1px solid #e5e7eb", padding: "14px 28px", textAlign: "center" as const }}>
          <p style={{ margin: 0, fontSize: 11, color: "#9ca3af" }}>
            © Rate/My/Sports/Take · <span style={{ color: "#9ca3af", textDecoration: "underline" }}>Unsubscribe</span>
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Settings panel ─────────────────────────────────────────────────────────────

interface SettingsPanelProps {
  template: EmailTemplate;
  onChange: (patch: Partial<EmailTemplate>) => void;
  onSave: () => Promise<void>;
  onTestSend: () => Promise<void>;
  saving: boolean;
  testing: boolean;
  testResult: { ok: boolean; msg: string } | null;
  dirty: boolean;
}

function SettingsPanel({ template, onChange, onSave, onTestSend, saving, testing, testResult, dirty }: SettingsPanelProps) {
  const inputStyle: React.CSSProperties = {
    width: "100%", boxSizing: "border-box",
    border: "1px solid #d1d5db", borderRadius: 6,
    padding: "8px 10px", fontSize: 13,
    fontFamily: "inherit", color: "#111827",
    outline: "none", background: "#fff",
  };
  const labelStyle: React.CSSProperties = {
    display: "block", fontSize: 10,
    fontWeight: 700, letterSpacing: "0.12em",
    textTransform: "uppercase", color: "#6b7280",
    marginBottom: 4,
  };

  return (
    <div style={{ borderLeft: "1px solid #e5e7eb", padding: "20px 20px", display: "flex", flexDirection: "column", gap: 16, overflowY: "auto" }}>
      <p style={{ margin: 0, fontSize: 10, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "#6b7280" }}>
        EMAIL SETTINGS
      </p>

      <div>
        <label style={labelStyle}>Status</label>
        <select
          value={template.status}
          onChange={(e) => onChange({ status: e.target.value as EmailTemplate["status"] })}
          style={{ ...inputStyle, cursor: "pointer" }}
        >
          <option value="active">Active</option>
          <option value="paused">Paused</option>
          <option value="draft">Draft</option>
        </select>
      </div>

      <div>
        <label style={labelStyle}>Subject Line</label>
        <input
          type="text"
          value={template.subject}
          onChange={(e) => onChange({ subject: e.target.value })}
          style={inputStyle}
          placeholder="e.g. Welcome to Rate/My/Sports/Take 🏈"
        />
      </div>

      <div>
        <label style={labelStyle}>Preview Text</label>
        <textarea
          value={template.preview_text}
          onChange={(e) => onChange({ preview_text: e.target.value })}
          rows={2}
          style={{ ...inputStyle, resize: "vertical" }}
          placeholder="Short preview shown in inbox…"
        />
      </div>

      <div>
        <label style={labelStyle}>From Name</label>
        <input
          type="text"
          value={template.from_name}
          onChange={(e) => onChange({ from_name: e.target.value })}
          style={inputStyle}
        />
      </div>

      <div>
        <label style={labelStyle}>Default Segment</label>
        <input
          type="text"
          value={template.default_segment}
          onChange={(e) => onChange({ default_segment: e.target.value })}
          style={inputStyle}
          placeholder="e.g. All new signups"
        />
      </div>

      {/* Test result feedback */}
      {testResult && (
        <div style={{
          padding: "10px 12px", borderRadius: 6, fontSize: 12,
          background: testResult.ok ? "#dcfce7" : "#fee2e2",
          color: testResult.ok ? "#15803d" : "#b91c1c",
          border: `1px solid ${testResult.ok ? "#86efac" : "#fca5a5"}`,
        }}>
          {testResult.msg}
        </div>
      )}

      <button
        onClick={onTestSend}
        disabled={testing}
        style={{
          width: "100%", padding: "11px", border: "none", borderRadius: 6,
          background: testing ? "#374151" : "#111827",
          color: "#fff", fontWeight: 700, fontSize: 12,
          letterSpacing: "0.06em", cursor: testing ? "default" : "pointer",
          opacity: testing ? 0.7 : 1,
        }}
      >
        {testing ? "SENDING…" : "SEND TEST EMAIL"}
      </button>

      <button
        onClick={onSave}
        disabled={saving || !dirty}
        style={{
          width: "100%", padding: "11px", border: "none", borderRadius: 6,
          background: dirty ? "#e2241a" : "#9ca3af",
          color: "#fff", fontWeight: 700, fontSize: 12,
          letterSpacing: "0.06em", cursor: dirty ? "pointer" : "default",
          opacity: saving ? 0.7 : 1,
        }}
      >
        {saving ? "SAVING…" : "SAVE TEMPLATE"}
      </button>
    </div>
  );
}

// ── Body editor ───────────────────────────────────────────────────────────────

function BodyEditor({ template, onChange }: { template: EmailTemplate; onChange: (patch: Partial<EmailTemplate>) => void }) {
  const bj = template.body_json ?? {};
  const patchBody = (patch: Partial<BodyJson>) => onChange({ body_json: { ...bj, ...patch } });

  const inputStyle: React.CSSProperties = {
    width: "100%", boxSizing: "border-box",
    border: "1px solid #e5e7eb", borderRadius: 6,
    padding: "8px 10px", fontSize: 13,
    fontFamily: "inherit", color: "#111827",
    outline: "none", background: "#fafafa",
  };
  const labelStyle: React.CSSProperties = {
    display: "block", fontSize: 10, fontWeight: 700,
    letterSpacing: "0.12em", textTransform: "uppercase",
    color: "#6b7280", marginBottom: 4,
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14, padding: "18px 20px", borderTop: "1px solid #e5e7eb", background: "#f9fafb" }}>
      <p style={{ margin: 0, fontSize: 10, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "#6b7280" }}>
        CONTENT EDITOR
      </p>

      <div>
        <label style={labelStyle}>Template Name</label>
        <input
          type="text"
          value={template.name}
          onChange={(e) => onChange({ name: e.target.value })}
          style={inputStyle}
        />
      </div>

      <div>
        <label style={labelStyle}>Hero Image URL <span style={{ fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>(optional)</span></label>
        <input
          type="url"
          value={bj.hero_image_url ?? ""}
          onChange={(e) => patchBody({ hero_image_url: e.target.value })}
          placeholder="https://…"
          style={inputStyle}
        />
      </div>

      <div>
        <label style={labelStyle}>Heading</label>
        <input
          type="text"
          value={bj.heading ?? ""}
          onChange={(e) => patchBody({ heading: e.target.value })}
          style={inputStyle}
        />
      </div>

      <div>
        <label style={labelStyle}>Body Text</label>
        <textarea
          value={bj.body ?? ""}
          onChange={(e) => patchBody({ body: e.target.value })}
          rows={4}
          style={{ ...inputStyle, resize: "vertical" }}
        />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <div>
          <label style={labelStyle}>CTA Button Text</label>
          <input
            type="text"
            value={bj.cta_text ?? ""}
            onChange={(e) => patchBody({ cta_text: e.target.value })}
            style={inputStyle}
          />
        </div>
        <div>
          <label style={labelStyle}>CTA URL</label>
          <input
            type="url"
            value={bj.cta_url ?? ""}
            onChange={(e) => patchBody({ cta_url: e.target.value })}
            placeholder="https://…"
            style={inputStyle}
          />
        </div>
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function EmailAdmin({ initialTemplates }: { initialTemplates: EmailTemplate[] }) {
  const [tab, setTab] = useState<Tab>("templates");
  const [templates, setTemplates] = useState<EmailTemplate[]>(initialTemplates);
  const [selectedId, setSelectedId] = useState<string | null>(initialTemplates[0]?.id ?? null);
  const [edits, setEdits] = useState<Partial<EmailTemplate>>({});
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; msg: string } | null>(null);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");

  const selected = selectedId ? templates.find((t) => t.id === selectedId) ?? null : null;
  const merged: EmailTemplate | null = selected ? { ...selected, ...edits } : null;
  const dirty = Object.keys(edits).length > 0;

  function select(id: string) {
    setSelectedId(id);
    setEdits({});
    setTestResult(null);
  }

  function patch(p: Partial<EmailTemplate>) {
    setEdits((prev) => ({ ...prev, ...p }));
    // If body_json patched, merge correctly
    if (p.body_json && selected) {
      setEdits((prev) => ({
        ...prev,
        body_json: { ...(selected.body_json ?? {}), ...(prev.body_json ?? {}), ...p.body_json },
      }));
    }
  }

  async function save() {
    if (!selected || !dirty) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/email/templates/${selected.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(edits),
      });
      if (res.ok) {
        const updated = await res.json();
        setTemplates((prev) => prev.map((t) => t.id === updated.id ? updated : t));
        setEdits({});
      }
    } finally {
      setSaving(false);
    }
  }

  async function sendTest() {
    if (!selected) return;
    setTesting(true);
    setTestResult(null);
    // Save first if dirty so the test reflects current state
    if (dirty) await save();
    try {
      const res = await fetch(`/api/admin/email/templates/${selected.id}/test`, { method: "POST" });
      const json = await res.json();
      if (res.ok) {
        setTestResult({ ok: true, msg: `✓ Test email sent to ${json.sentTo}` });
      } else {
        setTestResult({ ok: false, msg: `✗ ${json.error ?? "Send failed"}` });
      }
    } catch {
      setTestResult({ ok: false, msg: "✗ Network error" });
    } finally {
      setTesting(false);
      setTimeout(() => setTestResult(null), 6000);
    }
  }

  async function createTemplate() {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const res = await fetch("/api/admin/email/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newName.trim(),
          status: "draft",
          category: "manual",
          subject: "",
          preview_text: "",
          from_name: "RMST Team",
          default_segment: "",
          body_json: { hero_image_url: "", heading: "", body: "", cta_text: "VISIT SITE", cta_url: "https://ratemysportstake.com" },
        }),
      });
      if (res.ok) {
        const created = await res.json();
        setTemplates((prev) => [created, ...prev]);
        setSelectedId(created.id);
        setEdits({});
        setNewName("");
      }
    } finally {
      setCreating(false);
    }
  }

  const TABS: { key: Tab; label: string }[] = [
    { key: "templates",  label: "Templates"  },
    { key: "scheduled",  label: "Scheduled"  },
    { key: "triggers",   label: "Triggers"   },
    { key: "history",    label: "History"    },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 96px)", minHeight: 600 }}>

      {/* Page header */}
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ margin: "0 0 4px", fontSize: 28, fontWeight: 800, color: "#111827", letterSpacing: "-0.02em" }}>Email</h1>
        <p style={{ margin: 0, fontSize: 14, color: "#6b7280" }}>Build templates, schedule sends, and manage automated take-drop and grading emails.</p>
      </div>

      {/* Tab bar */}
      <div style={{ display: "flex", gap: 0, borderBottom: "2px solid #e5e7eb", marginBottom: 0 }}>
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              padding: "10px 18px", border: "none", background: "none", cursor: "pointer",
              fontSize: 13, fontWeight: tab === t.key ? 700 : 500,
              color: tab === t.key ? "#111827" : "#6b7280",
              borderBottom: tab === t.key ? "2px solid #111827" : "2px solid transparent",
              marginBottom: -2, transition: "color 0.15s",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── TEMPLATES TAB ── */}
      {tab === "templates" && (
        <div style={{ flex: 1, display: "grid", gridTemplateColumns: "270px 1fr 260px", overflow: "hidden", background: "#fff", border: "1px solid #e5e7eb", borderTop: "none" }}>

          {/* Left: template list */}
          <div style={{ borderRight: "1px solid #e5e7eb", overflowY: "auto", display: "flex", flexDirection: "column" }}>
            <div style={{ flex: 1 }}>
              {templates.map((t) => {
                const catColor  = CATEGORY_COLORS[t.category]  ?? CATEGORY_COLORS.manual;
                const isActive  = t.id === selectedId;
                return (
                  <button
                    key={t.id}
                    onClick={() => select(t.id)}
                    style={{
                      width: "100%", textAlign: "left", padding: "14px 16px",
                      border: "none", borderBottom: "1px solid #f3f4f6",
                      background: isActive ? "#f0fdf4" : "#fff",
                      cursor: "pointer",
                      borderLeft: isActive ? "3px solid #15803d" : "3px solid transparent",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                      <span style={{ fontWeight: 700, fontSize: 13, color: "#111827" }}>{t.name}</span>
                      <span style={{
                        fontSize: 9, fontWeight: 700, letterSpacing: "0.1em",
                        textTransform: "uppercase", padding: "2px 7px", borderRadius: 99,
                        background: catColor.bg, color: catColor.color,
                      }}>
                        {t.category.toUpperCase()}
                      </span>
                    </div>
                    <div style={{ fontSize: 11, color: "#9ca3af" }}>
                      Updated {timeAgo(t.updated_at)} · {t.status.charAt(0).toUpperCase() + t.status.slice(1)}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* + New template */}
            <div style={{ borderTop: "1px solid #e5e7eb", padding: "12px 14px" }}>
              {creating ? (
                <div style={{ display: "flex", gap: 8 }}>
                  <input
                    autoFocus
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") createTemplate(); if (e.key === "Escape") setCreating(false); }}
                    placeholder="Template name…"
                    style={{ flex: 1, border: "1px solid #d1d5db", borderRadius: 5, padding: "6px 10px", fontSize: 12 }}
                  />
                  <button
                    onClick={createTemplate}
                    style={{ padding: "6px 10px", background: "#111827", color: "#fff", border: "none", borderRadius: 5, fontSize: 12, fontWeight: 700, cursor: "pointer" }}
                  >
                    Add
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setCreating(true)}
                  style={{ width: "100%", padding: "8px", background: "none", border: "1.5px dashed #d1d5db", borderRadius: 6, color: "#6b7280", fontSize: 12, cursor: "pointer", fontWeight: 500 }}
                >
                  + New template
                </button>
              )}
            </div>
          </div>

          {/* Center: preview */}
          <div style={{ overflowY: "auto", background: "#f3f4f6" }}>
            {merged ? (
              <>
                <div style={{ padding: "12px 20px", background: "#fff", borderBottom: "1px solid #e5e7eb", display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#9ca3af" }}>EDITING</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: "#111827" }}>{merged.name}</span>
                  <span style={{
                    marginLeft: "auto", fontSize: 9, fontWeight: 700,
                    letterSpacing: "0.1em", textTransform: "uppercase",
                    padding: "2px 8px", borderRadius: 99,
                    background: STATUS_COLORS[merged.status]?.bg ?? "#f3f4f6",
                    color: STATUS_COLORS[merged.status]?.color ?? "#6b7280",
                  }}>
                    {STATUS_LABELS[merged.status] ?? merged.status}
                  </span>
                </div>
                <EmailPreview template={merged} />
                <BodyEditor template={merged} onChange={patch} />
              </>
            ) : (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "#9ca3af", fontSize: 14 }}>
                Select a template to preview
              </div>
            )}
          </div>

          {/* Right: settings */}
          {merged ? (
            <SettingsPanel
              template={merged}
              onChange={patch}
              onSave={save}
              onTestSend={sendTest}
              saving={saving}
              testing={testing}
              testResult={testResult}
              dirty={dirty}
            />
          ) : (
            <div style={{ borderLeft: "1px solid #e5e7eb" }} />
          )}
        </div>
      )}

      {/* ── STUB TABS ── */}
      {tab !== "templates" && (
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", background: "#fff", border: "1px solid #e5e7eb", borderTop: "none" }}>
          <div style={{ textAlign: "center", color: "#9ca3af" }}>
            <p style={{ margin: "0 0 6px", fontSize: 22 }}>🚧</p>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: "#374151" }}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)} — coming in a later phase
            </p>
            <p style={{ margin: "6px 0 0", fontSize: 13 }}>Phase 1 covers Templates. Scheduled, Triggers, and History are next.</p>
          </div>
        </div>
      )}

    </div>
  );
}
