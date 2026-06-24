"use client";

import { useState } from "react";
import Link from "next/link";
import type { Take, Expert } from "@/types/database";
import ShareReceiptButton from "@/components/ShareReceiptButton";
import { expertUrl } from "@/lib/expert-url";

type TakeWithExpert = Take & {
  experts?: Pick<Expert, "name" | "expert_id" | "slug" | "outlet" | "avatar_url"> | null;
};

interface TakeCardProps {
  take: TakeWithExpert;
  showExpert?: boolean;
}

function verdictInfo(status: string): { label: string; bg: string; color: string; border?: string } {
  if (status === "confirmed_true")  return { label: "RIGHT ↗↗",    bg: "#15803d", color: "#fff" };
  if (status === "confirmed_false") return { label: "WRONG ↘↘",    bg: "#d23b2b", color: "#fff" };
  if (status === "partially_true")  return { label: "PARTLY RIGHT ↘", bg: "#d97706", color: "#fff" };
  if (status === "unresolvable")    return { label: "N/A",           bg: "#6b7280", color: "#fff" };
  return                                   { label: "PENDING",       bg: "transparent", color: "#6b7280", border: "1px solid #d1d5db" };
}

function gradeColor(grade: number | null): string {
  if (grade == null) return "#d1d5db";
  if (grade >= 93) return "#0a7a3b";
  if (grade >= 90) return "#15803d";
  if (grade >= 83) return "#16a34a";
  if (grade >= 80) return "#22c55e";
  if (grade >= 73) return "#ca8a04";
  if (grade >= 70) return "#d97706";
  if (grade >= 63) return "#f59e0b";
  if (grade >= 60) return "#ea580c";
  return "#d23b2b";
}

function gradeChipLetter(grade: number | null): string | null {
  if (grade == null) return null;
  if (grade >= 93) return "A";
  if (grade >= 90) return "A−";
  if (grade >= 83) return "B+";
  if (grade >= 80) return "B";
  if (grade >= 73) return "B−";
  if (grade >= 70) return "C+";
  if (grade >= 63) return "C";
  if (grade >= 60) return "C−";
  if (grade >= 50) return "D";
  return "F";
}

function cleanTakeText(raw: string): string {
  return raw
    .replace(/^RT @\w+:\s*/i, "")
    .replace(/\s*https?:\/\/t\.co\/\S+/g, "")
    .trim();
}

function initials(name: string) {
  return name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
}

export default function TakeCard({ take, showExpert = false }: TakeCardProps) {
  const [open, setOpen] = useState(false);

  const v          = verdictInfo(take.outcome_status);
  const chipLetter = gradeChipLetter(take.grade);
  const chipColor  = gradeColor(take.grade);
  const isPending  = take.outcome_status === "pending";
  const expert     = take.experts;
  const analysis   = (take as any).outcome_notes ?? (take as any).grade_notes;

  const rawDisplay  = take.raw_text?.trim() || take.summary?.trim() || "";
  const displayText = cleanTakeText(rawDisplay);
  const isParaphrase = !take.raw_text?.trim() && !!take.summary;

  const d   = new Date(take.date_made);
  const mo  = d.toLocaleDateString("en-US", { month: "short" }).toUpperCase();
  const day = d.getDate();

  const fmtDate = (iso: string) => {
    const dt = new Date(iso);
    return dt.toLocaleDateString("en-US", { month: "short", day: "numeric" }).toUpperCase();
  };
  const madeFmt = `${mo} ${day}`;
  const isResolved = take.outcome_status !== "pending";
  const resDate = take.time_horizon_date ? fmtDate(take.time_horizon_date) : "TBD";
  const trackSecondLabel = isResolved ? `RESOLVED ${resDate}` : `RESOLUTION DATE ${resDate}`;

  return (
    <>
      <style>{`
        .tfc-card {
          background: #ffffff;
          border: 1.5px solid #e2ddd4;
          border-radius: 8px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.06);
          overflow: hidden;
          padding: 22px 24px 20px;
          display: flex;
          flex-direction: column;
          transition: transform .12s ease, box-shadow .12s ease;
        }
        .tfc-card:hover { transform: translate(-3px,-3px); box-shadow: 7px 7px 0 #15201a; }
        .tfc-card.open  { transform: translate(-3px,-3px); box-shadow: 7px 7px 0 #15201a; }

        /* analyst header */
        .tfc-expert {
          display: flex; align-items: center; gap: 10px;
          margin-bottom: 16px; padding-bottom: 14px;
          border-bottom: 1px solid #e5e7eb;
        }
        .tfc-avatar {
          width: 38px; height: 38px; border-radius: 50%;
          background: #e5e7eb; display: flex; align-items: center;
          justify-content: center; font-size: 12px; font-weight: 700;
          color: #4b5563; flex-shrink: 0; overflow: hidden;
        }
        .tfc-expert-name {
          font-family: 'Archivo Black', sans-serif;
          font-size: 13px; text-transform: uppercase;
          letter-spacing: -0.01em; color: #15201a;
          text-decoration: none;
        }
        .tfc-expert-name:hover { text-decoration: underline; }
        .tfc-expert-meta {
          font-family: 'JetBrains Mono', monospace;
          font-size: 9px; letter-spacing: 0.12em;
          text-transform: uppercase; color: #9ca3af;
          margin-top: 1px;
        }
        .tfc-track {
          display: flex; align-items: center; gap: 7px; margin-top: 3px;
          font-family: 'JetBrains Mono', monospace; font-size: 9px; letter-spacing: 0.08em;
          text-transform: uppercase; flex-wrap: wrap;
        }
        .tfc-track-made { color: #8a8a82; }
        .tfc-track-arrow { color: #8a8a82; }
        .tfc-track-resolved { color: #0a7a3b; font-weight: 700; }
        .tfc-track-pending  { color: #8a8a82; font-weight: 600; }

        /* top row: date + grade + verdict */
        .tfc-top {
          display: flex; align-items: flex-start;
          justify-content: space-between; gap: 12px;
          margin-bottom: 16px;
        }
        .tfc-meta { display: flex; align-items: center; gap: 12px; }

        /* stacked date */
        .tfc-date { display: flex; flex-direction: column; align-items: center; line-height: 1; }
        .tfc-mo {
          font-family: 'JetBrains Mono', monospace;
          font-size: 11px; letter-spacing: 0.12em;
          text-transform: uppercase; color: #8b9088;
        }
        .tfc-day {
          font-family: 'Archivo Black', sans-serif;
          font-size: 48px; font-weight: 900; color: #161a17; line-height: 1;
        }

        /* grade chip */
        .tfc-chip {
          display: flex; flex-direction: column; align-items: center;
          border: 2px solid currentColor; border-radius: 4px;
          padding: 4px 8px; min-width: 48px; text-align: center;
          line-height: 1;
        }
        .tfc-chip b {
          font-family: 'Archivo Black', sans-serif;
          font-size: 18px; font-weight: 700; line-height: 1.1;
        }
        .tfc-chip small {
          font-family: 'JetBrains Mono', monospace;
          font-size: 9px; letter-spacing: 0.14em;
          text-transform: uppercase; margin-top: 2px; color: #9ca3af;
        }

        /* verdict */
        .tfc-verdict-wrap { display: flex; flex-direction: column; align-items: flex-end; gap: 4px; }
        .tfc-verdict {
          font-family: 'JetBrains Mono', monospace;
          font-size: 10px; letter-spacing: 0.14em; font-weight: 700;
          text-transform: uppercase; padding: 6px 12px;
          border-radius: 4px; white-space: nowrap;
        }

        /* quote block */
        .tfc-quote {
          background: #f5f0e6; border-radius: 6px;
          padding: 16px; font-style: italic; font-size: 15px;
          line-height: 1.55; color: #15201a; margin-bottom: 12px;
        }
        .tfc-quote-text {
          display: -webkit-box; -webkit-box-orient: vertical;
          -webkit-line-clamp: 3; overflow: hidden;
        }
        .tfc-paraphrase {
          font-family: 'JetBrains Mono', monospace;
          font-size: 9px; letter-spacing: 0.1em;
          text-transform: uppercase; color: #9ca3af;
          margin-bottom: 6px; font-style: normal;
        }

        /* what happened */
        .tfc-disclose { margin-bottom: 14px; border: 1.5px solid #161a17; border-radius: 0; overflow: hidden; }
        .tfc-toggle {
          width: 100%; display: flex; align-items: center;
          justify-content: space-between; padding: 12px 16px;
          font-family: 'JetBrains Mono', monospace; font-size: 11px;
          letter-spacing: 0.16em; text-transform: uppercase; font-weight: 700;
          color: #161a17; background: #ffffff; border: none; cursor: pointer;
          transition: background .1s;
        }
        .tfc-toggle:hover { background: rgba(0,0,0,0.03); }
        .tfc-toggle.open { background: #15201a; color: #fff; }
        .tfc-chev { transition: transform .2s; display: inline-block; color: #161a17; }
        .tfc-toggle.open .tfc-chev { color: #fff; }
        .tfc-chev.flipped { transform: rotate(180deg); }
        .tfc-panel { padding: 14px 16px; font-size: 14px; line-height: 1.6; color: #3a4239; }

        /* buttons */
        .tfc-actions { display: flex; gap: 8px; }
        .tfc-btn {
          flex: 1; padding: 10px 0; text-align: center;
          font-family: 'JetBrains Mono', monospace; font-size: 11px;
          letter-spacing: 0.16em; text-transform: uppercase; font-weight: 700;
          border-radius: 0; border: none; cursor: pointer;
          text-decoration: none; display: block;
          transition: opacity .15s;
        }
        .tfc-btn:hover { opacity: 0.85; }
        .tfc-btn-ctx   { background: #161a17; color: #ffffff; }
        .tfc-btn-share { background: #cf2c20; color: #ffffff; }
      `}</style>

      <article className={`tfc-card${open ? " open" : ""}`}>

        {/* ── Analyst header (only in feed view) ── */}
        {showExpert && expert && (
          <div className="tfc-expert">
            <div className="tfc-avatar">
              {expert.avatar_url
                ? <img src={expert.avatar_url} alt={expert.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                : initials(expert.name)}
            </div>
            <div>
              <Link href={expertUrl(expert)} className="tfc-expert-name">{expert.name}</Link>
              {expert.outlet && <p className="tfc-expert-meta">{expert.outlet}</p>}
              <div className="tfc-track">
                <span className="tfc-track-made">TAKE MADE {madeFmt}</span>
                <span className="tfc-track-arrow">→</span>
                <span className={isResolved ? "tfc-track-resolved" : "tfc-track-pending"}>
                  {trackSecondLabel}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* ── Top row: date + grade chip + verdict ── */}
        <div className="tfc-top">
          <div className="tfc-meta">
            <div className="tfc-date">
              <span className="tfc-mo">{mo}</span>
              <span className="tfc-day">{day}</span>
            </div>
            <div className="tfc-chip" style={{ color: chipLetter ? chipColor : "#8b9088", borderColor: chipLetter ? chipColor : "#d1d5db" }}>
              <b>{chipLetter ?? "—"}</b>
              <small>GRADE</small>
            </div>
          </div>
          <div className="tfc-verdict-wrap">
            <span
              className="tfc-verdict"
              style={{ backgroundColor: v.bg, color: v.color, border: v.border ?? "none" }}
            >
              {v.label}
            </span>
          </div>
        </div>

        {/* ── Quote ── */}
        <div className="tfc-quote">
          {isParaphrase && <p className="tfc-paraphrase">[Paraphrase]</p>}
          <p className="tfc-quote-text">&ldquo;{displayText}&rdquo;</p>
        </div>

        {/* ── What Happened toggle ── */}
        <div className="tfc-disclose">
          <button
            className={`tfc-toggle${open ? " open" : ""}`}
            aria-expanded={open}
            onClick={() => setOpen((o) => !o)}
          >
            <span>{isPending ? "AWAITING RESULT" : "WHAT HAPPENED"}</span>
            <span className={`tfc-chev${open ? " flipped" : ""}`}>▼</span>
          </button>
          {open && (
            <div className="tfc-panel">
              {isPending
                ? "Not graded yet — this take gets a grade once the result is decided."
                : (analysis ?? "No analysis recorded yet.")}
            </div>
          )}
        </div>

        {/* ── Actions ── */}
        <div className="tfc-actions">
          <Link href={`/takes/${take.take_id}`} className="tfc-btn tfc-btn-ctx">
            SEE FULL CONTEXT
          </Link>
          <ShareReceiptButton takeId={take.take_id} className="tfc-btn tfc-btn-share">
            SHARE RECEIPT
          </ShareReceiptButton>
        </div>

      </article>
    </>
  );
}
