import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import EditableGradingCriteria from "./EditableGradingCriteria";
import ShareReceiptButton from "@/components/ShareReceiptButton";
import { expertUrl } from "@/lib/expert-url";
import { getTakeScoreConfig } from "@/app/actions/takescore";
import { scoreToGrade } from "@/lib/takescore";

const INK    = "#15201a";
const CREAM  = "#f5f1e8";
const PAPER  = "#eceef1";
const ACCENT = "#e2241a";
const GOOD   = "#0a7a3b";
const MID    = "#c8841a";
const BAD    = "#c43a1d";
const FAINT  = "#8a8a82";
const SOFT   = "#3a4239";

function verdictColor(status: string) {
  if (status === "confirmed_true")  return GOOD;
  if (status === "confirmed_false") return BAD;
  if (status === "partially_true")  return MID;
  return FAINT;
}

function verdictLabel(status: string) {
  if (status === "confirmed_true")  return "CONFIRMED TRUE";
  if (status === "confirmed_false") return "CONFIRMED FALSE";
  if (status === "partially_true")  return "PARTIALLY TRUE";
  if (status === "unresolvable")    return "UNRESOLVABLE";
  return "PENDING";
}

function gradeColor(letter: string) {
  if (letter === "A")  return GOOD;
  if (letter === "B+") return "#15803d";
  if (letter === "B")  return "#16a34a";
  if (letter === "B−") return "#22c55e";
  if (letter === "C+") return "#ca8a04";
  if (letter === "C")  return "#d97706";
  if (letter === "C−") return "#f59e0b";
  if (letter === "D")  return "#ea580c";
  return BAD;
}

function initials(name: string) {
  return name.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase();
}

export default async function TakePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: take }, gradeConfig] = await Promise.all([
    supabase.from("takes").select("*, experts(*)").eq("take_id", id).single(),
    getTakeScoreConfig(),
  ]);

  if (!take) notFound();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const expert = (take as any).experts;

  const sourceLabel = (take.source_type ?? "").replace(/_/g, " ").toUpperCase();

  const fmtShort = (iso: string) =>
    new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }).toUpperCase();

  const dateMade = fmtShort(take.date_made);
  const resDate  = take.time_horizon_date ? fmtShort(take.time_horizon_date) : null;
  const isGraded = take.outcome_status !== "pending";

  const letterGrade = take.grade != null ? scoreToGrade(take.grade, gradeConfig) : null;
  const gc = letterGrade ? gradeColor(letterGrade) : FAINT;
  const vc = verdictColor(take.outcome_status);

  const displayText = (take.raw_text ?? take.summary ?? "")
    .replace(/^RT @\w+:\s*/i, "")
    .replace(/\s*https?:\/\/t\.co\/\S+/g, "")
    .trim();

  return (
    <>
      <style>{`
        .td-crumb { display:flex;align-items:center;gap:10px;font-family:'JetBrains Mono',monospace;
          font-size:11px;letter-spacing:.16em;color:${FAINT};margin-bottom:24px;flex-wrap:wrap; }
        .td-crumb a { text-decoration:none;color:${FAINT};display:inline-flex;align-items:center;gap:6px; }
        .td-crumb a:hover { color:${ACCENT}; }
        .td-crumb .sep { opacity:.5; }

        .td-byline { display:flex;align-items:center;gap:18px;margin-bottom:22px;flex-wrap:wrap; }
        .td-av { width:60px;height:60px;border-radius:50%;background:#d9dce1;flex:none;display:flex;
          align-items:center;justify-content:center;font-family:'Archivo Black',sans-serif;
          font-size:20px;color:${SOFT};border:2px solid ${INK};overflow:hidden; }
        .td-av img { width:100%;height:100%;object-fit:cover; }
        .td-who { flex:1;min-width:0; }
        .td-name { font-family:'Archivo Black',sans-serif;font-size:28px;letter-spacing:-.03em;line-height:1; }
        .td-meta { display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-top:8px;
          font-family:'JetBrains Mono',monospace;font-size:11px;letter-spacing:.08em;color:${SOFT}; }
        .td-meta .pip { width:4px;height:4px;background:${FAINT};border-radius:50%; }
        .td-meta .src { display:inline-flex;align-items:center;padding:3px 9px;
          border:1.5px solid ${INK};text-transform:uppercase;font-weight:700;letter-spacing:.12em; }
        .td-meta .league { color:${ACCENT};font-weight:700; }
        .td-view-btn { flex:none;border:2px solid ${INK};background:#fff;padding:10px 16px;
          font-family:'JetBrains Mono',monospace;font-weight:700;font-size:11px;letter-spacing:.1em;
          text-decoration:none;color:${INK};display:inline-flex;align-items:center;
          box-shadow:3px 3px 0 ${INK};transition:transform .1s ease,box-shadow .1s ease; }
        .td-view-btn:hover { transform:translate(-2px,-2px);box-shadow:5px 5px 0 ${INK}; }

        .td-take { position:relative;background:${CREAM};border:2px solid ${INK};
          box-shadow:8px 8px 0 ${INK};padding:40px 40px 28px;margin-bottom:16px; }
        .td-qmark { position:absolute;top:4px;left:20px;font-family:'Archivo Black',sans-serif;
          font-size:110px;line-height:1;color:${ACCENT};opacity:.14;pointer-events:none;user-select:none; }
        .td-take-lab { font-family:'JetBrains Mono',monospace;font-size:11px;letter-spacing:.22em;
          color:${FAINT};margin-bottom:16px;position:relative; }
        .td-quote { position:relative;font-family:'Archivo Black',sans-serif;font-size:28px;line-height:1.2;
          letter-spacing:-.02em; }
        .td-srcbar { display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap;
          margin-top:22px;padding-top:16px;border-top:1.5px dashed ${INK};position:relative; }
        .td-src-link { display:inline-flex;align-items:center;gap:8px;text-decoration:none;
          font-family:'JetBrains Mono',monospace;font-weight:700;font-size:11px;letter-spacing:.1em;color:${INK}; }
        .td-src-link:hover { color:${ACCENT}; }
        .td-src-url { font-family:'JetBrains Mono',monospace;font-size:10px;color:${FAINT};
          overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:300px; }

        .td-verdict-banner { display:flex;align-items:stretch;border:2px solid ${INK};
          box-shadow:6px 6px 0 ${INK};margin:28px 0 0;background:#fff; }
        .td-vb-grade { flex:none;width:110px;display:flex;flex-direction:column;align-items:center;
          justify-content:center;gap:4px;color:#fff;border-right:2px solid ${INK}; }
        .td-vb-grade .num { font-family:'Archivo Black',sans-serif;font-size:44px;line-height:.9;letter-spacing:-.03em; }
        .td-vb-grade .lab { font-family:'JetBrains Mono',monospace;font-size:9px;letter-spacing:.16em; }
        .td-vb-body { flex:1;display:flex;align-items:center;justify-content:space-between;gap:16px;
          padding:18px 22px;flex-wrap:wrap; }
        .td-vb-verdict { font-family:'Archivo Black',sans-serif;font-size:26px;letter-spacing:-.02em; }
        .td-vb-sub { font-family:'JetBrains Mono',monospace;font-size:11px;letter-spacing:.06em;
          color:${SOFT};text-align:right;max-width:220px;line-height:1.5; }
        .td-vb-sub b { color:${INK}; }

        .td-scores { display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-top:16px; }
        .td-score { background:#fff;border:2px solid ${INK};padding:18px 20px; }
        .td-score .lab { font-family:'JetBrains Mono',monospace;font-size:10px;letter-spacing:.16em;color:${FAINT}; }
        .td-score .val { font-family:'Archivo Black',sans-serif;font-size:36px;letter-spacing:-.03em;line-height:1;
          margin-top:8px;display:flex;align-items:baseline;gap:4px; }
        .td-score .val .den { font-size:13px;color:${FAINT};font-family:'JetBrains Mono',monospace;letter-spacing:0; }
        .td-score .meter { height:6px;background:${PAPER};border:1.5px solid ${INK};margin-top:12px;overflow:hidden; }
        .td-score .meter i { display:block;height:100%;background:${INK}; }

        .td-block { background:#fff;border:2px solid ${INK};padding:24px 26px;margin-top:16px; }
        .td-block.summary { background:#fbfaf6; }
        .td-sec-lab { font-family:'JetBrains Mono',monospace;font-size:11px;letter-spacing:.22em;color:${FAINT};margin:0 0 14px; }
        .td-summary-body { font-size:18px;line-height:1.5;color:${SOFT};font-style:italic; }

        .td-crit { display:grid;grid-template-columns:1fr 1fr;gap:12px; }
        .td-cond { border:2px solid ${INK};padding:14px 16px; }
        .td-cond .tf { font-family:'Archivo Black',sans-serif;font-size:14px;letter-spacing:.04em;
          margin-bottom:8px;display:inline-block;padding:2px 9px;color:#fff; }
        .td-cond .txt { font-size:14px;line-height:1.55;color:${SOFT}; }

        .td-flags { display:flex;gap:8px;flex-wrap:wrap;margin-top:14px; }
        .td-flag { font-family:'JetBrains Mono',monospace;font-weight:600;font-size:10px;letter-spacing:.08em;
          background:${PAPER};border:1.5px solid ${INK};padding:5px 11px;text-transform:uppercase; }

        .td-outcome { border-color:${INK}; }
        .td-outcome-head { display:flex;align-items:center;justify-content:space-between;gap:14px;margin-bottom:14px; }
        .td-verdict-tag { font-family:'JetBrains Mono',monospace;font-weight:800;font-size:11px;letter-spacing:.12em;
          color:#fff;padding:5px 12px;display:inline-flex;align-items:center;gap:7px; }
        .td-outcome-body { font-size:16px;line-height:1.65;color:${SOFT}; }

        .td-foot { display:flex;gap:12px;margin-top:24px;flex-wrap:wrap; }
        .td-btn { flex:1;min-width:160px;border:2px solid ${INK};font-family:'JetBrains Mono',monospace;
          font-weight:800;font-size:13px;letter-spacing:.1em;padding:15px 14px;text-align:center;
          display:inline-flex;align-items:center;justify-content:center;gap:10px;text-decoration:none;cursor:pointer;
          transition:transform .1s ease,box-shadow .1s ease; }
        .td-btn-share { background:${ACCENT};color:#fff;border-color:${ACCENT};box-shadow:4px 4px 0 rgba(21,32,26,.22); }
        .td-btn-share:hover { transform:translate(-2px,-2px);box-shadow:6px 6px 0 ${INK}; }
        .td-btn-ink { background:${INK};color:#fff;box-shadow:4px 4px 0 rgba(21,32,26,.22); }
        .td-btn-ink:hover { transform:translate(-2px,-2px);box-shadow:6px 6px 0 ${INK}; }
        .td-btn-ghost { background:#fff;color:${INK};box-shadow:4px 4px 0 rgba(21,32,26,.12); }
        .td-btn-ghost:hover { transform:translate(-2px,-2px);box-shadow:6px 6px 0 ${INK}; }

        @media(max-width:680px){
          .td-take { padding:28px 22px 22px; }
          .td-quote { font-size:20px; }
          .td-scores { grid-template-columns:1fr; }
          .td-crit { grid-template-columns:1fr; }
          .td-verdict-banner { flex-direction:column; }
          .td-vb-grade { width:100%;flex-direction:row;gap:12px;border-right:none;border-bottom:2px solid ${INK};padding:12px 18px; }
          .td-vb-sub { text-align:left; }
          .td-view-btn { display:none; }
        }
      `}</style>

      <div style={{ maxWidth: 940, margin: "0 auto" }}>

        {/* Breadcrumb */}
        <nav className="td-crumb">
          <Link href="/experts?view=takes">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
            ALL TAKES
          </Link>
          {expert && (
            <>
              <span className="sep">/</span>
              <Link href={expertUrl(expert)}>{expert.name.toUpperCase()}</Link>
            </>
          )}
          <span className="sep">/</span>
          <span style={{ color: INK }}>TAKE RECEIPT</span>
        </nav>

        {/* Analyst byline */}
        {expert && (
          <div className="td-byline">
            <div className="td-av">
              {expert.avatar_url
                ? <img src={expert.avatar_url} alt={expert.name} />
                : initials(expert.name)}
            </div>
            <div className="td-who">
              <div className="td-name">{expert.name}</div>
              <div className="td-meta">
                {take.source_type && <span className="src">{sourceLabel}</span>}
                {take.source_type && <span className="pip" />}
                <span>{dateMade}</span>
                {take.sport && <><span className="pip" /><span className="league">{take.sport}</span></>}
                {expert.outlet && <><span className="pip" /><span>{expert.outlet.toUpperCase()}</span></>}
              </div>
            </div>
            <Link href={expertUrl(expert)} className="td-view-btn">VIEW ANALYST →</Link>
          </div>
        )}

        {/* The Take */}
        <section className="td-take">
          <span className="td-qmark">&ldquo;</span>
          <div className="td-take-lab">THE TAKE</div>
          <div className="td-quote">{displayText}</div>
          {take.source_url && (
            <div className="td-srcbar">
              <a className="td-src-link" href={take.source_url} target="_blank" rel="noopener noreferrer">
                VIEW ORIGINAL SOURCE
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M7 17L17 7M9 7h8v8"/></svg>
              </a>
              <span className="td-src-url">{take.source_url.replace(/^https?:\/\//, "")}</span>
            </div>
          )}
        </section>

        {/* Verdict banner */}
        {isGraded && (
          <section className="td-verdict-banner">
            <div className="td-vb-grade" style={{ background: gc }}>
              <span className="num">{letterGrade ?? "—"}</span>
              <span className="lab">GRADE</span>
            </div>
            <div className="td-vb-body">
              <div className="td-vb-verdict" style={{ color: vc }}>
                {verdictLabel(take.outcome_status)}
              </div>
              <div className="td-vb-sub">
                {resDate ? <>Resolved <b>{resDate}</b></> : "Resolution pending"}
              </div>
            </div>
          </section>
        )}

        {/* Scores */}
        {take.rating_status === "rated" && (
          <div className="td-scores">
            <div className="td-score" style={{ borderColor: ACCENT }}>
              <div className="lab">BOLDNESS</div>
              {take.boldness_score != null ? (
                <>
                  <div className="val" style={{ color: ACCENT }}>
                    {take.boldness_score}<span className="den">/100</span>
                  </div>
                  <div className="meter"><i style={{ width: `${take.boldness_score}%`, background: ACCENT }} /></div>
                </>
              ) : <div className="val" style={{ color: FAINT, fontSize: 18 }}>—</div>}
            </div>
            <div className="td-score">
              <div className="lab">GRADE</div>
              {take.grade != null ? (
                <>
                  <div className="val">{Math.round(take.grade)}<span className="den">/100</span></div>
                  <div className="meter"><i style={{ width: `${take.grade}%` }} /></div>
                </>
              ) : <div className="val" style={{ color: FAINT, fontSize: 18 }}>—</div>}
            </div>
            <div className="td-score">
              <div className="lab">IMPACT</div>
              {take.impact_score != null ? (
                <>
                  <div className="val">{take.impact_score.toFixed(1)}</div>
                  <div className="meter"><i style={{ width: `${Math.min(100, take.impact_score)}%` }} /></div>
                </>
              ) : <div className="val" style={{ color: FAINT, fontSize: 18 }}>—</div>}
            </div>
          </div>
        )}

        {/* AI Summary */}
        {take.summary && (
          <div className="td-block summary" style={{ marginTop: 16 }}>
            <div className="td-sec-lab">AI SUMMARY</div>
            <div className="td-summary-body">{take.summary}</div>
          </div>
        )}

        {/* Grading Criteria */}
        {take.grading_criteria && (
          <div className="td-block" style={{ marginTop: 16 }}>
            <div className="td-sec-lab">GRADING CRITERIA</div>
            <EditableGradingCriteria takeId={take.take_id} initial={take.grading_criteria} />
          </div>
        )}

        {/* Flags */}
        {take.flags && take.flags.length > 0 && (
          <div className="td-flags" style={{ marginTop: 16 }}>
            {take.flags.map((flag: string) => (
              <span key={flag} className="td-flag">{flag.replace(/_/g, " ")}</span>
            ))}
          </div>
        )}

        {/* Outcome */}
        {isGraded && take.outcome_notes && (
          <div className="td-block td-outcome" style={{ marginTop: 16 }}>
            <div className="td-outcome-head">
              <div className="td-sec-lab" style={{ margin: 0 }}>OUTCOME</div>
              <span className="td-verdict-tag" style={{ background: vc }}>
                <span style={{ width: 7, height: 7, background: "#fff", borderRadius: "50%", flexShrink: 0 }} />
                {verdictLabel(take.outcome_status)}
              </span>
            </div>
            <div className="td-outcome-body">{take.outcome_notes}</div>
          </div>
        )}

        {/* Pending state */}
        {!isGraded && (
          <div className="td-block" style={{ textAlign: "center", color: FAINT, fontStyle: "italic", marginTop: 16 }}>
            This take hasn&apos;t been graded yet.
            {resDate && <> Resolution expected <strong style={{ color: INK }}>{resDate}</strong>.</>}
          </div>
        )}

        {/* Footer actions */}
        <div className="td-foot">
          <ShareReceiptButton takeId={take.take_id} className="td-btn td-btn-share">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.6" y1="10.5" x2="15.4" y2="6.5"/><line x1="8.6" y1="13.5" x2="15.4" y2="17.5"/></svg>
            SHARE RECEIPT
          </ShareReceiptButton>
          {expert && (
            <Link href={expertUrl(expert)} className="td-btn td-btn-ink">
              VIEW {expert.name.split(" ")[0].toUpperCase()}&apos;S RECORD
            </Link>
          )}
          {take.source_url && (
            <a href={take.source_url} target="_blank" rel="noopener noreferrer" className="td-btn td-btn-ghost">
              ORIGINAL SOURCE ↗
            </a>
          )}
        </div>

      </div>
    </>
  );
}
