"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import ShareReceiptButton from "@/components/ShareReceiptButton";
import { getExpertTakesPage, type ProfileTake } from "@/app/actions/takes";

const PAGE_SIZE = 10;

function verdictTag(status: string) {
  if (status === "confirmed_true")  return { label: "RIGHT",       bg: "#0a7a3b", text: "#fff" };
  if (status === "confirmed_false") return { label: "WRONG",       bg: "#e2241a", text: "#fff" };
  if (status === "partially_true")  return { label: "PARTLY RIGHT", bg: "#d97706", text: "#fff" };
  if (status === "unresolvable")    return { label: "N/A",          bg: "#6b7280", text: "#fff" };
  return                                   { label: "PENDING",     bg: "#e5e7eb", text: "#4b5563" };
}

function gradeArrows(grade: number | null): { arrows: string; positive: boolean } | null {
  if (grade == null) return null;
  const delta = Math.abs(Math.round(grade - 50));
  const positive = Math.round(grade) >= 50;
  const count = delta <= 15 ? 1 : delta <= 30 ? 2 : 3;
  return { arrows: (positive ? "↗" : "↘").repeat(count), positive };
}

interface Props {
  expertId: string;
  initialTakes: ProfileTake[];
  totalTakes: number;
  verdict: string;
  gradeMin: number | null;
  gradeMax: number | null;
  activeGrade: string | null;
}

function TakeRow({ take, index }: { take: ProfileTake; index: number }) {
  const v = verdictTag(take.outcome_status);
  const impact = gradeArrows(take.grade);
  const displayText = (take.summary ?? take.raw_text).replace(/^The analyst/i, "Analyst");
  const analysis = take.outcome_notes ?? take.grade_notes;

  return (
    <div
      className="flex"
      style={{ borderTop: index > 0 ? "1px dashed #d1d5db" : undefined }}
    >
      {/* Date */}
      <div className="w-16 shrink-0 px-3 pt-4 font-mono text-[10px] tracking-wider text-gray-400 uppercase">
        {new Date(take.date_made).toLocaleDateString("en-US", { month: "short", year: "2-digit" }).toUpperCase()}
      </div>

      {/* Take + analysis + buttons */}
      <div className="flex-1 min-w-0">
        <div className="px-4 py-3.5" style={{ backgroundColor: "#f5f1e9" }}>
          <p className="italic text-base leading-snug text-gray-800">
            &ldquo;{displayText}&rdquo;
          </p>
        </div>
        {analysis && (
          <div className="px-4 py-3 border-t border-gray-200">
            <p className="text-sm text-gray-600 leading-relaxed">{analysis}</p>
          </div>
        )}
        <div className="px-4 py-2.5 border-t border-gray-200 flex flex-wrap gap-2">
          <Link
            href={`/takes/${take.take_id}`}
            className="px-3 py-1.5 border border-gray-300 font-mono text-[10px] tracking-wider text-gray-600 hover:border-gray-700 hover:text-gray-900 transition-colors uppercase"
          >
            See Full Context
          </Link>
          <ShareReceiptButton
            takeId={take.take_id}
            className="px-3 py-1.5 border border-gray-300 font-mono text-[10px] tracking-wider text-gray-600 hover:border-gray-700 hover:text-gray-900 transition-colors uppercase"
          >
            Share Receipt
          </ShareReceiptButton>
        </div>
      </div>

      {/* Verdict + impact */}
      <div className="shrink-0 px-4 py-4 flex flex-col items-end gap-2">
        <span
          className="font-mono text-[10px] tracking-wider px-2 py-1 whitespace-nowrap font-semibold"
          style={{ backgroundColor: v.bg, color: v.text }}
        >
          {v.label}
        </span>
        {impact != null ? (
          <p className={`italic text-xl tracking-tight leading-none ${impact.positive ? "text-emerald-600" : "text-red-600"}`}>
            {impact.arrows}
          </p>
        ) : (
          <p className="text-lg text-gray-300">—</p>
        )}
      </div>
    </div>
  );
}

export default function TakeLogSection({
  expertId,
  initialTakes,
  totalTakes,
  verdict,
  gradeMin,
  gradeMax,
  activeGrade,
}: Props) {
  const [takes, setTakes] = useState<ProfileTake[]>(initialTakes);
  const [isPending, startTransition] = useTransition();

  const hasMore = takes.length < totalTakes;

  function loadMore() {
    startTransition(async () => {
      const next = await getExpertTakesPage(
        expertId,
        verdict,
        gradeMin,
        gradeMax,
        takes.length,
        PAGE_SIZE
      );
      setTakes((prev) => [...prev, ...next]);
    });
  }

  return (
    <div className="bg-white border-2 border-gray-900">
      {takes.length > 0 ? (
        takes.map((take, i) => <TakeRow key={take.take_id} take={take} index={i} />)
      ) : (
        <div className="px-4 py-12 text-center italic text-gray-400">
          No takes found for this filter.
        </div>
      )}

      <div className="px-4 py-3 border-t-2 border-gray-900 flex items-center justify-between">
        {hasMore ? (
          <button
            onClick={loadMore}
            disabled={isPending}
            className="italic text-gray-500 hover:text-gray-900 text-sm transition-colors disabled:opacity-50"
          >
            {isPending
              ? "Loading…"
              : `See all ${totalTakes} takes`}
          </button>
        ) : (
          <span className="italic text-gray-400 text-sm">
            {takes.length === 0 ? "No takes" : `All ${takes.length} takes shown`}
          </span>
        )}
        <span className="font-black text-xl text-gray-400">→</span>
      </div>
    </div>
  );
}
