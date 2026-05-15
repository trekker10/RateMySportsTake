"use client";

import { useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";

const inputClass =
  "w-full rounded-lg bg-zinc-900 border border-zinc-700 px-4 py-2.5 text-zinc-50 placeholder-zinc-600 focus:border-emerald-500 focus:outline-none";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const supabase = createClient();
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/callback?next=/&type=recovery`,
      });
      if (error) {
        setError(error.message);
      } else {
        setSent(true);
      }
    });
  }

  if (sent) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center">
        <div className="w-full max-w-sm space-y-4 text-center">
          <h1 className="text-2xl font-bold">Check your email</h1>
          <p className="text-zinc-400">
            We sent a password reset link to <span className="text-zinc-200">{email}</span>.
            Click the link in that email to set a new password.
          </p>
          <a href="/auth/login" className="block text-sm text-emerald-400 hover:underline">
            Back to sign in
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[70vh] items-center justify-center">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Forgot password</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Enter your email and we'll send you a reset link.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoFocus
              className={inputClass}
            />
          </div>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <button
            type="submit"
            disabled={isPending}
            className="w-full rounded-lg bg-emerald-500 px-6 py-3 font-semibold text-black hover:bg-emerald-400 disabled:opacity-50 transition-colors"
          >
            {isPending ? "Sending…" : "Send reset link"}
          </button>
        </form>

        <p className="text-center text-sm text-zinc-500">
          <a href="/auth/login" className="text-emerald-400 hover:underline">
            Back to sign in
          </a>
        </p>
      </div>
    </div>
  );
}
