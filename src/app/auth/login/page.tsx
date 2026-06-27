"use client";

import { useActionState, useState, useEffect } from "react";
import { signIn } from "@/app/auth/actions";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function LoginForm() {
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "";
  const [state, action, isPending] = useActionState(signIn, undefined);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (state?.redirectTo) {
      window.location.href = state.redirectTo;
    }
  }, [state?.redirectTo]);

  return (
    <>
      <style>{`
        .si-card { background: #fff; border: 3px solid #15201a; box-shadow: 9px 9px 0 #15201a; max-width: 480px; width: 100%; margin: 40px auto; padding: 44px 48px 40px; box-sizing: border-box; }
        .si-label { font-family: 'JetBrains Mono', monospace; font-size: 10px; letter-spacing: .16em; text-transform: uppercase; color: #8a8a82; display: block; margin-bottom: 8px; font-weight: 700; }
        .si-input { width: 100%; border: 2px solid #15201a; padding: 13px 16px; font-family: 'Space Grotesk', sans-serif; font-size: 16px; color: #15201a; background: #fff; outline: none; box-sizing: border-box; transition: box-shadow .12s ease; }
        .si-input::placeholder { color: #b0aca4; }
        .si-input:focus { box-shadow: 4px 4px 0 #15201a; }
        .si-field { margin-bottom: 24px; }
        .si-cta { width: 100%; background: #15201a; color: #fff; border: 2px solid #15201a; font-family: 'Archivo Black', sans-serif; font-size: 14px; letter-spacing: .12em; text-transform: uppercase; padding: 18px; cursor: pointer; box-shadow: 6px 6px 0 rgba(21,32,26,.25); transition: box-shadow .12s ease, transform .12s ease; margin-top: 8px; }
        .si-cta:hover:not(:disabled) { box-shadow: 6px 6px 0 #e2241a; transform: translate(-2px,-2px); }
        .si-cta:disabled { opacity: .6; cursor: not-allowed; }
        .si-pw-wrap { position: relative; }
        .si-pw-toggle { position: absolute; right: 14px; top: 50%; transform: translateY(-50%); font-family: 'JetBrains Mono', monospace; font-size: 10px; letter-spacing: .14em; text-transform: uppercase; font-weight: 700; color: #8a8a82; background: none; border: none; cursor: pointer; padding: 4px; }
        .si-pw-toggle:hover { color: #15201a; }
        @media (max-width: 880px) { .si-card { box-shadow: 6px 6px 0 #15201a; } .si-heading { font-size: 27px !important; } }
        @media (max-width: 420px) { .si-card { padding: 28px 18px; } }
      `}</style>

      <div style={{ padding: "0 16px 60px", minHeight: "80vh" }}>
        <div className="si-card">
          {/* Header */}
          <div style={{ textAlign: "center", marginBottom: 36 }}>
            <h1 className="si-heading" style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 34, color: "#15201a", letterSpacing: "-.02em", lineHeight: 1.1, marginBottom: 8 }}>
              Welcome back.
            </h1>
            <p style={{ fontStyle: "italic", fontSize: 16, color: "#8a8a82" }}>
              The takes don&apos;t grade themselves.
            </p>
          </div>

          <form action={action}>
            <input type="hidden" name="next" value={next} />

            {/* Email */}
            <div className="si-field">
              <label className="si-label">Email</label>
              <input name="email" type="email" required autoComplete="email" placeholder="you@example.com" className="si-input" />
            </div>

            {/* Password */}
            <div className="si-field">
              <label className="si-label">Password</label>
              <div className="si-pw-wrap">
                <input
                  name="password"
                  type={showPassword ? "text" : "password"}
                  required autoComplete="current-password"
                  placeholder="••••••••"
                  className="si-input" style={{ paddingRight: 64 }}
                />
                <button type="button" className="si-pw-toggle" onClick={() => setShowPassword((v) => !v)}>
                  {showPassword ? "HIDE" : "SHOW"}
                </button>
              </div>
            </div>

            {state?.error && (
              <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: "#e2241a", marginBottom: 16, letterSpacing: ".08em" }}>
                {state.error}
              </p>
            )}

            <button type="submit" disabled={isPending} className="si-cta">
              {isPending ? "Signing in…" : "Sign in"}
            </button>
          </form>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 20, fontSize: 14, color: "#8a8a82" }}>
            <a href="/auth/forgot-password" style={{ color: "#8a8a82", textDecoration: "underline", fontSize: 13 }}>
              Forgot password?
            </a>
            <span>
              No account?{" "}
              <a href="/auth/signup" style={{ color: "#15201a", fontWeight: 700, textDecoration: "underline" }}>
                Sign up
              </a>
            </span>
          </div>
        </div>
      </div>
    </>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
