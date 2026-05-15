import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";

const SCORE_LABELS: Record<string, string> = {
  difficulty_score: "Difficulty",
  falsifiability_score: "Falsifiability",
  confidence_claimed: "Confidence Claimed",
};

export default async function TakePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: take } = await supabase
    .from("takes")
    .select("*, experts(*)")
    .eq("take_id", id)
    .single();

  if (!take) notFound();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const expert = (take as any).experts;

  const sourceLabel = take.source_type.replace("_", " ");
  const dateMade = new Date(take.date_made).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div className="max-w-2xl mx-auto space-y-6">

      {/* Expert */}
      <div>
        <p className="text-lg font-semibold">{expert?.name}</p>
        {expert?.outlet && (
          <p className="text-sm text-zinc-500">{expert.outlet}</p>
        )}
      </div>

      {/* The take */}
      <blockquote className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
        <p className="text-lg leading-relaxed">"{take.raw_text}"</p>
        <footer className="mt-4 flex flex-wrap items-center gap-2 text-sm text-zinc-500">
          <span className="capitalize">{sourceLabel}</span>
          <span>·</span>
          <span>{dateMade}</span>
          {take.sport && (
            <>
              <span>·</span>
              <span>{take.sport}</span>
            </>
          )}
          {take.source_url && (
            <>
              <span>·</span>
              <a
                href={take.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-emerald-500 hover:underline"
              >
                Source ↗
              </a>
            </>
          )}
        </footer>
      </blockquote>

      {/* AI rating */}
      {take.rating_status === "rated" && (
        <>
          {take.summary && (
            <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
              <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500 mb-2">
                AI Summary
              </p>
              <p className="text-zinc-300">{take.summary}</p>
            </div>
          )}

          <div className="grid grid-cols-3 gap-4">
            {(["difficulty_score", "falsifiability_score", "confidence_claimed"] as const).map(
              (key) => (
                <div
                  key={key}
                  className="rounded-xl border border-zinc-800 bg-zinc-900 p-4 text-center"
                >
                  <p className="text-3xl font-bold text-emerald-400">
                    {take[key] ?? "—"}
                    <span className="text-sm text-zinc-600">/10</span>
                  </p>
                  <p className="mt-1 text-xs text-zinc-500">{SCORE_LABELS[key]}</p>
                </div>
              )
            )}
          </div>

          {take.grading_criteria && (
            <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
              <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500 mb-2">
                Grading Criteria
              </p>
              <p className="text-zinc-300">{take.grading_criteria}</p>
            </div>
          )}

          {take.flags && take.flags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {take.flags.map((flag: string) => (
                <span
                  key={flag}
                  className="rounded-full bg-zinc-800 px-3 py-1 text-xs text-zinc-400 capitalize"
                >
                  {flag.replace(/_/g, " ")}
                </span>
              ))}
            </div>
          )}
        </>
      )}

      {take.rating_status === "pending" && (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6 text-center text-zinc-500">
          AI rating in progress…
        </div>
      )}

      {take.rating_status === "failed" && (
        <div className="rounded-xl border border-amber-900/40 bg-amber-950/20 p-6 text-center text-amber-400">
          AI rating failed — the take was saved and will be retried.
        </div>
      )}

      {/* Outcome badge */}
      {take.outcome_status !== "pending" && (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500 mb-2">
            Outcome
          </p>
          <p className="capitalize text-zinc-300">
            {take.outcome_status.replace(/_/g, " ")}
          </p>
          {take.outcome_notes && (
            <p className="mt-2 text-sm text-zinc-500">{take.outcome_notes}</p>
          )}
        </div>
      )}
    </div>
  );
}
