"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import type { Take, Expert } from "@/types/database";
import ShareReceiptButton from "@/components/ShareReceiptButton";
import { expertUrl } from "@/lib/expert-url";
import { followTake, unfollowTake } from "@/app/actions/takeFollows";

type TakeWithExpert = Take & {
  experts?: Pick<Expert, "name" | "expert_id" | "slug" | "outlet" | "avatar_url"> | null;
};

interface TakeCardProps {
  take: TakeWithExpert;
  showExpert?: boolean;
  showSave?: boolean;
  isSaved?: boolean;
  onSave?: (takeId: string, saved: boolean) => void;
  showResolutionDate?: boolean;
  largeByline?: boolean;
  showFollow?: boolean;
  isFollowing?: boolean;
  isLoggedIn?: boolean;
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

export default function TakeCard({ take, showExpert = false, showSave = false, isSaved = false, onSave, showResolutionDate = false, largeByline = false, showFollow = false, isFollowing: initialIsFollowing = false, isLoggedIn = false }: TakeCardProps) {
  const [open, setOpen] = useState(false);
  const [following, setFollowing] = useState(initialIsFollowing);
  const [followPending, setFollowPending] = useState(false);

  const handleFollow = useCallback(async () => {
    if (!isLoggedIn) { window.location.href = `/auth/login?next=${encodeURIComponent(window.location.pathname)}`; return; }
    const next = !following;
    setFollowing(next);
    setFollowPending(true);
    try {
      next ? await followTake(take.take_id) : await unfollowTake(take.take_id);
    } catch {
      setFollowing(!next);
    } finally {
      setFollowPending(false);
    }
  }, [following, isLoggedIn, take.take_id]);

  const v          = verdictInfo(take.outcome_status);
  const chipLetter = gradeChipLetter(take.grade);
  const chipColor  = gradeColor(take.grade);
  const isPending  = take.outcome_status === "pending" || !take.outcome_status;
  const expert     = take.experts;
  const analysis   = (take as any).outcome_notes ?? (take as any).grade_notes;

  const rawDisplay  = take.raw_text?.trim() || take.summary?.trim() || "";
  const displayText = cleanTakeText(rawDisplay);
  const isParaphrase = !take.raw_text?.trim() && !!take.summary;

  // date_made is stored as an ET date string (YYYY-MM-DD) — parse directly, no TZ conversion
  const datePart = take.date_made.slice(0, 10); // "2026-07-01"
  const [, , ddStr] = datePart.split("-");
  const day = parseInt(ddStr, 10);
  // Use noon UTC to safely get the month name without any boundary risk
  const mo = new Date(datePart + "T12:00:00Z")
    .toLocaleDateString("en-US", { month: "short", timeZone: "UTC" }).toUpperCase();

  // Freshness ribbon — compare date_made (ET) against today's ET date
  const etToday = new Date().toLocaleDateString("en-CA", { timeZone: "America/New_York" }); // "2026-07-03"
  const madeDate = new Date(datePart + "T12:00:00Z");
  const todayDate = new Date(etToday + "T12:00:00Z");
  const daysAgo = (todayDate.getTime() - madeDate.getTime()) / 864e5;
  const fresh: 'today' | 'week' | null =
    daysAgo < 0 ? null :
    daysAgo < 1 ? 'today' :
    daysAgo < 7 ? 'week' : null;

  const fmtDate = (iso: string) => {
    const dt = new Date(iso);
    return dt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "America/New_York" }).toUpperCase();
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
          overflow: visible;
          padding: 22px 24px 20px;
          display: flex;
          flex-direction: column;
          transition: transform .12s ease, box-shadow .12s ease;
          position: relative;
        }
        .tfc-card:hover { transform: translate(-3px,-3px); box-shadow: 7px 7px 0 #15201a; }
        .tfc-card.open  { transform: translate(-3px,-3px); box-shadow: 7px 7px 0 #15201a; }
        .tfc-card.has-ribbon { padding-top: 36px; }

        /* freshness ribbon */
        .ribbon {
          position: absolute; top: 0; left: 24px; transform: translateY(-50%); z-index: 3;
          display: inline-flex; align-items: center; gap: 9px; white-space: nowrap;
          font-family: 'JetBrains Mono', monospace; font-weight: 800; font-size: 12px;
          letter-spacing: .15em;
          border: 2px solid #15201a; padding: 9px 15px;
          box-shadow: 3px 3px 0 #15201a;
        }
        .ribbon.today { background: #e08a00; color: #fff; }
        .ribbon.week  { background: #1f6feb; color: #fff; }

        /* analyst header */
        .tfc-expert {
          display: flex; align-items: center; gap: 10px;
          margin-bottom: 16px; padding-bottom: 14px;
          border-bottom: 1px solid #e5e7eb;
        }
        .tfc-avatar {
          width: 48px; height: 48px; border-radius: 50%;
          background: #e5e7eb; display: flex; align-items: center;
          justify-content: center; font-size: 14px; font-weight: 700;
          color: #4b5563; flex-shrink: 0; overflow: hidden;
        }
        .tfc-expert-name {
          font-family: 'Archivo Black', sans-serif;
          font-size: 19px; font-weight: 900; text-transform: uppercase;
          letter-spacing: -0.02em; color: #15201a;
          text-decoration: none;
        }
        .tfc-expert-name:hover { text-decoration: underline; }
        .tfc-expert-meta {
          font-family: 'JetBrains Mono', monospace;
          font-size: 10px; letter-spacing: 0.12em;
          text-transform: uppercase; color: #9ca3af;
          margin-top: 1px;
        }
        .tfc-track {
          display: flex; flex-direction: column; gap: 2px; margin-top: 3px;
          font-family: 'JetBrains Mono', monospace; font-size: 11px; letter-spacing: 0.08em;
          text-transform: uppercase;
        }
        .tfc-track-made { color: #8a8a82; }
        .tfc-track-resolved { color: #0a7a3b; font-weight: 700; }
        .tfc-track-pending  { color: #8a8a82; font-weight: 600; }

        /* top row: grade + verdict stacked at right */
        .tfc-top {
          display: flex; align-items: flex-start;
          justify-content: flex-end; gap: 12px;
          margin-bottom: 16px;
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

        /* verdict stacked under grade chip */
        .tfc-verdict-wrap { display: flex; flex-direction: column; align-items: flex-end; gap: 6px; }
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
        .tfc-actions { display: flex; flex-wrap: wrap; gap: 8px; }
        .tfc-btn {
          flex: 1; padding: 10px 6px; text-align: center;
          font-family: 'JetBrains Mono', monospace; font-size: 11px;
          letter-spacing: 0.16em; text-transform: uppercase; font-weight: 700;
          border-radius: 0; border: none; cursor: pointer;
          text-decoration: none; display: block;
          white-space: normal; line-height: 1.25;
          transition: opacity .15s;
        }
        .tfc-btn:hover { opacity: 0.85; }
        .tfc-btn-ctx   { background: #161a17; color: #ffffff; }
        .tfc-btn-share { background: #cf2c20; color: #ffffff; }
        .tfc-btn-save  { background: #ffffff; color: #161a17; border: 1.5px solid #161a17; }
        .tfc-btn-save.saved { background: #0a7a3b; color: #ffffff; border-color: #0a7a3b; }

        /* resolution date row */
        .tfc-dates {
          display: flex; align-items: stretch; gap: 0;
          border: 1.5px solid #e2ddd4; border-radius: 4px;
          overflow: hidden; margin-bottom: 14px; font-family: 'JetBrains Mono', monospace;
        }
        .tfc-dates-cell {
          flex: 1; padding: 8px 12px;
        }
        .tfc-dates-cell + .tfc-dates-cell { border-left: 1.5px solid #e2ddd4; }
        .tfc-dates-label {
          font-size: 9px; letter-spacing: .14em; text-transform: uppercase;
          color: #8a8a82; margin-bottom: 3px;
        }
        .tfc-dates-value {
          font-family: 'Archivo Black', sans-serif;
          font-size: 22px; letter-spacing: -.02em; color: #15201a; line-height: 1;
        }
        .tfc-dates-value.resolves { color: #e2241a; }

        @media (max-width: 600px) {
          .tfc-card { padding: 12px 12px 12px; }
          .tfc-chip { min-width: 38px; padding: 3px 6px; }
          .tfc-chip b { font-size: 13px; }
          .tfc-chip small { font-size: 7px; }
          .tfc-verdict { font-size: 9px; padding: 4px 8px; }
          .tfc-quote { font-size: 13px; padding: 10px 12px; margin-bottom: 10px; }
          .tfc-toggle { font-size: 9px; letter-spacing: 0.1em; padding: 9px 12px; }
          .tfc-panel { font-size: 12px; padding: 10px 12px; }
          .tfc-dates-value { font-size: 15px; }
          .tfc-dates-cell { padding: 6px 10px; }
          .tfc-actions { gap: 5px; }
          .tfc-btn { font-size: 8.5px; padding: 9px 4px; letter-spacing: 0.08em; }
          .tfc-btn-follow { flex: 1 1 100%; font-size: 8.5px; padding: 9px 6px; letter-spacing: 0.08em; gap: 5px; }
          .tfc-btn-follow svg { width: 13px; height: 13px; }
          .tfc-expert-name { font-size: 12px; }
        }

        /* follow button */
        .tfc-btn-follow {
          flex: none;
          display: inline-flex; align-items: center; justify-content: center; gap: 9px;
          padding: 10px 14px;
          font-family: 'JetBrains Mono', monospace; font-size: 11px;
          font-weight: 800; letter-spacing: .11em; text-transform: uppercase;
          background: #ffffff; color: #15201a;
          border: 2px solid #15201a;
          box-shadow: 4px 4px 0 rgba(21,32,26,.18);
          border-radius: 0; cursor: pointer;
          transition: transform .1s ease, box-shadow .1s ease, background .14s, color .14s;
          white-space: nowrap;
        }
        .tfc-btn-follow:hover:not(:disabled) { transform: translate(-2px,-2px); box-shadow: 6px 6px 0 #15201a; }
        .tfc-btn-follow:active:not(:disabled) { transform: translate(2px,2px); box-shadow: 0 0 0 #15201a; }
        .tfc-btn-follow.following { background: #15201a; color: #ffffff; }
        .tfc-btn-follow.following:hover:not(:disabled) { box-shadow: 6px 6px 0 #e2241a; }
        .tfc-btn-follow:disabled { opacity: .6; cursor: not-allowed; }
        @media (max-width: 560px) { .tfc-btn-follow { flex: 1 1 100%; } }
      `}</style>

      <article className={`tfc-card${open ? " open" : ""}${fresh ? " has-ribbon" : ""}`}>

        {/* ── Freshness ribbon ── */}
        {fresh && (
          <div className={`ribbon ${fresh}`}>
            {fresh === 'today' ? 'NEW TODAY' : 'NEW THIS WEEK'}
          </div>
        )}

        {/* ── Analyst header (only in feed view) ── */}
        {showExpert && expert ? (
          <div className="tfc-expert">
            <div className="tfc-avatar" style={largeByline ? { width: 57, height: 57, fontSize: 16 } : {}}>
              {expert.avatar_url
                ? <img src={expert.avatar_url} alt={expert.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                : initials(expert.name)}
            </div>
            <div style={{ flex: 1 }}>
              <Link href={expertUrl(expert)} className="tfc-expert-name" style={largeByline ? { fontSize: 22, fontWeight: 900 } : {}}>{expert.name}</Link>
              {expert.outlet && <p className="tfc-expert-meta">{expert.outlet}</p>}
              <div className="tfc-track">
                <span className="tfc-track-made">TAKE MADE {madeFmt}</span>
                <span className={isResolved ? "tfc-track-resolved" : "tfc-track-pending"}>
                  {trackSecondLabel}
                </span>
              </div>
            </div>
            {/* Grade + verdict in the header, right side */}
            <div className="tfc-verdict-wrap">
              <div className="tfc-chip" style={{ color: chipLetter ? chipColor : "#8b9088", borderColor: chipLetter ? chipColor : "#d1d5db" }}>
                <b>{chipLetter ?? "—"}</b>
                <small>GRADE</small>
              </div>
              <span
                className="tfc-verdict"
                style={{ backgroundColor: v.bg, color: v.color, border: v.border ?? "none" }}
              >
                {v.label}
              </span>
            </div>
          </div>
        ) : (
          /* No expert header — keep grade+verdict in their own row */
          <div className="tfc-top">
            <div className="tfc-verdict-wrap">
              <div className="tfc-chip" style={{ color: chipLetter ? chipColor : "#8b9088", borderColor: chipLetter ? chipColor : "#d1d5db" }}>
                <b>{chipLetter ?? "—"}</b>
                <small>GRADE</small>
              </div>
              <span
                className="tfc-verdict"
                style={{ backgroundColor: v.bg, color: v.color, border: v.border ?? "none" }}
              >
                {v.label}
              </span>
            </div>
          </div>
        )}

        {/* ── Filed / Resolves dates ── */}
        {showResolutionDate && (
          <div className="tfc-dates">
            <div className="tfc-dates-cell">
              <p className="tfc-dates-label">FILED</p>
              <p className="tfc-dates-value">{mo} {day}</p>
            </div>
            <div className="tfc-dates-cell">
              <p className="tfc-dates-label">RESOLVES</p>
              <p className={`tfc-dates-value${take.time_horizon_date ? " resolves" : ""}`}>
                {take.time_horizon_date ? fmtDate(take.time_horizon_date) : "TBD"}
              </p>
            </div>
          </div>
        )}

        {/* ── Quote ── */}
        <div className="tfc-quote">
          {isParaphrase && <p className="tfc-paraphrase">[Paraphrase]</p>}
          <p className="tfc-quote-text">&ldquo;{displayText}&rdquo;</p>
          <Link
            href={`/takes/${take.take_id}`}
            style={{
              display: "inline-block", marginTop: 8,
              fontFamily: "'JetBrains Mono', monospace", fontSize: 10,
              letterSpacing: "0.12em", textTransform: "uppercase", fontStyle: "normal",
              color: "#8b9088", textDecoration: "none", fontWeight: 600,
            }}
          >
            See full take →
          </Link>
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
          {showFollow && (
            <button
              className={`tfc-btn-follow${following ? " following" : ""}`}
              onClick={handleFollow}
              disabled={followPending}
              aria-pressed={following}
              aria-label={isPending ? "Follow this take for its result" : "Follow this take"}
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill={following ? "#ffffff" : "none"} stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                <path d="M13.7 21a2 2 0 0 1-3.4 0"/>
              </svg>
              {following ? "FOLLOWING" : isPending ? "FOLLOW FOR RESULT" : "FOLLOW"}
            </button>
          )}
          {showSave && (
            <button
              className={`tfc-btn tfc-btn-save${isSaved ? " saved" : ""}`}
              onClick={() => onSave?.(take.take_id, !isSaved)}
            >
              {isSaved ? "SAVED ✓" : "SAVE"}
            </button>
          )}
          <Link href={`/takes/${take.take_id}`} className="tfc-btn tfc-btn-ctx">
            SEE FULL CONTEXT
          </Link>
          {!showSave && (
            <ShareReceiptButton takeId={take.take_id} className="tfc-btn tfc-btn-share">
              SHARE RECEIPT
            </ShareReceiptButton>
          )}
        </div>

      </article>
    </>
  );
}
