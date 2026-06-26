"use client";

import { useActionState, useState, useEffect } from "react";
import { signUp } from "@/app/auth/actions";
import { createClient } from "@/lib/supabase/client";
import { subscribeUserToPush } from "@/lib/push";



const SPORTS = ["NBA", "NFL", "MLB", "NHL", "SOCCER", "CFB", "WNBA", "MMA"];

const INTENT_OPTIONS = [
  { value: "receipts", index: "01", title: "To see the worst takes and keep receipts", sub: "Bookmark the whiffs. Never let them forget." },
  { value: "correct",  index: "02", title: "To see who is actually making correct takes", sub: "Find the analysts who earn their grade." },
  { value: "both",     index: "03", title: "A little bit of everything", sub: "Give me the whole leaderboard, good and bad." },
];

export default function SignupPage() {
  const [state, action, isPending] = useActionState(signUp, undefined);
  const [selectedSports, setSelectedSports] = useState<Set<string>>(new Set());
  const [selectedIntent, setSelectedIntent] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
useEffect(() => {
    if (state?.success) {
      const supabase = createClient();
      supabase.auth.getUser().then(({ data }) => {
        if (data.user) {
          subscribeUserToPush(data.user.id, supabase);
        }
      });
    }
  }, [state?.success]);
  function toggleSport(sport: string) {
    setSelectedSports((prev) => {
      const next = new Set(prev);
      next.has(sport) ? next.delete(sport) : next.add(sport);
      return next;
    });
  }

  if (state?.success) {
    return (
      <div style={{ display: "flex", minHeight: "70vh", alignItems: "center", justifyContent: "center", padding: "24px" }}>
        <div style={{ textAlign: "center", maxWidth: 400 }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>📬</div>
          <h1 style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 28, color: "#15201a", marginBottom: 8 }}>Check your email</h1>
          <p style={{ color: "#8a8a82", fontSize: 16, fontStyle: "italic", marginBottom: 24 }}>
            We sent you a confirmation link. Click it to activate your account.
          </p>
          <a href="/auth/login" style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, letterSpacing: ".16em", textTransform: "uppercase", color: "#e2241a", fontWeight: 700 }}>
            Back to sign in →
          </a>
        </div>
      </div>
    );
  }

  return (
    <>
      <style>{`
        .su-card { background: #fff; border: 3px solid #15201a; box-shadow: 9px 9px 0 #15201a; max-width: 560px; width: 100%; margin: 40px auto; padding: 44px 48px 40px; box-sizing: border-box; }
        .su-label { font-family: 'JetBrains Mono', monospace; font-size: 10px; letter-spacing: .16em; text-transform: uppercase; color: #8a8a82; display: block; margin-bottom: 8px; font-weight: 700; }
        .su-input { width: 100%; border: 2px solid #15201a; padding: 13px 16px; font-family: 'Space Grotesk', sans-serif; font-size: 16px; color: #15201a; background: #fff; outline: none; box-sizing: border-box; transition: box-shadow .12s ease; }
        .su-input::placeholder { color: #b0aca4; }
        .su-input:focus { box-shadow: 4px 4px 0 #15201a; }
        .su-field { margin-bottom: 28px; }
        .su-sport-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
        .su-sport-chip { display: flex; align-items: center; gap: 8px; border: 2px solid #15201a; padding: 10px 12px; cursor: pointer; font-family: 'JetBrains Mono', monospace; font-size: 12px; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; color: #15201a; background: #fff; user-select: none; transition: transform .1s ease, box-shadow .1s ease; width: 100%; text-align: left; }
        .su-sport-chip:hover { transform: translate(-2px,-2px); box-shadow: 4px 4px 0 #15201a; }
        .su-sport-chip.sel { background: #15201a; color: #fff; }
        .su-tick { width: 16px; height: 16px; border: 2px solid currentColor; flex-shrink: 0; display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: 900; }
        .su-sport-chip.sel .su-tick { border-color: #e2241a; color: #e2241a; background: #fff; }
        .su-intent-card { display: flex; align-items: flex-start; gap: 14px; border: 2px solid #15201a; padding: 16px 18px; cursor: pointer; margin-bottom: 10px; user-select: none; transition: transform .1s ease, box-shadow .1s ease; }
        .su-intent-card:last-of-type { margin-bottom: 0; }
        .su-intent-card:hover { transform: translate(-2px,-2px); box-shadow: 4px 4px 0 #15201a; }
        .su-intent-card.sel { background: #15201a; }
        .su-radio-dot { width: 20px; height: 20px; border-radius: 50%; border: 2px solid #c0bdb8; flex-shrink: 0; margin-top: 2px; }
        .su-intent-card.sel .su-radio-dot { border-color: #e2241a; background: #e2241a; }
        .su-intent-idx { font-family: 'JetBrains Mono', monospace; font-size: 14px; font-weight: 700; color: #e2241a; flex-shrink: 0; margin-top: 1px; }
        .su-intent-title { font-family: 'Space Grotesk', sans-serif; font-weight: 700; font-size: 15px; color: #15201a; }
        .su-intent-card.sel .su-intent-title { color: #fff; }
        .su-intent-sub { font-size: 13px; color: #8a8a82; margin-top: 2px; }
        .su-intent-card.sel .su-intent-sub { color: rgba(255,255,255,.6); }
        .su-cta { width: 100%; background: #15201a; color: #fff; border: 2px solid #15201a; font-family: 'Archivo Black', sans-serif; font-size: 14px; letter-spacing: .12em; text-transform: uppercase; padding: 18px; cursor: pointer; box-shadow: 6px 6px 0 rgba(21,32,26,.25); transition: box-shadow .12s ease, transform .12s ease; }
        .su-cta:hover:not(:disabled) { box-shadow: 6px 6px 0 #e2241a; transform: translate(-2px,-2px); }
        .su-cta:disabled { opacity: .6; cursor: not-allowed; }
        .su-pw-wrap { position: relative; }
        .su-pw-toggle { position: absolute; right: 14px; top: 50%; transform: translateY(-50%); font-family: 'JetBrains Mono', monospace; font-size: 10px; letter-spacing: .14em; text-transform: uppercase; font-weight: 700; color: #8a8a82; background: none; border: none; cursor: pointer; padding: 4px; }
        .su-pw-toggle:hover { color: #15201a; }
        @media (max-width: 880px) { .su-card { box-shadow: 6px 6px 0 #15201a; } .su-heading { font-size: 27px !important; } }
        @media (max-width: 420px) { .su-sport-grid { grid-template-columns: repeat(2, 1fr); } .su-card { padding: 28px 18px; } }
      `}</style>

      <div style={{ padding: "0 16px 60px", minHeight: "80vh" }}>
        <div className="su-card">
          {/* Header */}
          <div style={{ textAlign: "center", marginBottom: 36 }}>
            <h1 className="su-heading" style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 34, color: "#15201a", letterSpacing: "-.02em", lineHeight: 1.1, marginBottom: 8 }}>
              Create your account
            </h1>
            <p style={{ fontStyle: "italic", fontSize: 16, color: "#8a8a82" }}>
              Pick your sports, pick your side. Takes await.
            </p>
          </div>

          <form action={action}>
            {/* Hidden inputs for controlled state */}
            {Array.from(selectedSports).map((s) => (
              <input key={s} type="hidden" name="favorite_sports" value={s} />
            ))}
            {selectedIntent && <input type="hidden" name="user_intent" value={selectedIntent} />}

            {/* Username */}
            <div className="su-field">
              <label className="su-label">Username</label>
              <input name="username" type="text" required autoComplete="username" placeholder="Username" className="su-input" />
            </div>

            {/* Favorite sports */}
            <div className="su-field">
              <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 10 }}>
                <span className="su-label" style={{ margin: 0 }}>Favorite sports</span>
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, letterSpacing: ".12em", color: "#b0aca4", textTransform: "uppercase" }}>· pick all that apply</span>
              </div>
              <div className="su-sport-grid">
                {SPORTS.map((s) => {
                  const on = selectedSports.has(s);
                  return (
                    <button key={s} type="button" className={`su-sport-chip${on ? " sel" : ""}`} onClick={() => toggleSport(s)}>
                      <span className="su-tick">{on ? "✓" : ""}</span>
                      {s}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Email */}
            <div className="su-field">
              <label className="su-label">Email</label>
              <input name="email" type="email" required autoComplete="email" placeholder="you@example.com" className="su-input" />
            </div>

            {/* Password */}
            <div className="su-field">
              <label className="su-label">Password</label>
              <div className="su-pw-wrap">
                <input
                  name="password"
                  type={showPassword ? "text" : "password"}
                  required autoComplete="new-password" minLength={8}
                  placeholder="At least 8 characters"
                  className="su-input" style={{ paddingRight: 64 }}
                />
                <button type="button" className="su-pw-toggle" onClick={() => setShowPassword((v) => !v)}>
                  {showPassword ? "HIDE" : "SHOW"}
                </button>
              </div>
            </div>

            {/* What brings you here */}
            <div className="su-field">
              <label className="su-label" style={{ marginBottom: 12 }}>What brings you here?</label>
              {INTENT_OPTIONS.map((opt) => {
                const on = selectedIntent === opt.value;
                return (
                  <div key={opt.value} className={`su-intent-card${on ? " sel" : ""}`} onClick={() => setSelectedIntent(opt.value)}>
                    <div className="su-radio-dot" />
                    <span className="su-intent-idx">{opt.index}</span>
                    <div>
                      <p className="su-intent-title">{opt.title}</p>
                      <p className="su-intent-sub">{opt.sub}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            {state?.error && (
              <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: "#e2241a", marginBottom: 16, letterSpacing: ".08em" }}>
                {state.error}
              </p>
            )}

            <button type="submit" disabled={isPending} className="su-cta">
              {isPending ? "Creating account…" : "Create account"}
            </button>
          </form>

          <p style={{ textAlign: "center", marginTop: 20, fontSize: 14, color: "#8a8a82" }}>
            Already keeping receipts?{" "}
            <a href="/auth/login" style={{ color: "#15201a", fontWeight: 700, textDecoration: "underline" }}>Sign in</a>
          </p>
        </div>
      </div>
    </>
  );
}
