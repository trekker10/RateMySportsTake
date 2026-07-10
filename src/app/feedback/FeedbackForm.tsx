"use client";

import { useState, useRef } from "react";

const CATEGORIES = [
  { value: "analysts", label: "Analysts to add" },
  { value: "things",   label: "Things to add" },
  { value: "general",  label: "General feedback" },
  { value: "bug",      label: "Bug report" },
  { value: "grading",  label: "Grading / scoring dispute" },
];

// Design tokens
const INK      = "#15201a";
const INK_SOFT = "#3a4239";
const INK_FAINT = "#8a8a82";
const ACCENT   = "#e2241a";
const GOOD     = "#0a7a3b";

const inputBase: React.CSSProperties = {
  width: "100%",
  border: `2px solid ${INK}`,
  background: "#fff",
  padding: "15px 16px",
  fontFamily: "'Space Grotesk', system-ui, sans-serif",
  fontSize: 16,
  color: INK,
  outline: "none",
  borderRadius: 0,
  boxSizing: "border-box",
  transition: "box-shadow .12s ease, transform .12s ease",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontFamily: "'JetBrains Mono', monospace",
  fontWeight: 700,
  fontSize: 11,
  letterSpacing: ".16em",
  textTransform: "uppercase",
  color: INK_SOFT,
  marginBottom: 9,
};

export default function FeedbackForm() {
  const [category, setCategory]         = useState("");
  const [message, setMessage]           = useState("");
  const [email, setEmail]               = useState("");
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null);
  const [submitted, setSubmitted]       = useState(false);
  const [submitting, setSubmitting]     = useState(false);
  const [error, setError]               = useState<string | null>(null);

  // Focus lift state for each field
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleCategoryChange(val: string) {
    setCategory(val);
    if (val !== "bug") setScreenshotFile(null);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    setScreenshotFile(e.target.files?.[0] ?? null);
  }

  function removeFile() {
    setScreenshotFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function liftStyle(field: string): React.CSSProperties {
    return focusedField === field
      ? { boxShadow: `5px 5px 0 ${INK}`, transform: "translate(-1px,-1px)" }
      : {};
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!category || !message.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category,
          message,
          email: email || null,
          screenshot_name: screenshotFile?.name ?? null,
        }),
      });
      if (!res.ok) {
        const json = await res.json();
        setError(json.error ?? "Something went wrong. Please try again.");
        return;
      }
      setSubmitted(true);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  // ── Success view ────────────────────────────────────────────────────────────
  if (submitted) {
    return (
      <div style={{ textAlign: "center", padding: "20px 0 6px" }}>
        <div style={{
          width: 56, height: 56,
          border: `3px solid ${INK}`,
          borderRadius: "50%",
          margin: "0 auto 18px",
          display: "flex", alignItems: "center", justifyContent: "center",
          background: GOOD, color: "#fff",
          fontFamily: "'JetBrains Mono', monospace",
          fontWeight: 800, fontSize: 22,
        }}>
          ✓
        </div>
        <h3 style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 24, letterSpacing: "-.02em", margin: 0 }}>
          Thanks — got it.
        </h3>
        <p style={{ color: INK_SOFT, fontSize: 15, margin: "10px 0 0", lineHeight: 1.5 }}>
          Your feedback was submitted. If you left an email, we&apos;ll follow up if we need more detail.
        </p>
      </div>
    );
  }

  // ── Form view ───────────────────────────────────────────────────────────────
  return (
    <>
      <div>
        <h2 style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 34, letterSpacing: "-.03em", margin: 0 }}>
          Send feedback
        </h2>
        <p style={{ color: INK_SOFT, fontSize: 16, margin: "8px 0 0", lineHeight: 1.5 }}>
          Tell us what&apos;s working, what&apos;s missing, or what&apos;s broken. We read every submission.
        </p>
      </div>

      <form onSubmit={handleSubmit} noValidate style={{ marginTop: 30 }}>

        {/* Category */}
        <div style={{ marginBottom: 24 }}>
          <label htmlFor="category" style={labelStyle}>Category</label>
          <div style={{ position: "relative" }}>
            <select
              id="category"
              required
              value={category}
              onChange={(e) => handleCategoryChange(e.target.value)}
              onFocus={() => setFocusedField("category")}
              onBlur={() => setFocusedField(null)}
              style={{
                ...inputBase,
                appearance: "none",
                WebkitAppearance: "none",
                cursor: "pointer",
                paddingRight: 44,
                color: category ? INK : INK_FAINT,
                ...liftStyle("category"),
              }}
            >
              <option value="" disabled>Select a category</option>
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
            {/* Custom chevron */}
            <span style={{
              position: "absolute", right: 18, top: "50%",
              width: 9, height: 9,
              borderRight: `2px solid ${INK}`, borderBottom: `2px solid ${INK}`,
              transform: "translateY(-65%) rotate(45deg)",
              pointerEvents: "none",
            }} />
          </div>
        </div>

        {/* Message */}
        <div style={{ marginBottom: 24 }}>
          <label htmlFor="message" style={labelStyle}>Message</label>
          <textarea
            id="message"
            required
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onFocus={() => setFocusedField("message")}
            onBlur={() => setFocusedField(null)}
            placeholder="Give us the details..."
            rows={5}
            style={{
              ...inputBase,
              resize: "vertical",
              minHeight: 130,
              lineHeight: 1.5,
              ...liftStyle("message"),
            }}
          />
        </div>

        {/* Screenshot upload — only for bug reports */}
        {category === "bug" && (
          <div style={{ marginBottom: 24 }}>
            <label style={labelStyle}>
              Attach a screenshot{" "}
              <span style={{ color: INK_FAINT, fontWeight: 600 }}>· optional</span>
            </label>
            <label
              htmlFor="screenshot"
              style={{
                display: "flex", alignItems: "center", gap: 14,
                border: `2px dashed ${INK}`,
                background: "#fbfaf7",
                padding: "22px 18px",
                cursor: "pointer",
                transition: "background .12s ease, border-color .12s ease",
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "#fff"; (e.currentTarget as HTMLElement).style.borderColor = ACCENT; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "#fbfaf7"; (e.currentTarget as HTMLElement).style.borderColor = INK; }}
            >
              <span style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontWeight: 800, fontSize: 20, color: ACCENT,
                border: `2px solid ${INK}`,
                width: 40, height: 40, flexShrink: 0,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>+</span>
              <span style={{ flex: 1 }}>
                <span style={{ display: "block", fontWeight: 700, fontSize: 14 }}>Click to upload</span>
                <span style={{ display: "block", fontSize: 12.5, color: INK_FAINT, marginTop: 2, fontFamily: "'JetBrains Mono', monospace" }}>
                  PNG or JPG, up to 10MB
                </span>
              </span>
              <input
                ref={fileInputRef}
                type="file"
                id="screenshot"
                accept="image/png,image/jpeg"
                onChange={handleFileChange}
                style={{ display: "none" }}
              />
            </label>
            {screenshotFile && (
              <div style={{
                display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
                border: `2px solid ${INK}`,
                background: "#fff",
                padding: "10px 14px",
                marginTop: 10,
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 12.5,
              }}>
                <span>{screenshotFile.name}</span>
                <button
                  type="button"
                  onClick={removeFile}
                  aria-label="Remove file"
                  style={{
                    border: "none", background: "none",
                    fontWeight: 800, color: INK_FAINT, fontSize: 14,
                    lineHeight: 1, padding: "2px 4px", cursor: "pointer",
                  }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = ACCENT; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = INK_FAINT; }}
                >
                  ✕
                </button>
              </div>
            )}
          </div>
        )}

        {/* Email */}
        <div style={{ marginBottom: 24 }}>
          <label htmlFor="email" style={labelStyle}>
            Email{" "}
            <span style={{ color: INK_FAINT, fontWeight: 600 }}>· optional, for follow-up</span>
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onFocus={() => setFocusedField("email")}
            onBlur={() => setFocusedField(null)}
            placeholder="you@example.com"
            autoComplete="email"
            style={{ ...inputBase, ...liftStyle("email") }}
          />
        </div>

        {/* Error */}
        {error && (
          <div style={{ marginBottom: 16, padding: "12px 14px", border: `2px solid ${ACCENT}`, background: "#fff5f5", color: ACCENT, fontSize: 14, fontFamily: "'Space Grotesk', sans-serif" }}>
            {error}
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={submitting || !category || !message.trim()}
          style={{
            width: "100%",
            border: `3px solid ${INK}`,
            background: submitting || !category || !message.trim() ? "#6b7280" : INK,
            color: "#fff",
            fontFamily: "'Archivo Black', sans-serif",
            fontSize: 18,
            letterSpacing: ".02em",
            textTransform: "uppercase",
            padding: 18,
            marginTop: 8,
            cursor: submitting || !category || !message.trim() ? "default" : "pointer",
            boxShadow: "6px 6px 0 rgba(21,32,26,.28)",
            transition: "transform .1s ease, box-shadow .1s ease",
            borderRadius: 0,
          }}
          onMouseEnter={(e) => {
            if (submitting || !category || !message.trim()) return;
            const el = e.currentTarget as HTMLElement;
            el.style.transform = "translate(-3px,-3px)";
            el.style.boxShadow = `9px 9px 0 ${ACCENT}`;
          }}
          onMouseLeave={(e) => {
            const el = e.currentTarget as HTMLElement;
            el.style.transform = "";
            el.style.boxShadow = "6px 6px 0 rgba(21,32,26,.28)";
          }}
          onMouseDown={(e) => {
            const el = e.currentTarget as HTMLElement;
            el.style.transform = "translate(3px,3px)";
            el.style.boxShadow = "none";
          }}
          onMouseUp={(e) => {
            const el = e.currentTarget as HTMLElement;
            el.style.transform = "translate(-3px,-3px)";
            el.style.boxShadow = `9px 9px 0 ${ACCENT}`;
          }}
        >
          {submitting ? "Submitting…" : "Submit feedback"}
        </button>

        <p style={{ fontSize: 13, color: INK_SOFT, textAlign: "center", marginTop: 18 }}>
          Reporting something urgent?{" "}
          <a href="mailto:support@ratemysportstake.com" style={{ fontWeight: 700, color: INK, textDecoration: "none" }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = ACCENT; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = INK; }}
          >
            Contact support
          </a>{" "}instead.
        </p>
      </form>
    </>
  );
}
