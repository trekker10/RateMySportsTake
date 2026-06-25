"use client";

import { useState, useTransition } from "react";
import { updateGradingCriteria } from "@/app/actions/takes";

export default function EditableGradingCriteria({
  takeId,
  initial,
}: {
  takeId: string;
  initial: string;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(initial);
  const [saved, setSaved] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleSave() {
    startTransition(async () => {
      await updateGradingCriteria(takeId, value);
      setSaved(true);
      setEditing(false);
      setTimeout(() => setSaved(false), 3000);
    });
  }

  function handleCancel() {
    setValue(initial);
    setEditing(false);
  }

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <div />
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {saved && (
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: "0.12em", color: "#0a7a3b" }}>
              ✓ SAVED
            </span>
          )}
          {!editing && (
            <button
              onClick={() => setEditing(true)}
              style={{
                border: "1.5px solid #15201a", background: "#fff", padding: "5px 12px",
                fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: 10,
                letterSpacing: "0.1em", textTransform: "uppercase", cursor: "pointer",
              }}
            >
              EDIT
            </button>
          )}
        </div>
      </div>

      {editing ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <textarea
            value={value}
            onChange={e => setValue(e.target.value)}
            rows={4}
            autoFocus
            style={{
              width: "100%", border: "1.5px solid #15201a", padding: "10px 14px",
              fontFamily: "inherit", fontSize: 14, lineHeight: 1.6, color: "#15201a",
              resize: "vertical", outline: "none", background: "#fff", boxSizing: "border-box",
            }}
          />
          <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: "0.08em", color: "#8a8a82" }}>
            Be specific — describe exactly what outcome would make this TRUE.
          </p>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={handleSave}
              disabled={isPending || !value.trim()}
              style={{
                padding: "8px 18px", background: "#15201a", color: "#fff", border: "none",
                fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: 11,
                letterSpacing: "0.1em", textTransform: "uppercase", cursor: "pointer", opacity: isPending ? 0.6 : 1,
              }}
            >
              {isPending ? "SAVING…" : "SAVE"}
            </button>
            <button
              onClick={handleCancel}
              style={{
                padding: "8px 18px", background: "#fff", color: "#15201a",
                border: "1.5px solid #15201a", fontFamily: "'JetBrains Mono', monospace",
                fontWeight: 700, fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", cursor: "pointer",
              }}
            >
              CANCEL
            </button>
          </div>
        </div>
      ) : (
        <p style={{ fontSize: 15, lineHeight: 1.6, color: "#3a4239" }}>{value}</p>
      )}
    </div>
  );
}
