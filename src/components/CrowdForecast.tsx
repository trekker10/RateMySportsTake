"use client";

import { useState, useEffect, useCallback } from "react";

interface ForecastData {
  well:     number;
  poorly:   number;
  myVote:   "well" | "poorly" | null;
  graded:   boolean;
  verdict?: "right" | "wrong";
  minVotes?: number;
}

interface Props {
  takeId:     string;
  isLoggedIn: boolean;
  initial?:   ForecastData;
}

const DEFAULT_MIN_VOTES = 5;

export default function CrowdForecast({ takeId, isLoggedIn, initial }: Props) {
  const [data, setData]             = useState<ForecastData | null>(initial ?? null);
  const [pending, setPending]       = useState(false);
  const [showLoginMsg, setShowLoginMsg] = useState(false);
  const [confirmChange, setConfirmChange] = useState(false);
  const [voteError, setVoteError]   = useState<string | null>(null);
  const [minVotes, setMinVotes]     = useState<number>(initial?.minVotes ?? DEFAULT_MIN_VOTES);

  useEffect(() => {
    fetch(`/api/takes/${takeId}/forecast`)
      .then((r) => r.json())
      .then((fresh) => {
        if (fresh.minVotes != null) setMinVotes(fresh.minVotes);
        setData(fresh);
      })
      .catch(() => {});
  }, [takeId]);

  // Core action: cast or retract a vote
  const cast = useCallback(async (vote: "well" | "poorly") => {
    if (!data || data.graded || pending) return;

    const prev = { ...data };
    setData((d) => {
      if (!d) return d;
      let { well, poorly, myVote } = d;
      if (myVote === "well")   well--;
      if (myVote === "poorly") poorly--;
      if (myVote !== vote) { vote === "well" ? well++ : poorly++; myVote = vote; }
      else                  { myVote = null; }
      return { ...d, well, poorly, myVote };
    });

    setPending(true);
    try {
      const res = await fetch(`/api/takes/${takeId}/forecast`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ vote }),
      });
      const fresh = await res.json();
      if (res.ok) {
        setData((d) => ({ ...d!, graded: fresh.graded }));
        setVoteError(null);
      } else {
        setData(prev);
        setVoteError(fresh?.error ?? "Failed to save vote — please try again.");
        setTimeout(() => setVoteError(null), 4000);
      }
    } catch {
      setData(prev);
      setVoteError("Network error — please try again.");
      setTimeout(() => setVoteError(null), 4000);
    } finally {
      setPending(false);
    }
  }, [data, pending, takeId]);

  // First-time vote button click
  const handleVote = useCallback((vote: "well" | "poorly") => {
    if (!isLoggedIn) {
      setShowLoginMsg(true);
      setTimeout(() => setShowLoginMsg(false), 3500);
      return;
    }
    if (!data || data.graded || pending) return;

    // Already voted this side → open change-vote confirmation
    if (data.myVote === vote) {
      setConfirmChange(true);
      return;
    }

    // Already voted the other side → do nothing (must go through confirmation first)
    if (data.myVote) return;

    // No vote yet → cast it
    cast(vote);
  }, [cast, data, isLoggedIn, pending]);

  // User confirmed they want to change their vote
  const handleConfirmChange = useCallback(async () => {
    if (!data?.myVote) return;
    setConfirmChange(false);
    await cast(data.myVote); // same-side POST = delete/undo in the API
  }, [cast, data]);

  if (!data) return null;

  const { well, poorly, myVote, graded, verdict } = data;
  const total     = well + poorly;
  const pctWell   = total > 0 ? Math.round(well / total * 100) : 50;
  const pctPoor   = 100 - pctWell;
  const hasEnough = total >= minVotes;
  const hasVoted  = !!myVote;

  const majority = well >= poorly ? "well" : "poorly";
  const aged     = verdict === "right" ? "well" : "poorly";
  const calledIt = majority === aged;

  const fmt = (n: number) => n.toLocaleString("en-US");

  return (
    <>
      <style>{`
        .fc-panel {
          margin-top: 14px;
          border: 2px solid #15201a;
          border-radius: 9px;
          background: #444444;
          padding: 15px 17px 16px;
        }
        .fc-head {
          display: flex; align-items: center; justify-content: space-between; gap: 12px;
        }
        .fc-label {
          font-family: 'JetBrains Mono', monospace;
          font-weight: 700; font-size: 13px; letter-spacing: .2em;
          color: #ffffff; text-transform: uppercase;
        }
        .fc-total {
          font-family: 'JetBrains Mono', monospace;
          font-size: 11px; letter-spacing: .08em; color: #ffffff; white-space: nowrap;
        }
        .fc-closed-badge {
          display: inline-flex; align-items: center; gap: 6px;
          font-family: 'JetBrains Mono', monospace; font-weight: 800;
          font-size: 10px; letter-spacing: .12em; color: #15201a;
          background: #d6d9de; border: 1.5px solid #15201a;
          border-radius: 4px; padding: 4px 9px; white-space: nowrap;
        }
        .fc-bar {
          display: flex; height: 15px; border: 2px solid #15201a;
          border-radius: 4px; margin-top: 12px; overflow: hidden; background: #fff;
        }
        .fc-bar-well { display: block; height: 100%; background: #53AF0F; transition: width .45s cubic-bezier(.4,0,.2,1); }
        .fc-bar-poor { display: block; height: 100%; background: #e5342a; transition: width .45s cubic-bezier(.4,0,.2,1); }
        .fc-pct {
          display: flex; justify-content: space-between; margin-top: 8px;
          font-family: 'JetBrains Mono', monospace; font-weight: 700;
          font-size: 12px; letter-spacing: .05em;
        }
        .fc-pct-well { color: #53AF0F; }
        .fc-pct-poor { color: #FF6057; }
        .fc-no-votes {
          margin-top: 8px; font-family: 'JetBrains Mono', monospace;
          font-size: 10px; letter-spacing: .1em; color: #9a9a93; text-align: center; text-transform: uppercase;
        }

        /* Vote buttons */
        .fc-btns { display: flex; gap: 11px; margin-top: 13px; }
        .fc-btn {
          flex: 1; display: flex; align-items: center; justify-content: center; gap: 8px;
          border: 2px solid #15201a; background: #fff; color: #15201a;
          border-radius: 6px; font-family: 'JetBrains Mono', monospace;
          font-weight: 800; font-size: 12.5px; letter-spacing: .08em; padding: 12px 8px;
          cursor: pointer;
          transition: transform .1s ease, box-shadow .1s ease, background .14s ease, color .14s ease;
        }
        .fc-btn:hover:not(:disabled):not(.fc-btn-locked-other) {
          transform: translate(-2px,-2px); box-shadow: 4px 4px 0 #15201a;
        }
        /* Locked-in: chosen button stays coloured and is clickable to trigger confirm */
        .fc-btn-well.fc-btn-chosen { background: #53AF0F; color: #fff; border-color: #3d8c00; cursor: pointer; }
        .fc-btn-poor.fc-btn-chosen { background: #e5342a; color: #fff; border-color: #b52019; cursor: pointer; }
        /* The unchosen button when locked */
        .fc-btn-locked-other {
          background: #666; color: #aaa; border-color: #555;
          opacity: .55; cursor: not-allowed;
        }

        /* Change-vote confirmation */
        .fc-confirm {
          margin-top: 13px; padding: 13px 14px;
          background: #2a2a2a; border: 2px solid #15201a; border-radius: 6px;
          animation: fc-fadein .15s ease;
        }
        .fc-confirm-text {
          font-family: 'JetBrains Mono', monospace; font-weight: 700;
          font-size: 11px; letter-spacing: .12em; text-transform: uppercase;
          color: #fff; margin-bottom: 10px; text-align: center;
        }
        .fc-confirm-btns { display: flex; gap: 8px; }
        .fc-confirm-yes {
          flex: 1; padding: 9px 6px;
          font-family: 'JetBrains Mono', monospace; font-weight: 800;
          font-size: 11px; letter-spacing: .1em; text-transform: uppercase;
          background: #e5342a; color: #fff; border: 2px solid #b52019;
          border-radius: 5px; cursor: pointer;
          transition: opacity .12s;
        }
        .fc-confirm-yes:hover { opacity: .85; }
        .fc-confirm-no {
          flex: 1; padding: 9px 6px;
          font-family: 'JetBrains Mono', monospace; font-weight: 800;
          font-size: 11px; letter-spacing: .1em; text-transform: uppercase;
          background: #fff; color: #15201a; border: 2px solid #15201a;
          border-radius: 5px; cursor: pointer;
          transition: opacity .12s;
        }
        .fc-confirm-no:hover { opacity: .75; }

        /* Login nudge */
        .fc-login-msg {
          margin-top: 11px; padding: 10px 14px;
          background: #15201a; color: #fff;
          font-family: 'JetBrains Mono', monospace;
          font-size: 11px; letter-spacing: .08em; text-transform: uppercase;
          border-radius: 6px; text-align: center;
          animation: fc-fadein .18s ease;
        }
        .fc-login-msg a { color: #53AF0F; text-decoration: underline; font-weight: 700; }
        @keyframes fc-fadein { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: none; } }

        .fc-result {
          margin-top: 13px; padding-top: 12px;
          border-top: 1.5px solid rgba(21,32,26,.25);
          font-family: 'Archivo Black', sans-serif;
          font-size: 15px; letter-spacing: -.01em;
          display: flex; align-items: center; gap: 8px;
        }
        .fc-result-well   { color: #53AF0F; }
        .fc-result-poorly { color: #e5342a; }
        @media (max-width: 600px) {
          .fc-btn { font-size: 10px; padding: 10px 6px; }
          .fc-pct { font-size: 10px; }
          .fc-confirm-yes, .fc-confirm-no { font-size: 9px; }
        }
      `}</style>

      <div className="fc-panel">
        {/* Header */}
        <div className="fc-head">
          <span className="fc-label">CROWD FORECAST</span>
          {graded
            ? <span className="fc-closed-badge">🔒 VOTING CLOSED</span>
            : <span className="fc-total">{hasEnough ? `${fmt(total)} VOTES` : ""}</span>
          }
        </div>

        {/* Bar / no-votes message */}
        {hasEnough ? (
          <>
            <div className="fc-bar">
              <span className="fc-bar-well" style={{ width: `${pctWell}%` }} />
              <span className="fc-bar-poor" style={{ width: `${pctPoor}%` }} />
            </div>
            <div className="fc-pct">
              <span className="fc-pct-well">{pctWell}% {graded ? "AGES WELL" : "SAY AGES WELL"}</span>
              <span className="fc-pct-poor">{pctPoor}% {graded ? "AGES POORLY" : "SAY AGES POORLY"}</span>
            </div>
          </>
        ) : (
          <div className="fc-no-votes">
            {total === 0
              ? "Be the first to forecast"
              : `${total} vote${total !== 1 ? "s" : ""} so far — ${minVotes - total} more to reveal`}
          </div>
        )}

        {/* Open state: vote buttons or change-vote confirmation */}
        {!graded && (
          <>
            {confirmChange ? (
              /* ── Change-vote confirmation ── */
              <div className="fc-confirm">
                <p className="fc-confirm-text">Change your vote?</p>
                <div className="fc-confirm-btns">
                  <button className="fc-confirm-yes" onClick={handleConfirmChange} disabled={pending}>
                    Yes, change it
                  </button>
                  <button className="fc-confirm-no" onClick={() => setConfirmChange(false)}>
                    Keep my vote
                  </button>
                </div>
              </div>
            ) : (
              /* ── Normal vote buttons ── */
              <div className="fc-btns">
                <button
                  className={[
                    "fc-btn fc-btn-well",
                    myVote === "well"   ? "fc-btn-chosen" : "",
                    hasVoted && myVote !== "well" ? "fc-btn-locked-other" : "",
                  ].join(" ").trim()}
                  onClick={() => handleVote("well")}
                  disabled={pending || (hasVoted && myVote !== "well")}
                  aria-pressed={myVote === "well"}
                >
                  ▲ AGES WELL
                </button>
                <button
                  className={[
                    "fc-btn fc-btn-poor",
                    myVote === "poorly" ? "fc-btn-chosen" : "",
                    hasVoted && myVote !== "poorly" ? "fc-btn-locked-other" : "",
                  ].join(" ").trim()}
                  onClick={() => handleVote("poorly")}
                  disabled={pending || (hasVoted && myVote !== "poorly")}
                  aria-pressed={myVote === "poorly"}
                >
                  ▼ AGES POORLY
                </button>
              </div>
            )}

            {showLoginMsg && (
              <div className="fc-login-msg">
                Please{" "}
                <a href={`/auth/login?next=${encodeURIComponent(typeof window !== "undefined" ? window.location.pathname : "/")}`}>log in</a>
                {" "}or{" "}
                <a href="/auth/signup">create an account</a>
                {" "}to vote.
              </div>
            )}
            {voteError && (
              <div className="fc-login-msg" style={{ background: "#7f1d1d" }}>
                ⚠ {voteError}
              </div>
            )}
          </>
        )}

        {/* Closed: crowd result line */}
        {graded && hasEnough && (
          <div className={`fc-result ${majority === "well" ? "fc-result-well" : "fc-result-poorly"}`}>
            {calledIt
              ? majority === "well" ? "✓ CROWD CALLED IT" : "✓ CROWD CALLED THE MISS"
              : "✗ CROWD WHIFFED"
            }
          </div>
        )}
      </div>
    </>
  );
}
