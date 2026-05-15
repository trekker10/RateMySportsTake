import Link from "next/link";
import type { Take, Expert } from "@/types/database";

type TakeWithExpert = Take & {
  experts?: Pick<Expert, "name" | "expert_id" | "outlet"> | null;
};

interface TakeCardProps {
  take: TakeWithExpert;
  showExpert?: boolean;
}

const OUTCOME_STYLES: Record<string, { label: string; className: string }> = {
  confirmed_true:  { label: "✓ Correct",          className: "bg-emerald-50 text-emerald-700 border border-emerald-200" },
  confirmed_false: { label: "✗ Wrong",             className: "bg-red-50 text-red-700 border border-red-200" },
  partially_true:  { label: "~ Partially Right",   className: "bg-yellow-50 text-yellow-700 border border-yellow-200" },
  unresolvable:    { label: "Unresolvable",         className: "bg-gray-100 text-gray-500 border border-gray-200" },
  pending:         { label: "Outcome Pending",      className: "bg-gray-100 text-gray-500 border border-gray-200" },
};

export default function TakeCard({ take, showExpert = false }: TakeCardProps) {
  const outcome = OUTCOME_STYLES[take.outcome_status] ?? OUTCOME_STYLES.pending;
  const preview =
    take.raw_text.length > 220
      ? take.raw_text.slice(0, 220).trimEnd() + "…"
      : take.raw_text;

  return (
    <Link href={`/takes/${take.take_id}`}>
      <div className="rounded-xl border border-gray-200 bg-white p-5 hover:border-gray-300 hover:shadow-md transition-all space-y-3">

        {/* Header row */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2">
            {showExpert && take.experts && (
              <span className="font-semibold text-gray-900">{take.experts.name}</span>
            )}
            {take.sport && (
              <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs text-gray-600 border border-gray-200">
                {take.sport}
              </span>
            )}
            <span className="text-xs text-gray-400">
              {new Date(take.date_made).toLocaleDateString("en-US", {
                month: "short", day: "numeric", year: "numeric",
              })}
            </span>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {take.grade !== null && (
              <span className="text-sm font-bold text-emerald-600">{take.grade}/100</span>
            )}
            <span className={`rounded-full px-2.5 py-0.5 text-xs ${outcome.className}`}>
              {outcome.label}
            </span>
          </div>
        </div>

        {/* Quote */}
        <p className="text-sm leading-relaxed text-gray-700">"{preview}"</p>

        {/* AI scores */}
        {take.rating_status === "rated" && (
          <div className="flex flex-wrap gap-4 text-xs text-gray-400">
            {take.difficulty_score !== null && (
              <span>Difficulty <span className="font-medium text-gray-600">{take.difficulty_score}/10</span></span>
            )}
            {take.falsifiability_score !== null && (
              <span>Falsifiability <span className="font-medium text-gray-600">{take.falsifiability_score}/10</span></span>
            )}
            {take.confidence_claimed !== null && (
              <span>Confidence <span className="font-medium text-gray-600">{take.confidence_claimed}/10</span></span>
            )}
          </div>
        )}

        {take.rating_status === "pending" && (
          <p className="text-xs text-gray-400">AI rating in progress…</p>
        )}
        {take.rating_status === "failed" && (
          <p className="text-xs text-amber-600">AI rating failed</p>
        )}
      </div>
    </Link>
  );
}
