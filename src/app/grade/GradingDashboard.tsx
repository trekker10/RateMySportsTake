"use client";

import { useState, useTransition, useEffect } from "react";
import { getPendingTakes, gradeSingleTake, type PendingTake } from "@/app/actions/grading";

type TakeStatus = "pending" | "grading" | "done" | "error";

interface TakeState extends PendingTake {
  status: TakeStatus;
  errorMsg?: string;
}

export default function GradingDashboard() {
  const [takes, setTakes] = useState<TakeState[] | null>(null);
  const [isLoading, startLoad] = useTransition();
  const [isGradingAll, setIsGradingAll] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);

  useEffect(() => {
    startLoad(async () => {
      const pending = await getPendingTakes();
      setTakes(pending.map((t) => ({ ...t, status: "pending" })));
    });
  }, []);

  function setTakeStatus(takeId: string, status: TakeStatus, errorMsg?: string) {
    setTakes((prev) =>
      prev!.map((t) =>
        t.take_id === takeId ? { ...t, status, errorMsg } : t
      )
    );
  }

  async function gradeOne(takeId: string) {
    setTakeStatus(takeId, "grading");
    const result = await gradeSingleTake(takeId);
    setTakeStatus(takeId, result.success ? "done" : "error", result.error);
  }

  async function gradeAll() {
    if (!takes) return;
    const pending = takes.filter((t) => t.status === "pending");
    setIsGradingAll(true);
    setSummary(null);
    let graded = 0;
    let failed = 0;

    for (const take of pending) {
      setTakeStatus(take.take_id, "grading");
      const result = await gradeSingleTake(take.take_id);
      setTakeStatus(take.take_id, result.success ? "done" : "error", result.error);
      result.success ? graded++ : failed++;
    }

    setIsGradingAll(false);
    setSummary(
      `Graded ${graded} take${graded !== 1 ? "s" : ""}${failed > 0 ? `, ${failed} failed` : ""}.`
    );
  }

  const pendingCount = takes?.filter((t) => t.status === "pending").length ?? 0;

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Grading Dashboard</h1>
          <p className="mt-1 text-zinc-400">
            Takes whose resolution date has passed — Claude searches the web to
            find out what happened and assigns a final grade.
          </p>
        </div>
        {pendingCount > 0 && (
          <button
            onClick={gradeAll}
            disabled={isGradingAll}
            className="shrink-0 rounded-lg bg-emerald-500 px-5 py-2.5 font-semibold text-black hover:bg-emerald-400 disabled:opacity-50 transition-colors"
          >
            {isGradingAll ? "Grading…" : `Grade all ${pendingCount}`}
          </button>
        )}
      </div>

      {summary && (
        <p className="text-sm text-emerald-400">{summary}</p>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-8 text-center text-zinc-500">
          Loading pending takes…
        </div>
      )}

      {/* Empty state */}
      {takes !== null && takes.length === 0 && (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-12 text-center space-y-2">
          <p className="text-xl">✅</p>
          <p className="text-zinc-400">No takes are ready for grading yet.</p>
          <p className="text-sm text-zinc-600">
            Takes appear here once their resolution date has passed.
          </p>
        </div>
      )}

      {/* Take cards */}
      {takes && takes.length > 0 && (
        <div className="space-y-4">
          {takes.map((take) => (
            <div
              key={take.take_id}
              className={`rounded-xl border p-5 space-y-4 transition-colors ${
                take.status === "done"
                  ? "border-emerald-800 bg-emerald-950/20"
                  : take.status === "error"
                  ? "border-red-800 bg-red-950/20"
                  : take.status === "grading"
                  ? "border-zinc-700 bg-zinc-900 opacity-70"
                  : "border-zinc-800 bg-zinc-900"
              }`}
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <p className="font-semibold text-zinc-100">{take.expert_name}</p>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-500">
                    <span>Made {take.date_made}</span>
                    <span>·</span>
                    <span className="text-amber-400">
                      Should resolve by {take.time_horizon_date}
                    </span>
                  </div>
                </div>

                {take.status === "pending" && (
                  <button
                    onClick={() => gradeOne(take.take_id)}
                    className="shrink-0 rounded-lg border border-zinc-700 px-4 py-1.5 text-sm text-zinc-300 hover:border-zinc-500 hover:text-zinc-50 transition-colors"
                  >
                    Grade now
                  </button>
                )}
                {take.status === "grading" && (
                  <span className="shrink-0 text-sm text-zinc-500">
                    Searching web…
                  </span>
                )}
                {take.status === "done" && (
                  <span className="shrink-0 text-sm text-emerald-400">✓ Graded</span>
                )}
                {take.status === "error" && (
                  <span className="shrink-0 text-sm text-red-400">Failed</span>
                )}
              </div>

              {/* Take preview */}
              <p className="text-zinc-300 leading-relaxed text-sm">
                "{take.raw_text.length > 200
                  ? take.raw_text.slice(0, 200).trimEnd() + "…"
                  : take.raw_text}"
              </p>

              {/* Grading criteria */}
              {take.grading_criteria && (
                <div className="rounded-lg bg-zinc-800/50 px-4 py-2.5 text-xs text-zinc-500">
                  <span className="text-zinc-600 font-medium">Grading criteria: </span>
                  {take.grading_criteria}
                </div>
              )}

              {/* Error message */}
              {take.status === "error" && take.errorMsg && (
                <p className="text-xs text-red-400">{take.errorMsg}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
