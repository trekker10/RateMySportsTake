"use client";
import { useState } from "react";
import Link from "next/link";

interface ReelCardProps {
  variant: "best" | "worst" | "recent";
  label: string;
  date: string;
  grade: string;
  verdictLabel: string;
  verdictBg: string;
  verdictColor: string;
  gradeColor: string;
  quote: string;
  footerLabel: string;
  footerBody: string;
  href: string;
}

export default function ReelCard({
  variant,
  label,
  date,
  grade,
  verdictLabel,
  verdictBg,
  verdictColor,
  gradeColor,
  quote,
  footerLabel,
  footerBody,
  href,
}: ReelCardProps) {
  const [open, setOpen] = useState(false);

  const tagBg = variant === "best" ? "#0a7a3b" : variant === "worst" ? "#e2241a" : "#15201a";

  return (
    <div className="reel-card" style={{ display: "flex", flexDirection: "column", background: "#fff", border: "2px solid #15201a" }}>
      {/* Tag bar — links to take */}
      <Link href={href} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 18px", borderBottom: "2px solid #15201a", backgroundColor: tagBg, color: "#fff", textDecoration: "none" }}>
        <span style={{ fontFamily: "'JetBrains Mono',monospace", fontWeight: 700, fontSize: 13, letterSpacing: ".18em" }}>{label}</span>
        <span style={{ fontFamily: "'JetBrains Mono',monospace", fontWeight: 500, fontSize: 11, letterSpacing: ".14em", opacity: .85 }}>{date}</span>
      </Link>

      {/* Body */}
      <div style={{ padding: "20px 22px", display: "flex", flexDirection: "column", flex: 1 }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 14, marginBottom: 12 }}>
          <span style={{ fontFamily: "'Archivo Black',sans-serif", fontSize: 56, lineHeight: .78, letterSpacing: "-.04em", color: gradeColor }}>{grade}</span>
          <span style={{ display: "inline-block", fontFamily: "'JetBrains Mono',monospace", fontWeight: 700, fontSize: 12, letterSpacing: ".1em", padding: "3px 8px", backgroundColor: verdictBg, color: verdictColor }}>
            {verdictLabel}
          </span>
        </div>
        <p style={{ fontStyle: "italic", fontSize: 17, lineHeight: 1.34, letterSpacing: "-.01em", flex: 1, color: "#15201a", marginTop: 14 }}>&ldquo;{quote}&rdquo;</p>

        {/* Accordion toggle */}
        <button
          onClick={() => setOpen(o => !o)}
          style={{
            marginTop: 18,
            paddingTop: 12,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            width: "100%",
            background: "none",
            border: "none",
            borderTop: "2px solid #dfe2e6",
            cursor: "pointer",
            fontFamily: "'JetBrains Mono',monospace",
            fontWeight: 700,
            fontSize: 11,
            letterSpacing: ".18em",
            color: "#8a8a82",
            textAlign: "left",
            paddingLeft: 0,
            paddingRight: 0,
          }}
          aria-expanded={open}
        >
          <span>{footerLabel}</span>
          <span style={{ display: "inline-block", transition: "transform .2s ease", transform: open ? "rotate(180deg)" : "rotate(0deg)", fontSize: 10 }}>▼</span>
        </button>

        {/* Collapsible content */}
        <div style={{
          overflow: "hidden",
          maxHeight: open ? 300 : 0,
          transition: "max-height .28s ease",
          fontSize: 14,
          lineHeight: 1.5,
          color: "#3a4239",
        }}>
          <p style={{ paddingTop: 10 }}>{footerBody}</p>
        </div>
      </div>
    </div>
  );
}
