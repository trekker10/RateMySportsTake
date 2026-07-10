"use client";

import { useState, useEffect, useCallback, useRef } from "react";

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
  segment_type: SegmentType;
  segment_params: Record<string, string>;
  body_json: BodyJson;
  updated_at: string;
}

interface ExpertStub {
  id: string;
  name: string;
  slug: string | null;
}

interface SendLogRow {
  id: string;
  template_id: string | null;
  schedule_id: string | null;
  segment_type: string | null;
  segment_label: string | null;
  sent_at: string;
  recipient_count: number;
  status: "sent" | "failed" | "partial";
  error_message: string | null;
  email_templates: { name: string } | null;
}

interface EmailTrigger {
  id: string;
  event_type: string;
  label: string;
  description: string;
  template_id: string | null;
  is_enabled: boolean;
  updated_at: string;
  email_templates: { id: string; name: string } | null;
}

interface EmailSchedule {
  id: string;
  template_id: string;
  segment_type: SegmentType;
  segment_params: Record<string, string>;
  cadence: string;           // 'once' | 'weekly:monday' | etc.
  next_send_at: string;      // YYYY-MM-DD
  is_enabled: boolean;
  created_at: string;
  updated_at: string;
  email_templates: { name: string } | null;
}

type Tab = "templates" | "scheduled" | "triggers" | "history";

// ── Segment definitions ────────────────────────────────────────────────────────

type SegmentType = "all_active" | "new_signups" | "inactive_30" | "analyst_followers" | "saved_backed";

interface SegmentDef {
  type: SegmentType;
  label: string;
  description: string;
  needsExpert: boolean;
}

const SEGMENTS: SegmentDef[] = [
  { type: "all_active",         label: "All active users",              description: "Everyone with an account",                 needsExpert: false },
  { type: "new_signups",        label: "New signups",                   description: "Signed up in the last 7 days",             needsExpert: false },
  { type: "inactive_30",        label: "Inactive 30+ days",             description: "No activity in the past 30 days",          needsExpert: false },
  { type: "analyst_followers",  label: "Followers of analyst",          description: "Users following a specific analyst",       needsExpert: true  },
  { type: "saved_backed",       label: "Users who saved/backed a take", description: "Bookmarked or followed at least one take", needsExpert: false },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

// ── Schedule helpers ──────────────────────────────────────────────────────────

const DAY_NAMES = ["sunday","monday","tuesday","wednesday","thursday","friday","saturday"];

function cadenceLabel(cadence: string): string {
  if (cadence === "once") return "One-time";
  const [, day] = cadence.split(":");
  if (!day) return cadence;
  return `Weekly · ${day.charAt(0).toUpperCase() + day.slice(1)}`;
}

function fmtDate(iso: string): string {
  // iso is YYYY-MM-DD
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

const SEGMENT_LABELS_DISPLAY: Record<string, string> = {
  all_active:        "All active users",
  new_signups:       "New signups",
  inactive_30:       "Inactive 30+ days",
  analyst_followers: "Analyst followers",
  saved_backed:      "Saved/backed a take",
};

// ── Status labels / colors ────────────────────────────────────────────────────

const STATUS_LABELS: Record<string, string> = { active: "ACTIVE", paused: "PAUSED", draft: "DRAFT" };
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
  const mins   = Math.floor(diff / 60000);
  const hours  = Math.floor(diff / 3600000);
  const days   = Math.floor(diff / 86400000);
  const weeks  = Math.floor(days / 7);
  const months = Math.floor(days / 30);
  if (mins < 2)    return "just now";
  if (mins < 60)   return `${mins}m ago`;
  if (hours < 24)  return `${hours}h ago`;
  if (days < 7)    return `${days}d ago`;
  if (weeks < 5)   return `${weeks}w ago`;
  return `${months}mo ago`;
}

function fmtCount(n: number | null): string {
  if (n === null) return "…";
  return n.toLocaleString("en-US");
}

// ── Segment picker with live count ────────────────────────────────────────────

function SegmentPicker({
  segmentType,
  segmentParams,
  experts,
  onChange,
}: {
  segmentType: SegmentType;
  segmentParams: Record<string, string>;
  experts: ExpertStub[];
  onChange: (type: SegmentType, params: Record<string, string>) => void;
}) {
  const [count, setCount]       = useState<number | null>(null);
  const [loading, setLoading]   = useState(false);

  const fetchCount = useCallback(async (type: SegmentType, params: Record<string, string>) => {
    if (type === "analyst_followers" && !params.expert_id) {
      setCount(null);
      return;
    }
    setLoading(true);
    try {
      const qs = new URLSearchParams({ type });
      if (params.expert_id) qs.set("expert_id", params.expert_id);
      const res = await fetch(`/api/admin/email/segments/count?${qs}`);
      const json = await res.json();
      setCount(res.ok ? json.count : null);
    } catch {
      setCount(null);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch count whenever segment type or params change
  useEffect(() => {
    fetchCount(segmentType, segmentParams);
  }, [segmentType, segmentParams, fetchCount]);

  const def = SEGMENTS.find((s) => s.type === segmentType);
  const inputStyle: React.CSSProperties = {
    width: "100%", boxSizing: "border-box",
    border: "1px solid #d1d5db", borderRadius: 6,
    padding: "8px 10px", fontSize: 13, fontFamily: "inherit",
    color: "#111827", outline: "none", background: "#fff",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {/* Segment type dropdown */}
      <select
        value={segmentType}
        onChange={(e) => {
          const t = e.target.value as SegmentType;
          onChange(t, {});
        }}
        style={{ ...inputStyle, cursor: "pointer" }}
      >
        {SEGMENTS.map((s) => (
          <option key={s.type} value={s.type}>{s.label}</option>
        ))}
      </select>

      {/* Analyst sub-picker */}
      {def?.needsExpert && (
        <select
          value={segmentParams.expert_id ?? ""}
          onChange={(e) => onChange(segmentType, { expert_id: e.target.value })}
          style={{ ...inputStyle, cursor: "pointer", fontSize: 12 }}
        >
          <option value="">— Select analyst —</option>
          {experts.map((e) => (
            <option key={e.id} value={e.id}>{e.name}</option>
          ))}
        </select>
      )}

      {/* Live recipient count */}
      <div style={{
        display: "flex", alignItems: "center", gap: 6,
        padding: "7px 10px", borderRadius: 6,
        background: count !== null ? "#f0fdf4" : "#f9fafb",
        border: `1px solid ${count !== null ? "#86efac" : "#e5e7eb"}`,
        fontSize: 12,
      }}>
        <span style={{ fontSize: 14 }}>👥</span>
        {loading ? (
          <span style={{ color: "#9ca3af" }}>Counting…</span>
        ) : count !== null ? (
          <>
            <span style={{ fontWeight: 700, color: "#15803d" }}>{fmtCount(count)}</span>
            <span style={{ color: "#6b7280" }}>recipients</span>
          </>
        ) : (
          <span style={{ color: "#9ca3af" }}>
            {def?.needsExpert ? "Select an analyst to see count" : "Could not load count"}
          </span>
        )}
        <button
          onClick={() => fetchCount(segmentType, segmentParams)}
          title="Refresh count"
          style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", color: "#9ca3af", fontSize: 13, padding: 0 }}
        >
          ↺
        </button>
      </div>

      {def && (
        <p style={{ margin: 0, fontSize: 11, color: "#9ca3af", lineHeight: 1.4 }}>{def.description}</p>
      )}
    </div>
  );
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
                  display: "inline-block", background: "#e2241a", color: "#fff",
                  fontFamily: "'Arial Black', Arial, sans-serif", fontWeight: 900, fontSize: 11,
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
  experts: ExpertStub[];
  onChange: (patch: Partial<EmailTemplate>) => void;
  onSave: () => Promise<void>;
  onTestSend: () => Promise<void>;
  saving: boolean;
  testing: boolean;
  testResult: { ok: boolean; msg: string } | null;
  dirty: boolean;
}

function SettingsPanel({ template, experts, onChange, onSave, onTestSend, saving, testing, testResult, dirty }: SettingsPanelProps) {
  const inputStyle: React.CSSProperties = {
    width: "100%", boxSizing: "border-box",
    border: "1px solid #d1d5db", borderRadius: 6,
    padding: "8px 10px", fontSize: 13,
    fontFamily: "inherit", color: "#111827",
    outline: "none", background: "#fff",
  };
  const labelStyle: React.CSSProperties = {
    display: "block", fontSize: 10, fontWeight: 700,
    letterSpacing: "0.12em", textTransform: "uppercase",
    color: "#6b7280", marginBottom: 4,
  };

  return (
    <div style={{ borderLeft: "1px solid #e5e7eb", padding: "20px", display: "flex", flexDirection: "column", gap: 16, overflowY: "auto" }}>
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

      {/* Real segment picker */}
      <div>
        <label style={labelStyle}>Audience Segment</label>
        <SegmentPicker
          segmentType={template.segment_type ?? "all_active"}
          segmentParams={template.segment_params ?? {}}
          experts={experts}
          onChange={(type, params) => onChange({ segment_type: type, segment_params: params })}
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
        <input type="text" value={template.name} onChange={(e) => onChange({ name: e.target.value })} style={inputStyle} />
      </div>

      <div>
        <label style={labelStyle}>Hero Image URL <span style={{ fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>(optional)</span></label>
        <input type="url" value={bj.hero_image_url ?? ""} onChange={(e) => patchBody({ hero_image_url: e.target.value })} placeholder="https://…" style={inputStyle} />
      </div>

      <div>
        <label style={labelStyle}>Heading</label>
        <input type="text" value={bj.heading ?? ""} onChange={(e) => patchBody({ heading: e.target.value })} style={inputStyle} />
      </div>

      <div>
        <label style={labelStyle}>Body Text</label>
        <textarea value={bj.body ?? ""} onChange={(e) => patchBody({ body: e.target.value })} rows={4} style={{ ...inputStyle, resize: "vertical" }} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <div>
          <label style={labelStyle}>CTA Button Text</label>
          <input type="text" value={bj.cta_text ?? ""} onChange={(e) => patchBody({ cta_text: e.target.value })} style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>CTA URL</label>
          <input type="url" value={bj.cta_url ?? ""} onChange={(e) => patchBody({ cta_url: e.target.value })} placeholder="https://…" style={inputStyle} />
        </div>
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

const HISTORY_PAGE_SIZE = 25;

interface Props {
  initialTemplates: EmailTemplate[];
  experts: ExpertStub[];
  initialSchedules: EmailSchedule[];
  initialTriggers: EmailTrigger[];
  initialHistory: SendLogRow[];
  historyTotal: number;
}

export default function EmailAdmin({ initialTemplates, experts, initialSchedules, initialTriggers, initialHistory, historyTotal: initialHistoryTotal }: Props) {
  const [tab, setTab]             = useState<Tab>("templates");
  const [templates, setTemplates] = useState<EmailTemplate[]>(initialTemplates);
  const [selectedId, setSelectedId] = useState<string | null>(initialTemplates[0]?.id ?? null);
  const [edits, setEdits]         = useState<Partial<EmailTemplate>>({});
  const [saving, setSaving]       = useState(false);
  const [testing, setTesting]     = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; msg: string } | null>(null);
  const [creating, setCreating]   = useState(false);
  const [newName, setNewName]     = useState("");

  // ── Schedule state ──────────────────────────────────────────────────────────
  const [schedules, setSchedules]           = useState<EmailSchedule[]>(initialSchedules);
  const [showScheduleForm, setShowScheduleForm] = useState(false);
  const [schedFormTemplateId, setSchedFormTemplateId] = useState(initialTemplates[0]?.id ?? "");
  const [schedFormSegType, setSchedFormSegType]       = useState<SegmentType>("all_active");
  const [schedFormSegParams, setSchedFormSegParams]   = useState<Record<string, string>>({});
  const [schedFormCadence, setSchedFormCadence]       = useState("once");
  const [schedFormDate, setSchedFormDate]             = useState("");
  const [schedFormDay, setSchedFormDay]               = useState("monday");
  const [schedFormSaving, setSchedFormSaving]         = useState(false);
  const [triggeringId, setTriggeringId]               = useState<string | null>(null);
  const schedFormRef = useRef<HTMLDivElement>(null);

  // ── Trigger state ───────────────────────────────────────────────────────────
  const [triggers, setTriggers] = useState<EmailTrigger[]>(initialTriggers);

  // ── History state ────────────────────────────────────────────────────────────
  const [historyRows, setHistoryRows]   = useState<SendLogRow[]>(initialHistory);
  const [historyTotal, setHistoryTotal] = useState(initialHistoryTotal);
  const [historyPage, setHistoryPage]   = useState(0);
  const [historyLoading, setHistoryLoading] = useState(false);

  const selected = selectedId ? templates.find((t) => t.id === selectedId) ?? null : null;
  const merged: EmailTemplate | null = selected ? { ...selected, ...edits } : null;
  const dirty = Object.keys(edits).length > 0;

  function select(id: string) {
    setSelectedId(id);
    setEdits({});
    setTestResult(null);
  }

  function patch(p: Partial<EmailTemplate>) {
    if (p.body_json && selected) {
      setEdits((prev) => ({
        ...prev,
        ...p,
        body_json: { ...(selected.body_json ?? {}), ...(prev.body_json ?? {}), ...p.body_json },
      }));
    } else {
      setEdits((prev) => ({ ...prev, ...p }));
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
    if (dirty) await save();
    try {
      const res = await fetch(`/api/admin/email/templates/${selected.id}/test`, { method: "POST" });
      const json = await res.json();
      setTestResult(res.ok
        ? { ok: true,  msg: `✓ Test email sent to ${json.sentTo}` }
        : { ok: false, msg: `✗ ${json.error ?? "Send failed"}` }
      );
    } catch {
      setTestResult({ ok: false, msg: "✗ Network error" });
    } finally {
      setTesting(false);
      setTimeout(() => setTestResult(null), 6000);
    }
  }

  async function createTemplate() {
    if (!newName.trim()) return;
    setCreating(true); // reuse as "submitting" flag
    try {
      const res = await fetch("/api/admin/email/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newName.trim(), status: "draft", category: "manual",
          subject: "", preview_text: "", from_name: "RMST Team",
          default_segment: "", segment_type: "all_active", segment_params: {},
          body_json: { hero_image_url: "", heading: "", body: "", cta_text: "VISIT SITE", cta_url: "https://ratemysportstake.com" },
        }),
      });
      if (res.ok) {
        const created = await res.json();
        setTemplates((prev) => [created, ...prev]);
        setSelectedId(created.id);
        setEdits({});
        setNewName("");
        setCreating(false);
      }
    } catch {
      setCreating(false);
    }
  }

  // ── Schedule actions ────────────────────────────────────────────────────────

  async function createSchedule() {
    if (!schedFormTemplateId) return;
    const cadence = schedFormCadence === "once" ? "once" : `weekly:${schedFormDay}`;
    const next_send_at = schedFormCadence === "once" ? schedFormDate : schedFormDate || new Date().toISOString().split("T")[0];
    if (!next_send_at) return;
    setSchedFormSaving(true);
    try {
      const res = await fetch("/api/admin/email/schedules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          template_id:   schedFormTemplateId,
          segment_type:  schedFormSegType,
          segment_params: schedFormSegParams,
          cadence,
          next_send_at,
        }),
      });
      if (res.ok) {
        const created = await res.json();
        setSchedules((prev) => [...prev, created].sort((a, b) => a.next_send_at.localeCompare(b.next_send_at)));
        setShowScheduleForm(false);
        setSchedFormDate("");
        setSchedFormDay("monday");
        setSchedFormCadence("once");
        setSchedFormSegType("all_active");
        setSchedFormSegParams({});
      }
    } finally {
      setSchedFormSaving(false);
    }
  }

  async function toggleSchedule(id: string, enabled: boolean) {
    const res = await fetch(`/api/admin/email/schedules/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_enabled: enabled }),
    });
    if (res.ok) {
      const updated = await res.json();
      setSchedules((prev) => prev.map((s) => s.id === id ? updated : s));
    }
  }

  async function deleteSchedule(id: string) {
    if (!confirm("Delete this schedule?")) return;
    const res = await fetch(`/api/admin/email/schedules/${id}`, { method: "DELETE" });
    if (res.ok) setSchedules((prev) => prev.filter((s) => s.id !== id));
  }

  async function triggerCronNow() {
    setTriggeringId("cron");
    try {
      const res = await fetch("/api/cron/email", { method: "POST" });
      const json = await res.json();
      if (res.ok) {
        alert(`✓ Cron ran: ${json.fired} schedule(s) fired.`);
        // Refresh schedules list
        const r2 = await fetch("/api/admin/email/schedules");
        if (r2.ok) setSchedules(await r2.json());
      } else {
        alert(`✗ ${json.error ?? "Unknown error"}`);
      }
    } finally {
      setTriggeringId(null);
    }
  }

  // ── Trigger actions ─────────────────────────────────────────────────────────

  async function patchTrigger(id: string, patch: Partial<Pick<EmailTrigger, "template_id" | "is_enabled">>) {
    const res = await fetch(`/api/admin/email/triggers/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (res.ok) {
      const updated = await res.json();
      setTriggers((prev) => prev.map((t) => t.id === id ? updated : t));
    }
  }

  // ── History actions ──────────────────────────────────────────────────────────

  async function loadHistoryPage(page: number) {
    setHistoryLoading(true);
    try {
      const res = await fetch(`/api/admin/email/history?page=${page}`);
      if (res.ok) {
        const json = await res.json();
        setHistoryRows(json.rows);
        setHistoryTotal(json.total);
        setHistoryPage(page);
      }
    } finally {
      setHistoryLoading(false);
    }
  }

  const TABS: { key: Tab; label: string }[] = [
    { key: "templates", label: "Templates"  },
    { key: "scheduled", label: "Scheduled"  },
    { key: "triggers",  label: "Triggers"   },
    { key: "history",   label: "History"    },
  ];

  const [showNewInput, setShowNewInput] = useState(false);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 48px)", minHeight: 600 }}>

      {/* Page header */}
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ margin: "0 0 4px", fontSize: 28, fontWeight: 800, color: "#111827", letterSpacing: "-0.02em" }}>Email</h1>
        <p style={{ margin: 0, fontSize: 14, color: "#6b7280" }}>Build templates, schedule sends, and manage automated take-drop and grading emails.</p>
      </div>

      {/* Tab bar */}
      <div style={{ display: "flex", borderBottom: "2px solid #e5e7eb", marginBottom: 0 }}>
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
        <div style={{ flex: 1, display: "grid", gridTemplateColumns: "270px 1fr 280px", overflow: "hidden", background: "#fff", border: "1px solid #e5e7eb", borderTop: "none" }}>

          {/* Left: template list */}
          <div style={{ borderRight: "1px solid #e5e7eb", overflowY: "auto", display: "flex", flexDirection: "column" }}>
            <div style={{ flex: 1 }}>
              {templates.map((t) => {
                const catColor = CATEGORY_COLORS[t.category] ?? CATEGORY_COLORS.manual;
                const isActive = t.id === selectedId;
                return (
                  <button
                    key={t.id}
                    onClick={() => select(t.id)}
                    style={{
                      width: "100%", textAlign: "left", padding: "14px 16px",
                      border: "none", borderBottom: "1px solid #f3f4f6",
                      background: isActive ? "#f0fdf4" : "#fff", cursor: "pointer",
                      borderLeft: isActive ? "3px solid #15803d" : "3px solid transparent",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                      <span style={{ fontWeight: 700, fontSize: 13, color: "#111827" }}>{t.name}</span>
                      <span style={{
                        fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase",
                        padding: "2px 7px", borderRadius: 99,
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
              {showNewInput ? (
                <div style={{ display: "flex", gap: 8 }}>
                  <input
                    autoFocus
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") createTemplate(); if (e.key === "Escape") { setShowNewInput(false); setNewName(""); }}}
                    placeholder="Template name…"
                    style={{ flex: 1, border: "1px solid #d1d5db", borderRadius: 5, padding: "6px 10px", fontSize: 12 }}
                  />
                  <button
                    onClick={createTemplate}
                    disabled={creating}
                    style={{ padding: "6px 10px", background: "#111827", color: "#fff", border: "none", borderRadius: 5, fontSize: 12, fontWeight: 700, cursor: "pointer", opacity: creating ? 0.6 : 1 }}
                  >
                    Add
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowNewInput(true)}
                  style={{ width: "100%", padding: "8px", background: "none", border: "1.5px dashed #d1d5db", borderRadius: 6, color: "#6b7280", fontSize: 12, cursor: "pointer", fontWeight: 500 }}
                >
                  + New template
                </button>
              )}
            </div>
          </div>

          {/* Center: preview + body editor */}
          <div style={{ overflowY: "auto", background: "#f3f4f6" }}>
            {merged ? (
              <>
                <div style={{ padding: "12px 20px", background: "#fff", borderBottom: "1px solid #e5e7eb", display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#9ca3af" }}>EDITING</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: "#111827" }}>{merged.name}</span>
                  <span style={{
                    marginLeft: "auto", fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase",
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
              experts={experts}
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

      {/* ── SCHEDULED TAB ── */}
      {tab === "scheduled" && (
        <div style={{ flex: 1, overflowY: "auto", background: "#fff", border: "1px solid #e5e7eb", borderTop: "none" }}>
          {/* Header row */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: "1px solid #e5e7eb" }}>
            <div>
              <p style={{ margin: 0, fontSize: 13, color: "#6b7280" }}>
                Cron runs once daily at 1 PM UTC. Schedules due today or overdue will fire automatically.
              </p>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={triggerCronNow}
                disabled={triggeringId === "cron"}
                style={{
                  padding: "9px 14px", border: "1px solid #d1d5db", borderRadius: 6,
                  background: "#f9fafb", fontSize: 12, fontWeight: 700, color: "#374151",
                  cursor: triggeringId === "cron" ? "default" : "pointer",
                  letterSpacing: "0.06em", opacity: triggeringId === "cron" ? 0.6 : 1,
                }}
              >
                {triggeringId === "cron" ? "RUNNING…" : "▶ RUN NOW"}
              </button>
              <button
                onClick={() => { setShowScheduleForm(true); setTimeout(() => schedFormRef.current?.scrollIntoView({ behavior: "smooth" }), 50); }}
                style={{
                  padding: "9px 14px", border: "none", borderRadius: 6,
                  background: "#111827", fontSize: 12, fontWeight: 700, color: "#fff",
                  cursor: "pointer", letterSpacing: "0.06em",
                }}
              >
                + SCHEDULE A SEND
              </button>
            </div>
          </div>

          {/* Schedules table */}
          {schedules.length === 0 && !showScheduleForm ? (
            <div style={{ padding: "60px 20px", textAlign: "center", color: "#9ca3af" }}>
              <p style={{ margin: "0 0 8px", fontSize: 32 }}>📅</p>
              <p style={{ margin: "0 0 4px", fontSize: 14, fontWeight: 600, color: "#374151" }}>No scheduled sends yet</p>
              <p style={{ margin: 0, fontSize: 13 }}>Click "+ Schedule a send" to set up your first send.</p>
            </div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ background: "#f9fafb" }}>
                  {["Template", "Audience", "Cadence", "Next Send", "Status", ""].map((h) => (
                    <th key={h} style={{ padding: "10px 16px", textAlign: "left", fontWeight: 700, fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: "#6b7280", borderBottom: "1px solid #e5e7eb", whiteSpace: "nowrap" }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {schedules.map((s) => (
                  <tr key={s.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                    <td style={{ padding: "12px 16px", fontWeight: 600, color: "#111827" }}>
                      {s.email_templates?.name ?? "—"}
                    </td>
                    <td style={{ padding: "12px 16px", color: "#374151" }}>
                      {SEGMENT_LABELS_DISPLAY[s.segment_type] ?? s.segment_type}
                    </td>
                    <td style={{ padding: "12px 16px", color: "#374151" }}>
                      {cadenceLabel(s.cadence)}
                    </td>
                    <td style={{ padding: "12px 16px", color: s.is_enabled ? "#111827" : "#9ca3af", fontVariantNumeric: "tabular-nums" }}>
                      {fmtDate(s.next_send_at)}
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      {/* Toggle switch */}
                      <button
                        onClick={() => toggleSchedule(s.id, !s.is_enabled)}
                        title={s.is_enabled ? "Disable" : "Enable"}
                        style={{
                          width: 36, height: 20, borderRadius: 10, border: "none", cursor: "pointer",
                          background: s.is_enabled ? "#15803d" : "#d1d5db",
                          position: "relative", transition: "background 0.2s",
                          padding: 0, flexShrink: 0,
                        }}
                      >
                        <span style={{
                          position: "absolute", top: 2,
                          left: s.is_enabled ? 18 : 2,
                          width: 16, height: 16, borderRadius: "50%",
                          background: "#fff", transition: "left 0.2s",
                          display: "block",
                        }} />
                      </button>
                    </td>
                    <td style={{ padding: "12px 16px", textAlign: "right" }}>
                      <button
                        onClick={() => deleteSchedule(s.id)}
                        title="Delete"
                        style={{ background: "none", border: "none", cursor: "pointer", color: "#9ca3af", fontSize: 16, lineHeight: 1, padding: 0 }}
                      >
                        ×
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {/* + Schedule a send form */}
          {showScheduleForm && (
            <div
              ref={schedFormRef}
              style={{
                margin: 20, border: "1.5px solid #e5e7eb", borderRadius: 10,
                background: "#f9fafb", padding: 24,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "#111827", letterSpacing: "0.04em" }}>
                  NEW SCHEDULED SEND
                </p>
                <button onClick={() => setShowScheduleForm(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "#9ca3af", fontSize: 20, lineHeight: 1, padding: 0 }}>×</button>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                {/* Template picker */}
                <div style={{ gridColumn: "1 / -1" }}>
                  <label style={{ display: "block", fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#6b7280", marginBottom: 4 }}>
                    Template
                  </label>
                  <select
                    value={schedFormTemplateId}
                    onChange={(e) => setSchedFormTemplateId(e.target.value)}
                    style={{ width: "100%", boxSizing: "border-box", border: "1px solid #d1d5db", borderRadius: 6, padding: "8px 10px", fontSize: 13, fontFamily: "inherit", color: "#111827", outline: "none", background: "#fff", cursor: "pointer" }}
                  >
                    <option value="">— Select a template —</option>
                    {templates.map((t) => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>

                {/* Audience segment */}
                <div style={{ gridColumn: "1 / -1" }}>
                  <label style={{ display: "block", fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#6b7280", marginBottom: 4 }}>
                    Audience
                  </label>
                  <SegmentPicker
                    segmentType={schedFormSegType}
                    segmentParams={schedFormSegParams}
                    experts={experts}
                    onChange={(type, params) => { setSchedFormSegType(type); setSchedFormSegParams(params); }}
                  />
                </div>

                {/* Cadence */}
                <div>
                  <label style={{ display: "block", fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#6b7280", marginBottom: 4 }}>
                    Cadence
                  </label>
                  <select
                    value={schedFormCadence}
                    onChange={(e) => setSchedFormCadence(e.target.value)}
                    style={{ width: "100%", boxSizing: "border-box", border: "1px solid #d1d5db", borderRadius: 6, padding: "8px 10px", fontSize: 13, fontFamily: "inherit", color: "#111827", outline: "none", background: "#fff", cursor: "pointer" }}
                  >
                    <option value="once">One-time send</option>
                    <option value="weekly">Weekly (repeat)</option>
                  </select>
                </div>

                {/* Day picker (weekly) or date picker (once) */}
                {schedFormCadence === "weekly" ? (
                  <div>
                    <label style={{ display: "block", fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#6b7280", marginBottom: 4 }}>
                      Day of Week
                    </label>
                    <select
                      value={schedFormDay}
                      onChange={(e) => setSchedFormDay(e.target.value)}
                      style={{ width: "100%", boxSizing: "border-box", border: "1px solid #d1d5db", borderRadius: 6, padding: "8px 10px", fontSize: 13, fontFamily: "inherit", color: "#111827", outline: "none", background: "#fff", cursor: "pointer" }}
                    >
                      {DAY_NAMES.map((d) => (
                        <option key={d} value={d}>{d.charAt(0).toUpperCase() + d.slice(1)}</option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div>
                    <label style={{ display: "block", fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#6b7280", marginBottom: 4 }}>
                      Send Date
                    </label>
                    <input
                      type="date"
                      value={schedFormDate}
                      onChange={(e) => setSchedFormDate(e.target.value)}
                      min={new Date().toISOString().split("T")[0]}
                      style={{ width: "100%", boxSizing: "border-box", border: "1px solid #d1d5db", borderRadius: 6, padding: "8px 10px", fontSize: 13, fontFamily: "inherit", color: "#111827", outline: "none", background: "#fff" }}
                    />
                  </div>
                )}

                {/* For weekly, also ask for first send date */}
                {schedFormCadence === "weekly" && (
                  <div style={{ gridColumn: "1 / -1" }}>
                    <label style={{ display: "block", fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#6b7280", marginBottom: 4 }}>
                      First Send Date <span style={{ fontWeight: 400, textTransform: "none", letterSpacing: 0, fontSize: 11 }}>(leave blank to auto-pick next {schedFormDay})</span>
                    </label>
                    <input
                      type="date"
                      value={schedFormDate}
                      onChange={(e) => setSchedFormDate(e.target.value)}
                      min={new Date().toISOString().split("T")[0]}
                      style={{ width: "100%", boxSizing: "border-box", border: "1px solid #d1d5db", borderRadius: 6, padding: "8px 10px", fontSize: 13, fontFamily: "inherit", color: "#111827", outline: "none", background: "#fff" }}
                    />
                  </div>
                )}
              </div>

              <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
                <button
                  onClick={createSchedule}
                  disabled={schedFormSaving || !schedFormTemplateId || (schedFormCadence === "once" && !schedFormDate)}
                  style={{
                    padding: "10px 20px", border: "none", borderRadius: 6,
                    background: schedFormSaving || !schedFormTemplateId || (schedFormCadence === "once" && !schedFormDate) ? "#9ca3af" : "#e2241a",
                    color: "#fff", fontWeight: 700, fontSize: 12, letterSpacing: "0.08em",
                    cursor: schedFormSaving ? "default" : "pointer",
                  }}
                >
                  {schedFormSaving ? "SAVING…" : "SCHEDULE SEND"}
                </button>
                <button
                  onClick={() => setShowScheduleForm(false)}
                  style={{ padding: "10px 16px", border: "1px solid #d1d5db", borderRadius: 6, background: "#fff", fontSize: 12, fontWeight: 600, color: "#374151", cursor: "pointer" }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── TRIGGERS TAB ── */}
      {tab === "triggers" && (
        <div style={{ flex: 1, overflowY: "auto", background: "#fff", border: "1px solid #e5e7eb", borderTop: "none" }}>
          {/* Header */}
          <div style={{ padding: "16px 20px", borderBottom: "1px solid #e5e7eb" }}>
            <p style={{ margin: 0, fontSize: 13, color: "#6b7280" }}>
              Trigger emails fire automatically when an event happens. Assign a template and toggle to enable.
            </p>
          </div>

          {/* Trigger rows */}
          <div style={{ display: "flex", flexDirection: "column" }}>
            {triggers.length === 0 ? (
              <div style={{ padding: "60px 20px", textAlign: "center", color: "#9ca3af" }}>
                <p style={{ margin: "0 0 4px", fontSize: 14, fontWeight: 600, color: "#374151" }}>Run the Phase 4 migration to seed trigger rows</p>
              </div>
            ) : triggers.map((trigger, i) => {
              const audienceLabel = trigger.event_type === "new_take_drop"
                ? "Followers of the analyst"
                : "Users who saved/backed the take";

              return (
                <div
                  key={trigger.id}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 220px 220px 80px",
                    alignItems: "center",
                    gap: 16,
                    padding: "20px 24px",
                    borderBottom: i < triggers.length - 1 ? "1px solid #f3f4f6" : "none",
                    background: trigger.is_enabled ? "#fafffe" : "#fff",
                  }}
                >
                  {/* Event info */}
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                      <span style={{
                        fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase",
                        padding: "2px 7px", borderRadius: 99,
                        background: trigger.event_type === "new_take_drop" ? "#dbeafe" : "#ede9fe",
                        color:      trigger.event_type === "new_take_drop" ? "#1d4ed8" : "#6d28d9",
                      }}>
                        {trigger.event_type === "new_take_drop" ? "TAKE POSTED" : "TAKE GRADED"}
                      </span>
                      {trigger.is_enabled && (
                        <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", padding: "2px 7px", borderRadius: 99, background: "#dcfce7", color: "#15803d" }}>
                          LIVE
                        </span>
                      )}
                    </div>
                    <p style={{ margin: "0 0 2px", fontWeight: 700, fontSize: 14, color: "#111827" }}>{trigger.label}</p>
                    <p style={{ margin: 0, fontSize: 12, color: "#6b7280" }}>{trigger.description}</p>
                  </div>

                  {/* Template picker */}
                  <div>
                    <label style={{ display: "block", fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#9ca3af", marginBottom: 5 }}>
                      Template
                    </label>
                    <select
                      value={trigger.template_id ?? ""}
                      onChange={(e) => patchTrigger(trigger.id, { template_id: e.target.value || null as unknown as string })}
                      style={{
                        width: "100%", boxSizing: "border-box",
                        border: "1px solid #d1d5db", borderRadius: 6,
                        padding: "8px 10px", fontSize: 13, fontFamily: "inherit",
                        color: trigger.template_id ? "#111827" : "#9ca3af",
                        outline: "none", background: "#fff", cursor: "pointer",
                      }}
                    >
                      <option value="">— None —</option>
                      {templates.map((t) => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Audience (fixed per event type) */}
                  <div>
                    <label style={{ display: "block", fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#9ca3af", marginBottom: 5 }}>
                      Audience
                    </label>
                    <div style={{
                      padding: "8px 10px", borderRadius: 6, fontSize: 13,
                      border: "1px solid #e5e7eb", background: "#f9fafb", color: "#374151",
                    }}>
                      {audienceLabel}
                    </div>
                  </div>

                  {/* On/Off toggle */}
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                    <label style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#9ca3af" }}>
                      {trigger.is_enabled ? "ON" : "OFF"}
                    </label>
                    <button
                      onClick={() => patchTrigger(trigger.id, { is_enabled: !trigger.is_enabled })}
                      disabled={!trigger.template_id && !trigger.is_enabled}
                      title={!trigger.template_id && !trigger.is_enabled ? "Assign a template first" : trigger.is_enabled ? "Disable" : "Enable"}
                      style={{
                        width: 44, height: 24, borderRadius: 12, border: "none",
                        cursor: (!trigger.template_id && !trigger.is_enabled) ? "not-allowed" : "pointer",
                        background: trigger.is_enabled ? "#15803d" : "#d1d5db",
                        position: "relative", transition: "background 0.2s",
                        padding: 0, opacity: (!trigger.template_id && !trigger.is_enabled) ? 0.4 : 1,
                      }}
                    >
                      <span style={{
                        position: "absolute", top: 3,
                        left: trigger.is_enabled ? 22 : 3,
                        width: 18, height: 18, borderRadius: "50%",
                        background: "#fff", transition: "left 0.2s",
                        display: "block",
                      }} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Info box */}
          <div style={{ margin: "20px 24px", padding: "14px 16px", borderRadius: 8, background: "#f0f9ff", border: "1px solid #bae6fd" }}>
            <p style={{ margin: "0 0 6px", fontSize: 12, fontWeight: 700, color: "#0369a1" }}>HOW TRIGGERS WORK</p>
            <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, color: "#0c4a6e", lineHeight: 1.7 }}>
              <li><strong>New Take Drop</strong> fires when an analyst submits a take via the admin form. Bulk imports do not fire this trigger.</li>
              <li><strong>Take Graded</strong> fires when the AI grader resolves a take's outcome. It sends to users who saved or backed that specific take.</li>
              <li>Triggers run in the background and do not block the admin action that fired them.</li>
              <li>All sends are logged in the History tab.</li>
            </ul>
          </div>
        </div>
      )}

      {/* ── HISTORY TAB ── */}
      {tab === "history" && (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", background: "#fff", border: "1px solid #e5e7eb", borderTop: "none", overflow: "hidden" }}>
          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 20px", borderBottom: "1px solid #e5e7eb", flexShrink: 0 }}>
            <p style={{ margin: 0, fontSize: 13, color: "#6b7280" }}>
              {historyTotal.toLocaleString()} total send{historyTotal !== 1 ? "s" : ""} logged
            </p>
            <button
              onClick={() => loadHistoryPage(0)}
              disabled={historyLoading}
              style={{ padding: "7px 12px", border: "1px solid #d1d5db", borderRadius: 6, background: "#f9fafb", fontSize: 12, fontWeight: 700, color: "#374151", cursor: historyLoading ? "default" : "pointer", letterSpacing: "0.06em", opacity: historyLoading ? 0.6 : 1 }}
            >
              {historyLoading ? "LOADING…" : "↺ REFRESH"}
            </button>
          </div>

          {/* Table */}
          <div style={{ flex: 1, overflowY: "auto" }}>
            {historyRows.length === 0 ? (
              <div style={{ padding: "60px 20px", textAlign: "center", color: "#9ca3af" }}>
                <p style={{ margin: "0 0 4px", fontSize: 32 }}>📭</p>
                <p style={{ margin: "0 0 4px", fontSize: 14, fontWeight: 600, color: "#374151" }}>No sends logged yet</p>
                <p style={{ margin: 0, fontSize: 13 }}>Send a test email or run the cron to see logs here.</p>
              </div>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead style={{ position: "sticky", top: 0, zIndex: 1 }}>
                  <tr style={{ background: "#f9fafb" }}>
                    {["Sent", "Template", "Segment", "Recipients", "Status"].map((h) => (
                      <th key={h} style={{ padding: "10px 16px", textAlign: "left", fontWeight: 700, fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: "#6b7280", borderBottom: "1px solid #e5e7eb", whiteSpace: "nowrap" }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {historyRows.map((row) => {
                    const statusColor =
                      row.status === "sent"    ? { bg: "#dcfce7", color: "#15803d" } :
                      row.status === "failed"  ? { bg: "#fee2e2", color: "#b91c1c" } :
                                                 { bg: "#fef9c3", color: "#a16207" };

                    const sentDate = new Date(row.sent_at);
                    const sentFmt  = sentDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
                    const sentTime = sentDate.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });

                    return (
                      <tr key={row.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                        <td style={{ padding: "12px 16px", whiteSpace: "nowrap" }}>
                          <div style={{ fontWeight: 600, color: "#111827", fontSize: 13 }}>{sentFmt}</div>
                          <div style={{ fontSize: 11, color: "#9ca3af" }}>{sentTime}</div>
                        </td>
                        <td style={{ padding: "12px 16px", color: "#374151", maxWidth: 200 }}>
                          <div style={{ fontWeight: 600, color: "#111827", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {row.email_templates?.name ?? <span style={{ color: "#9ca3af", fontStyle: "italic" }}>Deleted template</span>}
                          </div>
                        </td>
                        <td style={{ padding: "12px 16px", color: "#374151" }}>
                          {row.segment_label ?? row.segment_type ?? "—"}
                        </td>
                        <td style={{ padding: "12px 16px", color: "#374151", fontVariantNumeric: "tabular-nums", textAlign: "right" as const }}>
                          {row.recipient_count.toLocaleString()}
                        </td>
                        <td style={{ padding: "12px 16px" }}>
                          <div style={{ display: "inline-flex", flexDirection: "column", gap: 2 }}>
                            <span style={{
                              display: "inline-block", fontSize: 9, fontWeight: 700, letterSpacing: "0.1em",
                              textTransform: "uppercase", padding: "3px 8px", borderRadius: 99,
                              background: statusColor.bg, color: statusColor.color,
                            }}>
                              {row.status.toUpperCase()}
                            </span>
                            {row.error_message && (
                              <span style={{ fontSize: 10, color: "#b91c1c", maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={row.error_message}>
                                {row.error_message}
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* Pagination footer */}
          {historyTotal > HISTORY_PAGE_SIZE && (
            <div style={{ flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 20px", borderTop: "1px solid #e5e7eb", background: "#f9fafb" }}>
              <span style={{ fontSize: 12, color: "#6b7280" }}>
                {historyPage * HISTORY_PAGE_SIZE + 1}–{Math.min((historyPage + 1) * HISTORY_PAGE_SIZE, historyTotal)} of {historyTotal.toLocaleString()}
              </span>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  onClick={() => loadHistoryPage(historyPage - 1)}
                  disabled={historyPage === 0 || historyLoading}
                  style={{ padding: "6px 12px", border: "1px solid #d1d5db", borderRadius: 6, background: "#fff", fontSize: 12, fontWeight: 600, color: historyPage === 0 ? "#d1d5db" : "#374151", cursor: historyPage === 0 ? "default" : "pointer" }}
                >
                  ← Prev
                </button>
                <button
                  onClick={() => loadHistoryPage(historyPage + 1)}
                  disabled={(historyPage + 1) * HISTORY_PAGE_SIZE >= historyTotal || historyLoading}
                  style={{ padding: "6px 12px", border: "1px solid #d1d5db", borderRadius: 6, background: "#fff", fontSize: 12, fontWeight: 600, color: (historyPage + 1) * HISTORY_PAGE_SIZE >= historyTotal ? "#d1d5db" : "#374151", cursor: (historyPage + 1) * HISTORY_PAGE_SIZE >= historyTotal ? "default" : "pointer" }}
                >
                  Next →
                </button>
              </div>
            </div>
          )}
        </div>
      )}

    </div>
  );
}
