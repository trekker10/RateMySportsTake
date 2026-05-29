"use client";

import { useState, useTransition, useRef } from "react";
import { submitTake, submitFantasyTake } from "@/app/actions/takes";
import { fetchTweetData, type TweetData } from "@/app/actions/tweets";
import { analyzeFantasyTakeAction, type FantasyAutoFillResult } from "@/app/actions/analyze-fantasy";

const SPORTS = [
  "NBA", "NFL", "MLB", "NHL", "Soccer",
  "College Football", "College Basketball", "MMA", "Golf", "Tennis", "Other",
];

const FANTASY_CATEGORIES = [
  { value: "breakout_call", label: "Breakout Call",   desc: "Season-long prediction a player outperforms their ADP by at least one tier" },
  { value: "bust_call",     label: "Bust Call",       desc: "Top pick underperforms — rounds 1-2 player finishes outside top 24 at position" },
  { value: "sleeper_pick",  label: "Sleeper Pick",    desc: "Late-round/undrafted player emerges as a top-20 option at their position" },
  { value: "start_sit",     label: "Start / Sit",     desc: "Weekly prediction to start or sit a player (top-12 to hit, outside-20 to sit)" },
  { value: "waiver_add",    label: "Waiver Wire Add", desc: "Sub-30%-owned player becomes a top-20 scorer at their position that week" },
];

const TIMING_WINDOWS = [
  { value: "post_draft",   label: "Post-Draft",   desc: "Right after or during the draft" },
  { value: "preseason",    label: "Preseason",    desc: "NFL preseason (August)" },
  { value: "early_season", label: "Early Season", desc: "Weeks 1–6" },
  { value: "midseason",    label: "Midseason",    desc: "Weeks 7–11" },
  { value: "late_season",  label: "Late Season",  desc: "Weeks 12–17" },
  { value: "playoffs",     label: "Playoffs",     desc: "Fantasy playoff weeks (14+)" },
];

type TakeType   = "analyst" | "fantasy";
type LeagueFormat = "dynasty" | "redraft" | "both";

const inputClass =
  "w-full rounded-lg bg-white border border-gray-300 px-4 py-2.5 text-gray-900 placeholder-gray-400 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none";
const selectClass =
  "w-full rounded-lg bg-white border border-gray-300 px-4 py-2.5 text-gray-900 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none";

export default function SubmitForm() {
  const [step, setStep]           = useState<"url" | "review">("url");
  const [takeType, setTakeType]   = useState<TakeType>("analyst");
  const [outlet, setOutlet]       = useState("");
  const [tweetUrl, setTweetUrl]   = useState("");
  const [prefilled, setPrefilled] = useState<TweetData | null>(null);
  const [fetchError, setFetchError]   = useState<string | null>(null);
  const [isFetching, startFetch]      = useTransition();
  const [isSubmitting, startSubmit]   = useTransition();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isAnalyzing, startAnalyze]   = useTransition();
  const [dateOverride, setDateOverride] = useState(false);

  // Fantasy-specific state
  const [leagueFormat, setLeagueFormat] = useState<LeagueFormat>("both");
  const [autoFill, setAutoFill]           = useState<FantasyAutoFillResult | null>(null);
  const [analyzeError, setAnalyzeError]   = useState<string | null>(null);

  // Controlled fantasy fields (pre-filled by AI or edited by user)
  const [fantasyCategory, setFantasyCategory] = useState("breakout_call");
  const [timingWindow, setTimingWindow]       = useState("");
  const [playerName, setPlayerName]           = useState("");
  const [playerPosition, setPlayerPosition]   = useState("");
  const [playerAdp, setPlayerAdp]             = useState("");
  const [boldnessScore, setBoldnessScore]     = useState("");
  const [sportSeason, setSportSeason]         = useState("2026 NFL");
  const [resolutionDate, setResolutionDate]   = useState("");

  function handleTakeTypeChange(next: TakeType) {
    setTakeType(next);
    if (next === "fantasy" && outlet === "") setOutlet("Fantasy Football");
    if (next === "analyst" && outlet === "Fantasy Football") setOutlet("");
  }

  function handleFetch(e: React.FormEvent) {
    e.preventDefault();
    setFetchError(null);
    startFetch(async () => {
      try {
        const data = await fetchTweetData(tweetUrl);
        setPrefilled(data);
        setStep("review");
      } catch (err) {
        setFetchError(err instanceof Error ? err.message : "Couldn't fetch that tweet.");
      }
    });
  }

  function handleAnalyze() {
    if (!prefilled?.rawText) return;
    setAnalyzeError(null);
    startAnalyze(async () => {
      const result = await analyzeFantasyTakeAction(
        prefilled.rawText,
        prefilled.dateMade ?? new Date().toISOString().split("T")[0],
      );
      if (!result.success) {
        setAnalyzeError(result.error);
        return;
      }
      const d = result.data;
      setAutoFill(d);
      setFantasyCategory(d.category);
      setTimingWindow(d.timing_window);
      setPlayerName(d.player_name ?? "");
      setPlayerPosition(d.player_position ?? "");
      setPlayerAdp(d.player_adp != null ? String(d.player_adp) : "");
      setBoldnessScore(String(d.boldness_score));
      setSportSeason(d.sport_season);
      setResolutionDate(d.resolution_date);
      setLeagueFormat(d.format);
    });
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitError(null);
    const formData = new FormData(e.currentTarget);
    startSubmit(async () => {
      try {
        if (takeType === "fantasy") {
          await submitFantasyTake(formData);
        } else {
          await submitTake(formData);
        }
      } catch (err) {
        // redirect() throws a special Next.js error — let it propagate
        if (err instanceof Error && err.message.includes("NEXT_REDIRECT")) throw err;
        setSubmitError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      }
    });
  }

  // ── Step 1 ───────────────────────────────────────────────────────────────────
  if (step === "url") {
    return (
      <div className="max-w-xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Submit a Take</h1>
          <p className="mt-2 text-zinc-400">Paste an X.com tweet URL and we'll pull the quote automatically.</p>
        </div>

        {/* Take type toggle */}
        <TakeTypeToggle value={takeType} onChange={handleTakeTypeChange} />

        <form onSubmit={handleFetch} className="space-y-4 mt-6">
          <div>
            <label htmlFor="tweet_url" className="block text-sm font-medium text-zinc-300 mb-1">
              X.com tweet URL <span className="text-emerald-400">*</span>
            </label>
            <input
              id="tweet_url" type="url" required value={tweetUrl}
              onChange={(e) => setTweetUrl(e.target.value)}
              placeholder="https://x.com/username/status/..."
              className={inputClass}
            />
          </div>
          {fetchError && <p className="text-sm text-red-400">{fetchError}</p>}
          <button
            type="submit" disabled={isFetching}
            className="w-full rounded-lg px-6 py-3.5 font-semibold disabled:opacity-50 transition-colors text-white"
            style={{ backgroundColor: takeType === "fantasy" ? "#15803d" : "#10b981", color: takeType === "fantasy" ? "white" : "black" }}
          >
            {isFetching ? "Fetching tweet…" : "Fetch Tweet →"}
          </button>
        </form>
      </div>
    );
  }

  // ── Step 2: Review ───────────────────────────────────────────────────────────
  const rawText = prefilled?.rawText ?? "";
  const dateMade = prefilled?.dateMade ?? new Date().toISOString().split("T")[0];

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6 flex items-center gap-4">
        <button onClick={() => setStep("url")} className="text-zinc-500 hover:text-zinc-300 text-sm transition-colors">
          ← Back
        </button>
        <div>
          <h1 className="text-3xl font-bold">Review Take</h1>
          <p className="mt-1 text-zinc-400 text-sm">
            {takeType === "fantasy"
              ? "AI will auto-fill the fantasy details — review and adjust before submitting."
              : "Confirm the details then hit submit — Claude will rate it automatically."}
          </p>
        </div>
      </div>

      {/* Take type toggle */}
      <TakeTypeToggle value={takeType} onChange={handleTakeTypeChange} />

      <form onSubmit={handleSubmit} className="space-y-8 mt-6">
        <input type="hidden" name="source_type" value="tweet" />
        <input type="hidden" name="source_url" value={prefilled?.sourceUrl ?? ""} />

        {/* Who made this take */}
        <section className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-500">Who made this take?</h2>
          <div>
            <label htmlFor="expert_name" className="block text-sm font-medium text-zinc-300 mb-1">
              Name <span className="text-emerald-400">*</span>
            </label>
            <input id="expert_name" name="expert_name" type="text" required defaultValue={prefilled?.authorName ?? ""} className={inputClass} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="expert_outlet" className="block text-sm font-medium text-zinc-300 mb-1">Outlet</label>
              <input id="expert_outlet" name="expert_outlet" type="text" placeholder="e.g. ESPN" value={outlet} onChange={e => setOutlet(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label htmlFor="expert_twitter" className="block text-sm font-medium text-zinc-300 mb-1">Twitter / X</label>
              <input id="expert_twitter" name="expert_twitter" type="text" defaultValue={prefilled?.twitterHandle ?? ""} className={inputClass} />
            </div>
          </div>
        </section>

        {/* The take */}
        <section className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-500">The Take</h2>
          <textarea id="raw_text" name="raw_text" required rows={5} defaultValue={rawText} className={`${inputClass} resize-none`} />
        </section>

        {/* ── Fantasy section ── */}
        {takeType === "fantasy" && (
          <section className="rounded-xl border-2 p-5 space-y-5" style={{ borderColor: "#15803d", backgroundColor: "#f0fdf4" }}>

            {/* Header + AI button */}
            <div className="flex items-center justify-between flex-wrap gap-3">
              <h2 className="text-xs font-semibold uppercase tracking-widest" style={{ color: "#15803d" }}>
                Fantasy Details
              </h2>
              <button
                type="button"
                onClick={handleAnalyze}
                disabled={isAnalyzing || !rawText}
                className="flex items-center gap-2 px-4 py-1.5 rounded-lg font-mono text-[11px] tracking-widest uppercase font-black text-white disabled:opacity-50 transition-opacity"
                style={{ backgroundColor: "#15803d" }}
              >
                {isAnalyzing ? (
                  <><span className="animate-spin">⚙</span> Analyzing…</>
                ) : (
                  <>✨ Auto-fill with AI</>
                )}
              </button>
            </div>

            {analyzeError && (
              <p className="text-sm text-red-600">{analyzeError}</p>
            )}

            {autoFill && (
              <div className="rounded-lg bg-green-100 border border-green-300 px-4 py-3 text-sm text-green-800">
                <p className="font-semibold mb-1">AI filled in the fields below</p>
                <p className="text-xs text-green-700">{autoFill.summary}</p>
                <p className="text-xs text-green-600 mt-1 italic">{autoFill.reasoning}</p>
                {autoFill.adp_source === "none" && autoFill.player_name && (
                  <p className="text-xs text-amber-700 mt-1">⚠ Could not fetch live ADP for {autoFill.player_name} — enter manually if known.</p>
                )}
              </div>
            )}

            {/* Dynasty / Redraft / Both */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-zinc-600 mb-2">League Format</p>
              <div className="inline-flex border-2 border-gray-300 overflow-hidden rounded-lg">
                {(["dynasty", "redraft", "both"] as LeagueFormat[]).map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setLeagueFormat(f)}
                    className={`px-4 py-1.5 font-mono text-[11px] tracking-widest uppercase font-black transition-colors border-l border-gray-300 first:border-l-0 ${
                      leagueFormat === f
                        ? "text-white"
                        : "bg-white text-gray-500 hover:text-gray-900"
                    }`}
                    style={leagueFormat === f ? { backgroundColor: f === "dynasty" ? "#7c3aed" : f === "redraft" ? "#0284c7" : "#15803d" } : {}}
                  >
                    {f === "both" ? "Both" : f.charAt(0).toUpperCase() + f.slice(1)}
                  </button>
                ))}
              </div>
              <input type="hidden" name="fantasy_format" value={leagueFormat} />
              <p className="mt-1 text-xs text-zinc-500">
                {leagueFormat === "dynasty" ? "Dynasty leagues only — long-term / developmental value" :
                 leagueFormat === "redraft" ? "Redraft / seasonal leagues only" :
                 "Applies to both dynasty and redraft formats"}
              </p>
            </div>

            {/* Category */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="fantasy_category" className="block text-sm font-medium text-zinc-700 mb-1">
                  Category <span className="text-emerald-600">*</span>
                </label>
                <select
                  id="fantasy_category" name="fantasy_category" required
                  value={fantasyCategory} onChange={(e) => setFantasyCategory(e.target.value)}
                  className={selectClass}
                >
                  {FANTASY_CATEGORIES.map(c => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-zinc-500 italic">
                  {FANTASY_CATEGORIES.find(c => c.value === fantasyCategory)?.desc}
                </p>
              </div>
              <div>
                <label htmlFor="timing_window" className="block text-sm font-medium text-zinc-700 mb-1">Timing Window</label>
                <select
                  id="timing_window" name="timing_window"
                  value={timingWindow} onChange={(e) => setTimingWindow(e.target.value)}
                  className={selectClass}
                >
                  <option value="">— select —</option>
                  {TIMING_WINDOWS.map(t => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
                {timingWindow && (
                  <p className="mt-1 text-xs text-zinc-500 italic">
                    {TIMING_WINDOWS.find(t => t.value === timingWindow)?.desc}
                  </p>
                )}
              </div>
            </div>

            {/* Player info */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label htmlFor="player_name" className="block text-sm font-medium text-zinc-700 mb-1">Player Name</label>
                <input
                  id="player_name" name="player_name" type="text"
                  placeholder="e.g. Justin Jefferson"
                  value={playerName} onChange={(e) => setPlayerName(e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label htmlFor="player_position" className="block text-sm font-medium text-zinc-700 mb-1">Position</label>
                <input
                  id="player_position" name="player_position" type="text"
                  placeholder="WR, RB, QB…"
                  value={playerPosition} onChange={(e) => setPlayerPosition(e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label htmlFor="player_adp" className="block text-sm font-medium text-zinc-700 mb-1">
                  ADP at Time
                  {autoFill?.adp_source === "fantasypros" && (
                    <span className="ml-1 text-[10px] font-mono text-green-600">✓ live</span>
                  )}
                </label>
                <input
                  id="player_adp" name="player_adp" type="number" step="0.1" min="1"
                  placeholder="e.g. 24.5"
                  value={playerAdp} onChange={(e) => setPlayerAdp(e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>

            {/* Boldness + sport/season */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="boldness_score" className="block text-sm font-medium text-zinc-700 mb-1">
                  Boldness Score (1–100)
                  {autoFill && <span className="ml-1 text-[10px] font-mono text-green-600">✓ calculated</span>}
                </label>
                <input
                  id="boldness_score" name="boldness_score" type="number" min="1" max="100"
                  placeholder="e.g. 75"
                  value={boldnessScore} onChange={(e) => setBoldnessScore(e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label htmlFor="sport_season" className="block text-sm font-medium text-zinc-700 mb-1">Sport / Season</label>
                <input
                  id="sport_season" name="sport_season" type="text"
                  placeholder="e.g. 2026 NFL"
                  value={sportSeason} onChange={(e) => setSportSeason(e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>

            {/* Resolution date */}
            <div>
              <label htmlFor="resolution_date" className="block text-sm font-medium text-zinc-700 mb-1">
                Resolution Date
                {autoFill && <span className="ml-1 text-[10px] font-mono text-green-600">✓ inferred</span>}
              </label>
              <input
                id="resolution_date" name="resolution_date" type="date"
                value={resolutionDate} onChange={(e) => setResolutionDate(e.target.value)}
                className={inputClass}
              />
              <p className="mt-1 text-xs text-zinc-500">When this take should be graded</p>
            </div>

          </section>
        )}

        {/* Context */}
        <section className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-500">Context</h2>
          <div className="grid grid-cols-2 gap-3">
            {takeType === "analyst" && (
              <div>
                <label htmlFor="sport" className="block text-sm font-medium text-zinc-300 mb-1">
                  Sport <span className="text-emerald-400">*</span>
                </label>
                <input id="sport" name="sport" list="sports-list" required placeholder="e.g. NBA" className={inputClass} />
                <datalist id="sports-list">{SPORTS.map((s) => <option key={s} value={s} />)}</datalist>
              </div>
            )}
            <div className={takeType === "analyst" ? "" : "col-span-2"}>
              <div className="flex items-center justify-between mb-1">
                <label htmlFor="date_made" className="block text-sm font-medium text-zinc-300">
                  Date made <span className="text-emerald-400">*</span>
                </label>
                {prefilled?.dateMade && !dateOverride && (
                  <span className="text-xs text-emerald-500 flex items-center gap-1">
                    ✓ pulled from tweet
                    <button type="button" onClick={() => setDateOverride(true)} className="ml-1 underline text-zinc-400 hover:text-zinc-200">edit</button>
                  </span>
                )}
              </div>
              {prefilled?.dateMade && !dateOverride ? (
                <>
                  <input type="hidden" name="date_made" value={prefilled.dateMade} />
                  <div className={`${inputClass} bg-gray-50 text-gray-500 cursor-default select-none`}>
                    {new Date(prefilled.dateMade + "T12:00:00").toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                  </div>
                </>
              ) : (
                <input id="date_made" name="date_made" type="date" required defaultValue={prefilled?.dateMade ?? ""} className={inputClass} />
              )}
            </div>
          </div>
        </section>

        {submitError && (
          <div className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
            <strong>Submission failed:</strong> {submitError}
          </div>
        )}

        <button
          type="submit" disabled={isSubmitting}
          className="w-full rounded-lg px-6 py-3.5 font-semibold disabled:opacity-50 transition-colors"
          style={{ backgroundColor: takeType === "fantasy" ? "#15803d" : "#10b981", color: takeType === "fantasy" ? "white" : "black" }}
        >
          {isSubmitting
            ? (takeType === "fantasy" ? "Submitting fantasy take…" : "Submitting & rating with AI…")
            : (takeType === "fantasy" ? "Submit Fantasy Take" : "Submit Take")}
        </button>
      </form>
    </div>
  );
}

// ── Shared toggle component ───────────────────────────────────────────────────
function TakeTypeToggle({ value, onChange }: { value: TakeType; onChange: (v: TakeType) => void }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500 mb-2">Take Type</p>
      <div className="inline-flex border-2 border-gray-900 overflow-hidden">
        <button
          type="button" onClick={() => onChange("analyst")}
          className={`px-5 py-2 font-mono text-[11px] tracking-widest uppercase font-black transition-colors ${
            value === "analyst" ? "bg-gray-900 text-white" : "bg-white text-gray-500 hover:text-gray-900"
          }`}
        >
          Analyst Take
        </button>
        <button
          type="button" onClick={() => onChange("fantasy")}
          className={`px-5 py-2 font-mono text-[11px] tracking-widest uppercase font-black transition-colors border-l-2 border-gray-900 ${
            value === "fantasy" ? "text-white" : "bg-white text-gray-500 hover:text-gray-900"
          }`}
          style={value === "fantasy" ? { backgroundColor: "#15803d" } : {}}
        >
          Fantasy Guru Take
        </button>
      </div>
      {value === "fantasy" && (
        <p className="mt-1.5 text-xs font-mono" style={{ color: "#16a34a" }}>
          Routes to Fantasy TakeScore · AI auto-fill available on next step
        </p>
      )}
    </div>
  );
}
