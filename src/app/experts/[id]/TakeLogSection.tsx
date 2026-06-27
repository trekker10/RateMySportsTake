"use client";

import { useState, useTransition, useCallback } from "react";
import Link from "next/link";
import ShareReceiptButton from "@/components/ShareReceiptButton";
import { getExpertTakesPage, type ProfileTake } from "@/app/actions/takes";
import { scoreToGrade } from "@/lib/takescore";
import { followTake, unfollowTake } from "@/app/actions/takeFollows";

const PAGE_SIZE = 10;

/* ─── helpers ─────────────────────────────────────────────── */

function verdictInfo(status: string): { label: string; cls: string } {
  if (status === "confirmed_true")  return { label: "RIGHT",       cls: "right" };
  if (status === "confirmed_false") return { label: "WRONG",       cls: "wrong" };
  if (status === "partially_true")  return { label: "PARTLY RIGHT", cls: "wrong" };
  if (status === "unresolvable")    return { label: "N/A",         cls: "pending" };
  return                                   { label: "PENDING",     cls: "pending" };
}

function gradeArrows(grade: number | null): { arrows: string; positive: boolean } | null {
  if (grade == null) return null;
  const delta = Math.abs(Math.round(grade - 50));
  const positive = Math.round(grade) >= 50;
  const count = delta <= 15 ? 1 : delta <= 30 ? 2 : 3;
  return { arrows: (positive ? "↗" : "↘").repeat(count), positive };
}

function gradeChipLetter(grade: number | null): string | null {
  if (grade == null) return null;
  return scoreToGrade(grade).charAt(0); // "A","B","C","D","F"
}

/* ─── TakeCard ─────────────────────────────────────────────── */

function TakeCard({ take, index, isLoggedIn, initialFollowing }: { take: ProfileTake; index: number; isLoggedIn: boolean; initialFollowing: boolean }) {
  const [open, setOpen] = useState(false);
  const [following, setFollowing] = useState(initialFollowing);
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

  const v        = verdictInfo(take.outcome_status);
  const impact   = gradeArrows(take.grade);
  const chipLetter = gradeChipLetter(take.grade);
  const isPending  = take.outcome_status === "pending";

  const displayText = take.raw_text?.trim() || take.summary?.trim() || "";
  const isParaphrase = !take.raw_text?.trim() && !!take.summary;
  const analysis = take.outcome_notes ?? take.grade_notes;

  const d   = new Date(take.date_made);
  const mo  = d.toLocaleDateString("en-US", { month: "short" }).toUpperCase();
  const day = d.getDate();

  function toggle() {
    setOpen((o) => !o);
  }

  return (
    <article
      className={`take-card${open ? " open" : ""}`}
      data-verdict={v.cls}
      style={{ marginTop: index === 0 ? 0 : 24 }}
    >
      {/* TOP ROW — date + grade chip + verdict */}
      <div className="card-top">
        <div className="card-meta">
          {/* Stacked date */}
          <span className="tc-date">
            <span className="tc-mo">{mo}</span>
            <span className="tc-day">{day}</span>
          </span>
          {/* Grade chip */}
          {chipLetter ? (
            <span className={`grade-chip`} data-grade={chipLetter}>
              <b>{chipLetter}</b>
              <small>GRADE</small>
            </span>
          ) : (
            <span className="grade-chip pending">
              <b>&ndash;</b>
              <small>GRADE</small>
            </span>
          )}
        </div>

        {/* Verdict + arrows */}
        <div className="verdict-wrap">
          <span className={`verdict ${v.cls}`}>{v.label}</span>
          {impact != null && !isPending && (
            <p className={`tc-arrows ${impact.positive ? "pos" : "neg"}`}>
              {impact.arrows}
            </p>
          )}
        </div>
      </div>

      {/* QUOTE */}
      <div className="tc-quote">
        {isParaphrase && <p className="tc-paraphrase">[Paraphrase]</p>}
        &ldquo;{displayText}&rdquo;
      </div>

      {/* WHAT HAPPENED toggle */}
      <div className="disclose">
        <button
          className="tc-toggle"
          aria-expanded={open}
          onClick={toggle}
        >
          <span>{isPending ? "AWAITING RESULT" : "WHAT HAPPENED"}</span>
          <span className={`tc-chev${open ? " flipped" : ""}`}>▼</span>
        </button>
        {open && (
          <div className="panel-pad">
            {isPending ? (
              <div className="pending-note">
                Not graded yet — this take gets a grade once the result is decided.
              </div>
            ) : (
              <>
                <div className="what-lab">WHAT HAPPENED</div>
                <div className="what">
                  {analysis ?? "No analysis recorded yet."}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* BUTTONS */}
      <div className="tc-actions">
        <button
          className={`tc-btn-follow${following ? " following" : ""}`}
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
        <Link href={`/takes/${take.take_id}`} className="tc-btn tc-btn-ctx">
          SEE FULL CONTEXT
        </Link>
        {!isPending && (
          <ShareReceiptButton takeId={take.take_id} className="tc-btn tc-btn-share">
            SHARE RECEIPT
          </ShareReceiptButton>
        )}
      </div>
    </article>
  );
}

/* ─── TakeLogSection ───────────────────────────────────────── */

interface Props {
  expertId: string;
  initialTakes: ProfileTake[];
  totalTakes: number;
  verdict: string;
  gradeMin: number | null;
  gradeMax: number | null;
  activeGrade: string | null;
  isLoggedIn?: boolean;
  followedTakeIds?: string[];
}

export default function TakeLogSection({
  expertId,
  initialTakes,
  totalTakes,
  verdict,
  gradeMin,
  gradeMax,
  isLoggedIn = false,
  followedTakeIds = [],
}: Props) {
  const [takes, setTakes]       = useState<ProfileTake[]>(initialTakes);
  const [isPending, startTransition] = useTransition();

  const hasMore = takes.length < totalTakes;

  function loadMore() {
    startTransition(async () => {
      const next = await getExpertTakesPage(
        expertId, verdict, gradeMin, gradeMax, takes.length, PAGE_SIZE
      );
      setTakes((prev) => [...prev, ...next]);
    });
  }

  return (
    <>
      <style>{`
        /* ── tokens ── */
        .take-card{
          --ink:#15201a;--ink-soft:#3a4239;--ink-faint:#8a8a82;
          --cream:#f5f1e8;--accent:#e2241a;--good:#0a7a3b;
        }

        /* ── card chrome ── */
        .take-card{
          background:#fff;border:2px solid var(--ink);
          padding:26px 28px 24px;display:flex;flex-direction:column;
          transition:transform .12s ease,box-shadow .12s ease;
        }
        .take-card:hover{transform:translate(-3px,-3px);box-shadow:7px 7px 0 var(--ink);}
        .take-card.open{box-shadow:7px 7px 0 var(--ink);transform:translate(-3px,-3px);}

        /* ── top row ── */
        .card-top{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;margin-bottom:18px;}
        .card-meta{display:flex;align-items:center;gap:14px;}

        /* ── date ── */
        .tc-date{display:flex;flex-direction:column;align-items:flex-start;line-height:1;}
        .tc-mo{font-family:'JetBrains Mono',monospace;font-weight:700;font-size:13px;letter-spacing:.18em;color:var(--ink-soft);}
        .tc-day{font-family:'Archivo Black',sans-serif;font-size:34px;line-height:.86;letter-spacing:-.03em;color:var(--ink);margin-top:4px;}

        /* ── grade chip ── */
        .grade-chip{display:flex;flex-direction:column;align-items:center;justify-content:center;
          width:48px;height:48px;border:2px solid var(--ink);color:var(--ink);flex:none;}
        .grade-chip b{font-family:'Archivo Black',sans-serif;font-size:24px;line-height:.9;}
        .grade-chip small{font-family:'JetBrains Mono',monospace;font-size:8px;letter-spacing:.1em;}
        .grade-chip[data-grade="A"]{border-color:#0a7a3b;color:#0a7a3b;}
        .grade-chip[data-grade="B"]{border-color:#e07a18;color:#e07a18;}
        .grade-chip[data-grade="C"]{border-color:#d6a312;color:#d6a312;}
        .grade-chip[data-grade="D"]{border-color:#a8472a;color:#a8472a;}
        .grade-chip[data-grade="F"]{border-color:#e2241a;color:#e2241a;}
        .grade-chip.pending{border-color:var(--ink-faint);color:var(--ink-faint);border-style:dashed;}

        /* ── verdict + arrows ── */
        .verdict-wrap{text-align:right;}
        .verdict{display:inline-block;font-family:'JetBrains Mono',monospace;font-weight:700;font-size:15px;
          letter-spacing:.12em;color:#fff;background:var(--good);padding:8px 16px;}
        .verdict.wrong{background:var(--accent);}
        .verdict.pending{background:#cfd2d7;color:var(--ink-soft);}
        .tc-arrows{font-size:22px;font-style:italic;font-weight:900;line-height:1;margin-top:6px;letter-spacing:-.02em;}
        .tc-arrows.pos{color:#0a7a3b;}
        .tc-arrows.neg{color:#e2241a;}

        /* ── quote ── */
        .tc-quote{background:var(--cream);padding:22px 24px;font-style:italic;font-size:23px;
          line-height:1.32;letter-spacing:-.01em;color:var(--ink-soft);}
        .tc-paraphrase{font-family:'JetBrains Mono',monospace;font-size:9px;letter-spacing:.14em;
          color:var(--ink-faint);text-transform:uppercase;margin-bottom:6px;font-style:normal;}

        /* ── what happened toggle ── */
        .disclose{margin-top:18px;}
        .tc-toggle{width:100%;display:flex;align-items:center;justify-content:space-between;gap:12px;
          background:#fff;border:2px solid var(--ink);color:var(--ink);
          font-family:'JetBrains Mono',monospace;font-weight:700;font-size:14px;letter-spacing:.12em;
          padding:14px 18px;text-align:left;cursor:pointer;
          transition:background .14s ease,color .14s ease,transform .1s ease,box-shadow .1s ease;}
        .tc-toggle:hover{transform:translate(-2px,-2px);box-shadow:5px 5px 0 var(--ink);}
        .take-card.open .tc-toggle{background:var(--ink);color:#fff;}
        .take-card.open .tc-toggle:hover{box-shadow:5px 5px 0 var(--accent);}
        .take-card[data-verdict="pending"] .tc-toggle{border-color:var(--ink-faint);color:var(--ink-soft);}
        .take-card[data-verdict="pending"].open .tc-toggle{background:var(--ink-soft);color:#fff;border-color:var(--ink-soft);}
        .tc-chev{font-size:13px;transition:transform .26s ease;}
        .tc-chev.flipped{transform:rotate(180deg);}

        /* ── panel ── */
        .panel-pad{padding-top:20px;}
        .what-lab{font-family:'JetBrains Mono',monospace;font-size:12px;letter-spacing:.2em;
          color:var(--ink-faint);margin:0 0 8px;}
        .what{font-size:18px;line-height:1.5;color:var(--ink-soft);}
        .pending-note{background:#eceef1;border-left:3px solid var(--ink-faint);
          padding:16px 18px;font-size:17px;line-height:1.5;color:var(--ink-soft);font-style:italic;}

        /* ── buttons ── */
        .tc-actions{display:flex;gap:14px;margin-top:22px;}
        .tc-btn{flex:1;border:2px solid var(--ink);font-family:'JetBrains Mono',monospace;font-weight:800;
          font-size:16px;letter-spacing:.11em;padding:16px 14px;text-align:center;
          transition:transform .1s ease,box-shadow .1s ease;cursor:pointer;display:block;}
        .tc-btn-ctx{background:var(--ink);color:#fff;box-shadow:4px 4px 0 rgba(21,32,26,.25);}
        .tc-btn-ctx:hover{transform:translate(-2px,-2px);box-shadow:6px 6px 0 var(--ink);}
        .tc-btn-ctx:active{transform:translate(2px,2px);box-shadow:none;}
        .tc-btn-share{background:var(--accent);color:#fff;border-color:var(--ink);box-shadow:4px 4px 0 rgba(21,32,26,.25);}
        .tc-btn-share:hover{transform:translate(-2px,-2px);box-shadow:6px 6px 0 var(--ink);}
        .tc-btn-share:active{transform:translate(2px,2px);box-shadow:none;}
        .tc-btn-follow{flex:none;display:inline-flex;align-items:center;justify-content:center;gap:9px;
          padding:16px 18px;font-family:'JetBrains Mono',monospace;font-weight:800;font-size:16px;
          letter-spacing:.11em;text-transform:uppercase;background:#fff;color:var(--ink);
          border:2px solid var(--ink);box-shadow:4px 4px 0 rgba(21,32,26,.18);border-radius:0;
          cursor:pointer;transition:transform .1s ease,box-shadow .1s ease,background .14s,color .14s;white-space:nowrap;}
        .tc-btn-follow:hover:not(:disabled){transform:translate(-2px,-2px);box-shadow:6px 6px 0 var(--ink);}
        .tc-btn-follow:active:not(:disabled){transform:translate(2px,2px);box-shadow:0 0 0 var(--ink);}
        .tc-btn-follow.following{background:var(--ink);color:#fff;}
        .tc-btn-follow.following:hover:not(:disabled){box-shadow:6px 6px 0 var(--accent);}
        .tc-btn-follow:disabled{opacity:.6;cursor:not-allowed;}

        /* ── mobile ── */
        .tc-actions{flex-wrap:wrap;}
        @media(max-width:600px){
          .take-card{padding:14px 14px 14px;}
          .tc-day{font-size:26px;}
          .tc-mo{font-size:10px;}
          .grade-chip{width:38px;height:38px;}
          .grade-chip b{font-size:18px;}
          .verdict{font-size:10px;padding:5px 10px;}
          .tc-arrows{font-size:16px;}
          .tc-quote{font-size:15px;padding:14px 16px;}
          .tc-toggle{font-size:10px;letter-spacing:.1em;padding:11px 14px;}
          .what{font-size:14px;}
          .pending-note{font-size:13px;padding:12px 14px;}
          .tc-actions{gap:7px;margin-top:14px;}
          .tc-btn{font-size:10px;padding:11px 6px;letter-spacing:.08em;}
          .tc-btn-follow{flex:1 1 100%;font-size:10px;padding:11px 10px;letter-spacing:.08em;gap:6px;}
          .tc-btn-follow svg{width:14px;height:14px;}
        }
      `}</style>

      <div>
        {takes.length > 0 ? (
          takes.map((take, i) => <TakeCard key={take.take_id} take={take} index={i} isLoggedIn={isLoggedIn} initialFollowing={followedTakeIds.includes(take.take_id)} />)
        ) : (
          <div className="py-12 text-center italic text-gray-400">
            No takes found for this filter.
          </div>
        )}

        <div className="mt-6 flex items-center justify-between border-t-2 border-gray-900 pt-4">
          {hasMore ? (
            <button
              onClick={loadMore}
              disabled={isPending}
              className="italic text-gray-500 hover:text-gray-900 text-sm transition-colors disabled:opacity-50"
            >
              {isPending ? "Loading…" : `See all ${totalTakes} takes`}
            </button>
          ) : (
            <span className="italic text-gray-400 text-sm">
              {takes.length === 0 ? "No takes" : `All ${takes.length} takes shown`}
            </span>
          )}
          <span className="font-black text-xl text-gray-400">→</span>
        </div>
      </div>
    </>
  );
}
