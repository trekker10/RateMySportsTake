"use client";

import { useState, useEffect, useCallback } from "react";

interface ForecastData {
  well:    number;
  poorly:  number;
  myVote:  "well" | "poorly" | null;
  graded:  boolean;
  verdict?: "right" | "wrong";
}

interface Props {
  takeId:     string;
  isLoggedIn: boolean;
  // initial data passed from server to avoid flash
  initial?:   ForecastData;
}

const MIN_VOTES = 5; // show percentages only above this threshold

export default function CrowdForecast({ takeId, isLoggedIn, initial }: Props) {
  const [data, setData]       = useState<ForecastData | null>(initial ?? null);
  const [pending, setPending] = useState(false);
  const [showLoginMsg, setShowLoginMsg] = useState(false);

  useEffect(() => {
    fetch(`/api/takes/${takeId}/forecast`)
      .then((r) => r.json())
      .then(setData)
      .catch(() => {});
  }, [takeId]);

  const cast = useCallback(async (vote: "well" | "poorly") => {
    if (!isLoggedIn) {
      setShowLoginMsg(true);
      setTimeout(() => setShowLoginMsg(false), 3500);
      return;
    }
    if (!data || data.graded || pending) return;

    // optimistic update
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
      if (res.ok) setData((d) => ({ ...d!, ...fresh }));
      else        setData(prev); // rollback
    } catch {
      setData(prev);
    } finally {
      setPending(false);
    }
  }, [data, isLoggedIn, pending, takeId]);

  if (!data) return null;

  const { well, poorly, myVote, graded, verdict } = data;
  const total   = well + poorly;
  const pctWell = total > 0 ? Math.round(well / total * 100) : 50;
  const pctPoor = 100 - pctWell;
  const hasEnough = total >= MIN_VOTES;

  // "CROWD CALLED IT" logic
  const majority  = well >= poorly ? "well" : "poorly";
  const aged      = verdict === "right" ? "well" : "poorly";
  const calledIt  = majority === aged;

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
        .fc-bar-well  { display: block; height: 100%; background: #53AF0F; transition: width .45s cubic-bezier(.4,0,.2,1); }
        .fc-bar-poor  { display: block; height: 100%; background: #e5342a; transition: width .45s cubic-bezier(.4,0,.2,1); }
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
        .fc-login-msg {
          margin-top: 11px; padding: 10px 14px;
          background: #15201a; color: #fff;
          font-family: 'JetBrains Mono', monospace;
          font-size: 11px; letter-spacing: .08em; text-transform: uppercase;
          border-radius: 6px; text-align: center;
          animation: fc-fadein .18s ease;
        }
        .fc-login-msg a {
          color: #53AF0F; text-decoration: underline; font-weight: 700;
        }
        @keyframes fc-fadein { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: none; } }
        .fc-btns {
          display: flex; gap: 11px; margin-top: 13px;
        }
        .fc-btn {
          flex: 1; display: flex; align-items: center; justify-content: center; gap: 8px;
          border: 2px solid #15201a; background: #fff; color: #15201a;
          border-radius: 6px; font-family: 'JetBrains Mono', monospace;
          font-weight: 800; font-size: 12.5px; letter-spacing: .08em; padding: 12px 8px;
          cursor: pointer;
          transition: transform .1s ease, box-shadow .1s ease, background .14s ease, color .14s ease;
        }
        .fc-btn:hover:not(:disabled) { transform: translate(-2px,-2px); box-shadow: 4px 4px 0 #15201a; }
        .fc-btn:disabled { cursor: not-allowed; }
        .fc-btn-well.on { background: #53AF0F; color: #fff; }
        .fc-btn-poor.on { background: #e5342a; color: #fff; }
        .fc-voted .fc-btn:not(.on) { opacity: .5; }
        .fc-result {
          margin-top: 13px; padding-top: 12px;
          border-top: 1.5px solid rgba(21,32,26,.25);
          font-family: 'Archivo Black', sans-serif;
          font-size: 15px; letter-spacing: -.01em;
          display: flex; align-items: center; gap: 8px;
        }
        .fc-result-called { color: #53AF0F; }
        .fc-result-whiff  { color: #e5342a; }
        @media (max-width: 600px) {
          .fc-btn { font-size: 10px; padding: 10px 6px; }
          .fc-pct { font-size: 10px; }
        }
      `}</style>

      <div className={`fc-panel${!graded && myVote ? " fc-voted" : ""}`}>
        {/* Header */}
        <div className="fc-head">
          <span className="fc-label">CROWD FORECAST</span>
          {graded
            ? <span className="fc-closed-badge">🔒 VOTING CLOSED</span>
            : <span className="fc-total">{hasEnough ? `${fmt(total)} VOTES` : ""}</span>
          }
        </div>

        {/* Bar */}
        {hasEnough ? (
          <>
            <div className="fc-bar">
              <span className="fc-bar-well" style={{ width: `${pctWell}%` }} />
              <span className="fc-bar-poor" style={{ width: `${pctPoor}%` }} />
            </div>
            <div className="fc-pct">
              <span className="fc-pct-well">
                {pctWell}% {graded ? "AGES WELL" : "SAY AGES WELL"}
              </span>
              <span className="fc-pct-poor">
                {pctPoor}% {graded ? "AGES POORLY" : "SAY AGES POORLY"}
              </span>
            </div>
          </>
        ) : (
          <div className="fc-no-votes">
            {total === 0 ? "Be the first to forecast" : `${total} vote${total !== 1 ? "s" : ""} so far — ${MIN_VOTES - total} more to reveal`}
          </div>
        )}

        {/* Open: vote buttons */}
        {!graded && (
          <>
            <div className="fc-btns">
              <button
                className={`fc-btn fc-btn-well${myVote === "well" ? " on" : ""}`}
                onClick={() => cast("well")}
                disabled={pending}
                aria-pressed={myVote === "well"}
              >
                ▲ AGES WELL
              </button>
              <button
                className={`fc-btn fc-btn-poor${myVote === "poorly" ? " on" : ""}`}
                onClick={() => cast("poorly")}
                disabled={pending}
                aria-pressed={myVote === "poorly"}
              >
                ▼ AGES POORLY
              </button>
            </div>
            {showLoginMsg && (
              <div className="fc-login-msg">
                Please{" "}
                <a href={`/auth/login?next=${encodeURIComponent(typeof window !== "undefined" ? window.location.pathname : "/")}`}>log in</a>
                {" "}or{" "}
                <a href="/auth/signup">create an account</a>
                {" "}to vote.
              </div>
            )}
          </>
        )}

        {/* Closed: result line */}
        {graded && hasEnough && (
          <div className={`fc-result ${calledIt ? "fc-result-called" : "fc-result-whiff"}`}>
            {calledIt ? "✓ CROWD CALLED IT" : "✗ CROWD WHIFFED"}
          </div>
        )}
      </div>
    </>
  );
}
