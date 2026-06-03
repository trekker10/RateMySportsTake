import { createAdminClient } from "@/lib/supabase/admin";
import { notFound } from "next/navigation";
import Link from "next/link";
import { expertUrl } from "@/lib/expert-url";

const CATEGORY_LABELS: Record<string, string> = {
  breakout_call: "Breakout Call",
  bust_call:     "Bust Call",
  sleeper_pick:  "Sleeper Pick",
  start_sit:     "Start/Sit",
  waiver_add:    "Waiver Add",
  draft_strategy: "Draft Strategy",
};

function formatCategory(cat: string) {
  return CATEGORY_LABELS[cat] ?? cat.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}

function verdictInfo(status: string, accuracy: number | null) {
  if (status !== "resolved" || accuracy === null)
    return { label: "PENDING", bg: "#e5e7eb", text: "#4b5563" };
  if (accuracy >= 75) return { label: "NAILED IT",           bg: "#0a7a3b", text: "#fff" };
  if (accuracy >= 60) return { label: "MOSTLY RIGHT",        bg: "#15803d", text: "#fff" };
  if (accuracy >= 50) return { label: "DIRECTIONALLY RIGHT", bg: "#d97706", text: "#fff" };
  if (accuracy >= 25) return { label: "HALF RIGHT",          bg: "#ea580c", text: "#fff" };
  if (accuracy > 0)   return { label: "MOSTLY WRONG",        bg: "#dc2626", text: "#fff" };
  return                     { label: "WRONG",               bg: "#991b1b", text: "#fff" };
}

// Pull a t.co URL out of raw_text and return cleaned text + extracted URL
function extractTcoUrl(raw: string): { text: string; tcoUrl: string | null } {
  const match = raw.match(/https?:\/\/t\.co\/\S+/);
  if (!match) return { text: raw, tcoUrl: null };
  return {
    text: raw.replace(match[0], "").replace(/\s{2,}/g, " ").trim(),
    tcoUrl: match[0],
  };
}

export default async function FantasyTakePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = createAdminClient();

  const { data: take } = await supabase
    .from("fantasy_takes")
    .select("*, experts(*)")
    .eq("fantasy_take_id", id)
    .single();

  if (!take) notFound();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const expert = (take as any).experts as ({ expert_id: string; slug?: string | null; name: string; outlet?: string | null } & Record<string, unknown>) | null;

  const dateMade = new Date(take.date_made).toLocaleDateString("en-US", {
    month: "long", day: "numeric", year: "numeric",
  });

  const { text: cleanText, tcoUrl } = extractTcoUrl(take.raw_text ?? "");
  // Prefer explicit source_url; fall back to t.co extracted from text
  const sourceLink = take.source_url ?? tcoUrl;

  const verdict = verdictInfo(take.outcome_status, take.accuracy_score);
  const isResolved = take.outcome_status === "resolved";

  const GREEN = "#15803d";

  return (
    <div className="max-w-2xl mx-auto py-10 px-4 space-y-5">

      {/* Back link */}
      {expert && (
        <Link
          href={expertUrl(expert)}
          className="inline-flex items-center gap-1.5 font-mono text-[11px] tracking-widest uppercase text-gray-400 hover:text-gray-700 transition-colors"
        >
          ← {expert.name}
        </Link>
      )}

      {/* Expert + category header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          {expert && (
            <Link href={expertUrl(expert)} className="font-black text-2xl italic tracking-tight hover:underline" style={{ color: GREEN }}>
              {expert.name}
            </Link>
          )}
          {expert?.outlet && (
            <p className="text-sm text-gray-500 mt-0.5">{expert.outlet}</p>
          )}
        </div>
        <span
          className="rounded-full px-3 py-1 text-xs font-bold text-white shrink-0"
          style={{ backgroundColor: GREEN }}
        >
          {formatCategory(take.category)}
        </span>
      </div>

      {/* The Take */}
      <div className="border-2 border-gray-900 overflow-hidden">
        <div className="px-6 py-5" style={{ backgroundColor: "#f5f1e9" }}>
          {take.player_name && (
            <p className="font-black text-sm uppercase tracking-widest mb-2" style={{ color: GREEN }}>
              {take.player_name}
              {take.player_position ? ` · ${take.player_position}` : ""}
              {take.player_adp != null ? ` · ADP ${take.player_adp}` : ""}
            </p>
          )}
          <p className="text-xl leading-relaxed text-gray-800 italic">
            &ldquo;{cleanText}&rdquo;
          </p>
        </div>
        <div className="px-6 py-3 border-t border-gray-200 flex flex-wrap items-center gap-3 text-xs font-mono text-gray-400">
          <span>{dateMade}</span>
          {take.sport_season && <><span>·</span><span>{take.sport_season}</span></>}
          {take.timing_window && <><span>·</span><span className="capitalize">{take.timing_window.replace(/_/g, " ")}</span></>}
          {take.boldness_score != null && <><span>·</span><span>Boldness {take.boldness_score}/100</span></>}
          {take.resolution_date && <><span>·</span><span>Resolves {take.resolution_date}</span></>}
        </div>
      </div>

      {/* Source link */}
      {sourceLink && (
        <a
          href={sourceLink}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 border-2 border-gray-200 bg-white px-5 py-3.5 hover:border-green-400 hover:bg-green-50 transition-colors group"
        >
          <span className="text-xl">🐦</span>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-mono font-semibold uppercase tracking-widest text-gray-400 mb-0.5">Original Tweet</p>
            <p className="text-sm truncate" style={{ color: GREEN }}>{sourceLink}</p>
          </div>
          <span className="text-gray-400 group-hover:text-green-600 text-lg shrink-0">↗</span>
        </a>
      )}

      {/* What makes this true */}
      {take.grading_criteria && (
        <div className="border-2 border-gray-900 bg-white p-5">
          <p className="font-mono text-[10px] tracking-widest uppercase text-gray-400 mb-2">What Would Make This True</p>
          <p className="text-gray-800 leading-relaxed">{take.grading_criteria}</p>
        </div>
      )}

      {/* Scores row */}
      <div className="grid grid-cols-2 gap-4">
        <div className="border-2 border-gray-900 bg-white p-5 text-center">
          <p className="font-black text-3xl" style={{ color: take.boldness_score != null ? GREEN : "#9ca3af" }}>
            {take.boldness_score != null ? take.boldness_score : "—"}
          </p>
          <p className="font-mono text-[10px] tracking-widest uppercase text-gray-400 mt-1">Boldness</p>
        </div>
        <div className="border-2 border-gray-900 bg-white p-5 text-center">
          {isResolved && take.accuracy_score != null ? (
            <p className="font-black text-3xl" style={{ color: verdict.bg }}>
              {take.accuracy_score}
              <span className="text-base font-normal text-gray-400">/100</span>
            </p>
          ) : (
            <p className="font-black text-3xl text-gray-300">—</p>
          )}
          <p className="font-mono text-[10px] tracking-widest uppercase text-gray-400 mt-1">Accuracy</p>
        </div>
      </div>

      {/* Verdict + grader note */}
      <div className="border-2 border-gray-900 bg-white overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-200 flex items-center justify-between">
          <p className="font-mono text-[10px] tracking-widest uppercase text-gray-400">Verdict</p>
          <span
            className="font-mono text-[10px] tracking-wider px-3 py-1 font-bold"
            style={{ backgroundColor: verdict.bg, color: verdict.text }}
          >
            {verdict.label}
          </span>
        </div>
        {take.grader_note ? (
          <p className="px-5 py-4 text-gray-700 leading-relaxed">{take.grader_note}</p>
        ) : (
          <p className="px-5 py-4 text-sm italic text-gray-400">
            {isResolved ? "No grader note added." : "This take hasn't been graded yet."}
          </p>
        )}
      </div>

    </div>
  );
}
