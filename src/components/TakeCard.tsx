import Link from "next/link";
import type { Take, Expert } from "@/types/database";

type TakeWithExpert = Take & {
  experts?: Pick<Expert, "name" | "expert_id" | "outlet"> | null;
};

interface TakeCardProps {
  take: TakeWithExpert;
  showExpert?: boolean;
}

function verdictTag(status: string) {
  if (status === "confirmed_true")  return { label: "RIGHT",      bg: "#0a7a3b", text: "#fff" };
  if (status === "confirmed_false") return { label: "WRONG",      bg: "#e2241a", text: "#fff" };
  if (status === "partially_true")  return { label: "PARTLY RIGHT", bg: "#d97706", text: "#fff" };
  if (status === "unresolvable")    return { label: "N/A",         bg: "#6b7280", text: "#fff" };
  return                                   { label: "PENDING",    bg: "#e5e7eb", text: "#4b5563" };
}

function gradeArrows(grade: number | null): { arrows: string; positive: boolean } | null {
  if (grade == null) return null;
  const delta = Math.abs(Math.round(grade - 50));
  const positive = Math.round(grade) >= 50;
  const count = delta <= 15 ? 1 : delta <= 30 ? 2 : 3;
  return { arrows: (positive ? "↗" : "↘").repeat(count), positive };
}

function initials(name: string) {
  return name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
}

export default function TakeCard({ take, showExpert = false }: TakeCardProps) {
  const v = verdictTag(take.outcome_status);
  const impact = gradeArrows(take.grade);
  const expert = take.experts;
  const filed = new Date(take.date_made).toLocaleDateString("en-US", {
    month: "short", year: "2-digit",
  }).toUpperCase();

  return (
    <div className="bg-white border-2 border-gray-900">

      {/* Header row */}
      <div className="flex items-center justify-between gap-4 px-4 py-3 border-b border-gray-200">
        <div className="flex items-center gap-3 min-w-0">
          {showExpert && expert ? (
            <>
              <div className="w-8 h-8 rounded-full bg-gray-200 shrink-0 flex items-center justify-center text-xs font-bold text-gray-600">
                {initials(expert.name)}
              </div>
              <div className="min-w-0">
                <Link href={`/experts/${expert.expert_id}`} className="font-black text-sm uppercase tracking-tight hover:underline">
                  {expert.name}
                </Link>
                <p className="font-mono text-[9px] tracking-wider text-gray-400 uppercase">
                  {[expert.outlet, `Filed ${filed}`].filter(Boolean).join(" · ")}
                </p>
              </div>
            </>
          ) : (
            <p className="font-mono text-[10px] tracking-wider text-gray-400 uppercase">
              Filed {filed}{take.sport ? ` · ${take.sport}` : ""}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span
            className="font-mono text-[10px] tracking-wider px-2 py-1 font-semibold"
            style={{ backgroundColor: v.bg, color: v.text }}
          >
            {v.label}
          </span>
          {impact != null && (
            <span className={`font-black text-lg italic tracking-tight ${impact.positive ? "text-emerald-600" : "text-red-600"}`}>
              {impact.arrows}
            </span>
          )}
        </div>
      </div>

      {/* Quote */}
      <div className="px-4 py-4" style={{ backgroundColor: "#f5f1e9" }}>
        <p className="italic text-lg leading-snug text-gray-800">
          &ldquo;{take.raw_text}&rdquo;
        </p>
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-gray-200 space-y-3">
        <div className="flex flex-wrap items-baseline gap-4">
          {take.grade != null && (() => {
            const g = gradeArrows(take.grade);
            return g ? (
              <span className="font-mono text-[10px] tracking-wider text-gray-400 uppercase">
                GRADE <span className={`font-black italic text-base ml-1 tracking-tight ${g.positive ? "text-emerald-600" : "text-red-600"}`}>{g.arrows}</span>
              </span>
            ) : null;
          })()}
          {take.outcome_notes && (
            <span className="font-mono text-[10px] tracking-wider text-gray-400 uppercase">
              OUTCOME <span className="font-normal normal-case tracking-normal text-gray-600 italic ml-1">{take.outcome_notes}</span>
            </span>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/takes/${take.take_id}`}
            className="px-3 py-1.5 border border-gray-300 font-mono text-[10px] tracking-wider text-gray-600 hover:border-gray-700 hover:text-gray-900 transition-colors uppercase"
          >
            See Full Context
          </Link>
          <button className="px-3 py-1.5 border border-gray-300 font-mono text-[10px] tracking-wider text-gray-600 hover:border-gray-700 hover:text-gray-900 transition-colors uppercase">
            Share Receipt
          </button>
          {expert && (
            <Link
              href={`/experts/${expert.expert_id}`}
              className="px-3 py-1.5 border border-gray-300 font-mono text-[10px] tracking-wider text-gray-600 hover:border-gray-700 hover:text-gray-900 transition-colors uppercase"
            >
              {expert.name.split(" ")[0]}&apos;s Card →
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
