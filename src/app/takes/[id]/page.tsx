import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import EditableGradingCriteria from "./EditableGradingCriteria";


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
    month: "long", day: "numeric", year: "numeric",
  });

  return (
    <div className="max-w-2xl mx-auto space-y-6">

      {/* Expert */}
      <div>
        <p className="text-lg font-semibold text-gray-900">{expert?.name}</p>
        {expert?.outlet && (
          <p className="text-sm text-gray-500">{expert.outlet}</p>
        )}
      </div>

      {/* The take */}
      <blockquote className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <p className="text-lg leading-relaxed text-gray-800">"{take.raw_text}"</p>
        <footer className="mt-4 flex flex-wrap items-center gap-2 text-sm text-gray-400">
          <span className="capitalize">{sourceLabel}</span>
          <span>·</span>
          <span>{dateMade}</span>
          {take.sport && (
            <>
              <span>·</span>
              <span>{take.sport}</span>
            </>
          )}
        </footer>
      </blockquote>

      {/* Source link */}
      {take.source_url && (
        <a
          href={take.source_url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-5 py-3.5 shadow-sm hover:border-emerald-400 hover:bg-emerald-50 transition-colors group"
        >
          <span className="text-xl">🔗</span>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-0.5">Original Source</p>
            <p className="text-sm text-emerald-600 group-hover:text-emerald-700 truncate">{take.source_url}</p>
          </div>
          <span className="text-gray-400 group-hover:text-emerald-600 text-lg shrink-0">↗</span>
        </a>
      )}

      {/* AI rating */}
      {take.rating_status === "rated" && (
        <>
          {take.summary && (
            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-2">
                AI Summary
              </p>
              <p className="text-gray-700">{take.summary}</p>
            </div>
          )}

          <div className="grid grid-cols-3 gap-4">
            {[
              { label: "Boldness", val: take.boldness_score != null ? `${take.boldness_score}` : null, suffix: "/100" },
              { label: "Grade",    val: take.grade          != null ? `${Math.round(take.grade)}` : null, suffix: "/100" },
              { label: "Impact",   val: take.impact_score   != null ? take.impact_score.toFixed(1) : null, suffix: "" },
            ].map(({ label, val, suffix }) => (
              <div key={label} className="rounded-xl border border-gray-200 bg-white p-4 text-center shadow-sm">
                {val != null ? (
                  <p className="text-3xl font-bold text-emerald-600">
                    {val}<span className="text-base font-normal text-gray-400">{suffix}</span>
                  </p>
                ) : (
                  <p className="text-sm text-gray-400 italic mt-2">Pending</p>
                )}
                <p className="mt-1 text-xs text-gray-500">{label}</p>
              </div>
            ))}
          </div>

          {take.grading_criteria && (
            <EditableGradingCriteria takeId={take.take_id} initial={take.grading_criteria} />
          )}

          {take.flags && take.flags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {take.flags.map((flag: string) => (
                <span key={flag} className="rounded-full bg-gray-100 border border-gray-200 px-3 py-1 text-xs text-gray-600 capitalize">
                  {flag.replace(/_/g, " ")}
                </span>
              ))}
            </div>
          )}
        </>
      )}

      {take.rating_status === "pending" && (
        <div className="rounded-xl border border-gray-200 bg-white p-6 text-center text-gray-400 shadow-sm">
          AI rating in progress…
        </div>
      )}

      {take.rating_status === "failed" && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-center text-amber-600">
          AI rating failed — the take was saved and will be retried.
        </div>
      )}

      {/* Outcome */}
      {take.outcome_status !== "pending" && (
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-2">
            Outcome
          </p>
          <p className="capitalize text-gray-800">
            {take.outcome_status.replace(/_/g, " ")}
          </p>
          {take.outcome_notes && (
            <p className="mt-2 text-sm text-gray-500">{take.outcome_notes}</p>
          )}
        </div>
      )}
    </div>
  );
}
