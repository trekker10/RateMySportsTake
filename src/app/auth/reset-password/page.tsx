"use client";

import { useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

const inputClass =
  "w-full rounded-lg bg-zinc-900 border border-zinc-700 px-4 py-2.5 text-zinc-50 placeholder-zinc-600 focus:border-emerald-500 focus:outline-none";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        setError(error.message);
      } else {
        router.push("/");
      }
    });
  }

  return (
    <div className="flex min-h-[70vh] items-center justify-center">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Set new password</h1>
          <p className="mt-1 text-sm text-zinc-500">Choose a new password for your account.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1">New password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              placeholder="At least 6 characters"
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
            {isPending ? "Saving…" : "Set password"}
          </button>
        </form>
      </div>
    </div>
  );
}
