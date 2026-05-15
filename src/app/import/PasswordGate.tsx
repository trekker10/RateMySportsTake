"use client";

import { useState, useTransition } from "react";
import { verifyImportPassword } from "@/app/actions/auth";

export default function PasswordGate({ onUnlock }: { onUnlock: () => void }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(false);
    startTransition(async () => {
      const ok = await verifyImportPassword(password);
      if (ok) {
        onUnlock();
      } else {
        setError(true);
        setPassword("");
      }
    });
  }

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <p className="text-4xl mb-3">🔒</p>
          <h1 className="text-2xl font-bold">Import Takes</h1>
          <p className="mt-1 text-sm text-zinc-500">
            This feature is password protected.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter password"
            autoFocus
            required
            className="w-full rounded-lg bg-zinc-900 border border-zinc-700 px-4 py-3 text-zinc-50 placeholder-zinc-600 focus:border-emerald-500 focus:outline-none text-center tracking-widest"
          />
          {error && (
            <p className="text-center text-sm text-red-400">Incorrect password.</p>
          )}
          <button
            type="submit"
            disabled={isPending}
            className="w-full rounded-lg bg-emerald-500 px-6 py-3 font-semibold text-black hover:bg-emerald-400 disabled:opacity-50 transition-colors"
          >
            {isPending ? "Checking…" : "Unlock"}
          </button>
        </form>
      </div>
    </div>
  );
}
