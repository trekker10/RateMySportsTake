"use client";

import { useTransition, useState } from "react";
import { toggleFantasyGuru } from "@/app/actions/experts";

export default function FantasyGuruToggle({
  expertId,
  initialValue,
}: {
  expertId: string;
  initialValue: boolean;
}) {
  const [isGuru, setIsGuru] = useState(initialValue);
  const [isPending, startTransition] = useTransition();

  function handleChange() {
    const next = !isGuru;
    setIsGuru(next);
    startTransition(() => toggleFantasyGuru(expertId, next));
  }

  return (
    <label
      className="relative inline-flex items-center cursor-pointer shrink-0"
      title={isGuru ? "Fantasy Guru — on fantasy leaderboard" : "Not a fantasy guru"}
    >
      <input
        type="checkbox"
        checked={isGuru}
        onChange={handleChange}
        disabled={isPending}
        className="sr-only peer"
      />
      <div className="w-10 h-5 bg-zinc-600 rounded-full peer peer-checked:bg-green-600 peer-disabled:opacity-50 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-5 transition-colors" />
      <span className="ml-2 text-xs w-20" style={{ color: isGuru ? "#16a34a" : "#71717a" }}>
        {isPending ? "Saving…" : isGuru ? "✓ Guru" : "Not Guru"}
      </span>
    </label>
  );
}
