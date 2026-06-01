"use client";

import { useState } from "react";
import { runFlipFlopDetection } from "@/app/actions/flip-flops";
import { useRouter } from "next/navigation";

export default function RunDetectionButton({ expertId }: { expertId: string }) {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ msg: string; ok: boolean } | null>(null);
  const router = useRouter();

  async function handleClick() {
    setLoading(true);
    setStatus(null);
    try {
      const res = await runFlipFlopDetection(expertId);
      if (res.success) {
        setStatus({
          msg: res.count === 0
            ? "No flip-flops found."
            : `Found ${res.count} flip-flop${res.count !== 1 ? "s" : ""}.`,
          ok: true,
        });
        router.refresh();
      } else {
        setStatus({ msg: res.error ?? "Detection failed.", ok: false });
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
      <button
        onClick={handleClick}
        disabled={loading}
        className="px-5 py-2.5 font-mono text-xs tracking-widest uppercase text-white transition-opacity disabled:opacity-50"
        style={{ backgroundColor: "#e2241a" }}
      >
        {loading ? "ANALYZING TAKES…" : "⟲ RUN DETECTION"}
      </button>
      {status && (
        <span
          className="font-mono text-xs tracking-wide"
          style={{ color: status.ok ? "#0a7a3b" : "#e2241a" }}
        >
          {status.msg}
        </span>
      )}
    </div>
  );
}
