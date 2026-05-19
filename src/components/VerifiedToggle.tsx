"use client";

import { useTransition, useState } from "react";
import { toggleVerified } from "@/app/actions/experts";

export default function VerifiedToggle({
  expertId,
  initialVerified,
}: {
  expertId: string;
  initialVerified: boolean;
}) {
  const [verified, setVerified] = useState(initialVerified);
  const [isPending, startTransition] = useTransition();

  function handleChange() {
    const next = !verified;
    setVerified(next);
    startTransition(() => toggleVerified(expertId, next));
  }

  return (
    <label className="relative inline-flex items-center cursor-pointer shrink-0" title={verified ? "Verified — on leaderboard" : "Unverified — hidden from leaderboard"}>
      <input
        type="checkbox"
        checked={verified}
        onChange={handleChange}
        disabled={isPending}
        className="sr-only peer"
      />
      <div className="w-10 h-5 bg-zinc-600 rounded-full peer peer-checked:bg-emerald-500 peer-disabled:opacity-50 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-5 transition-colors" />
      <span className="ml-2 text-xs text-zinc-400 w-20">
        {isPending ? "Saving…" : verified ? "✓ Verified" : "Unverified"}
      </span>
    </label>
  );
}
