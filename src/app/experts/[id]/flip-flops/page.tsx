import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { notFound } from "next/navigation";
import Link from "next/link";
import { checkIsAdmin } from "@/lib/auth";
import { getFlipFlops, type FlipFlopRecord } from "@/app/actions/flip-flops";
import RunDetectionButton from "./RunDetectionButton";

export default async function FlipFlopsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const supabase = createAdminClient();
  const { data: expert } = await supabase
    .from("experts")
    .select("expert_id, name, flip_count")
    .eq("expert_id", id)
    .single();

  if (!expert) notFound();

  const clientSupabase = await createClient();
  const {
    data: { user },
  } = await clientSupabase.auth.getUser();
  const isAdmin = user ? await checkIsAdmin() : false;

  let flipFlops: FlipFlopRecord[] = [];
  let tableError = false;
  try {
    flipFlops = await getFlipFlops(id);
  } catch {
    tableError = true;
  }

  return (
    <div className="w-screen relative left-1/2 -translate-x-1/2 -mt-10">

      {/* ── Page header ── */}
      <div className="border-b-2 border-gray-900 bg-white">
        <div className="max-w-5xl mx-auto px-6 py-6">
          <Link
            href={`/experts/${id}`}
            className="font-mono text-[11px] tracking-widest text-gray-400 uppercase hover:text-gray-700 transition-colors"
          >
            ← {expert.name}
          </Link>

          <div className="mt-4 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div>
              <h1
                className="font-black italic leading-none tracking-tighter"
                style={{ fontSize: "clamp(2rem, 6vw, 3.5rem)" }}
              >
                FLIP-FLOP{" "}
                <span style={{ color: "#e2241a" }}>REPORT.</span>
              </h1>
              <p className="mt-2 font-mono text-[11px] tracking-[0.18em] text-gray-400 uppercase">
                {expert.name} ·{" "}
                {tableError
                  ? "table not set up"
                  : `${flipFlops.length} contradiction${flipFlops.length !== 1 ? "s" : ""} on record`}
              </p>
            </div>

            {isAdmin && !tableError && (
              <RunDetectionButton expertId={id} />
            )}
          </div>
        </div>
      </div>

      {/* ── Body ── */}
      <div className="min-h-[60vh]" style={{ backgroundColor: "#ebedf0" }}>
        <div className="max-w-5xl mx-auto px-4 md:px-6 py-8">

          {tableError ? (
            <div className="bg-white border-2 border-gray-200 px-6 py-16 text-center">
              <p className="font-black italic text-2xl text-gray-300">MIGRATION NEEDED.</p>
              <p className="mt-3 italic text-sm text-gray-400 max-w-sm mx-auto">
                Run the <code className="font-mono bg-gray-100 px-1">flip_flops</code> table
                migration in Supabase before using this feature.
              </p>
            </div>
          ) : flipFlops.length === 0 ? (
            <div className="bg-white border-2 border-gray-200 px-6 py-16 text-center">
              <p className="font-black italic text-3xl text-gray-200">NO FLIP-FLOPS YET.</p>
              <p className="mt-3 italic text-gray-400 max-w-sm mx-auto">
                {isAdmin
                  ? "Click \u201cRUN DETECTION\u201d above to scan this analyst\u2019s takes for contradictions."
                  : "No contradictions have been detected for this analyst."}
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {flipFlops.map((ff, i) => (
                <Matchup key={ff.flip_flop_id} ff={ff} index={i} />
              ))}
            </div>
          )}

        </div>
      </div>

    </div>
  );
}

// ── Single matchup card ────────────────────────────────────────────────────────
function Matchup({ ff, index }: { ff: FlipFlopRecord; index: number }) {
  const a = ff.take_a;
  const b = ff.take_b;

  function verdictBadge(status: string) {
    if (status === "confirmed_true")  return { label: "RIGHT",        bg: "#0a7a3b", text: "#fff" };
    if (status === "confirmed_false") return { label: "WRONG",        bg: "#e2241a", text: "#fff" };
    if (status === "partially_true")  return { label: "PARTLY RIGHT", bg: "#d97706", text: "#fff" };
    return                            { label: "PENDING",             bg: "#e5e7eb", text: "#6b7280" };
  }

  const dateA = new Date(a.date_made).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  const dateB = new Date(b.date_made).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  const vA = verdictBadge(a.outcome_status);
  const vB = verdictBadge(b.outcome_status);
  const textA = a.summary?.trim() || a.raw_text?.trim() || "(no text)";
  const textB = b.summary?.trim() || b.raw_text?.trim() || "(no text)";

  return (
    <div className="border-2 border-gray-900 bg-white overflow-hidden">

      {/* Matchup header */}
      <div className="px-5 py-3 border-b-2 border-gray-900 flex items-center gap-3" style={{ backgroundColor: "#1a1a1a" }}>
        <span className="font-mono text-[11px] tracking-widest font-bold" style={{ color: "#e2241a" }}>
          FLIP #{index + 1}
        </span>
        <span className="font-mono text-[10px] tracking-widest text-gray-500 uppercase">
          {dateA} → {dateB}
        </span>
      </div>

      {/* Two takes side by side */}
      <div className="grid grid-cols-1 md:grid-cols-2 divide-y-2 md:divide-y-0 md:divide-x-2 divide-gray-900">

        {/* Take A */}
        <div className="px-5 py-5" style={{ backgroundColor: "#f5f1e8" }}>
          <div className="flex items-center justify-between mb-3 gap-2">
            <div className="flex items-center gap-2">
              <span
                className="font-mono text-[9px] tracking-widest font-bold px-1.5 py-0.5"
                style={{ backgroundColor: "#e2241a", color: "#fff" }}
              >
                TAKE 1
              </span>
              <span className="font-mono text-[10px] tracking-wider text-gray-400 uppercase">{dateA}</span>
            </div>
            <span
              className="font-mono text-[10px] tracking-wider px-2 py-0.5 font-semibold shrink-0"
              style={{ backgroundColor: vA.bg, color: vA.text }}
            >
              {vA.label}
            </span>
          </div>
          <p className="italic text-lg leading-snug text-gray-900">&ldquo;{textA}&rdquo;</p>
        </div>

        {/* Take B */}
        <div className="px-5 py-5 bg-white">
          <div className="flex items-center justify-between mb-3 gap-2">
            <div className="flex items-center gap-2">
              <span
                className="font-mono text-[9px] tracking-widest font-bold px-1.5 py-0.5"
                style={{ backgroundColor: "#1a1a1a", color: "#fff" }}
              >
                TAKE 2
              </span>
              <span className="font-mono text-[10px] tracking-wider text-gray-400 uppercase">{dateB}</span>
            </div>
            <span
              className="font-mono text-[10px] tracking-wider px-2 py-0.5 font-semibold shrink-0"
              style={{ backgroundColor: vB.bg, color: vB.text }}
            >
              {vB.label}
            </span>
          </div>
          <p className="italic text-lg leading-snug text-gray-900">&ldquo;{textB}&rdquo;</p>
        </div>

      </div>

      {/* Contradiction explanation */}
      <div
        className="px-5 py-4 border-t-2 border-gray-900 flex items-start gap-3"
        style={{ backgroundColor: "#1a1a1a" }}
      >
        <span
          className="font-mono text-[10px] tracking-widest font-bold shrink-0 pt-0.5"
          style={{ color: "#e2241a" }}
        >
          ⟲ THE FLIP
        </span>
        <p className="italic text-sm text-gray-300 leading-relaxed">
          {ff.contradiction_summary}
        </p>
      </div>

    </div>
  );
}
