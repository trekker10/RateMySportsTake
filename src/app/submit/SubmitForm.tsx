"use client";

import { useState, useTransition } from "react";
import { submitTake, submitFantasyTake } from "@/app/actions/takes";
import { fetchTweetData, type TweetData } from "@/app/actions/tweets";

const SOURCE_TYPES = [
  { value: "tweet",      label: "Tweet / X Post" },
  { value: "article",   label: "Article" },
  { value: "tv_segment",label: "TV Segment" },
  { value: "podcast",   label: "Podcast" },
  { value: "radio",     label: "Radio" },
  { value: "other",     label: "Other" },
];

const SPORTS = [
  "NBA", "NFL", "MLB", "NHL", "Soccer",
  "College Football", "College Basketball", "MMA", "Golf", "Tennis", "Other",
];

const FANTASY_CATEGORIES = [
  { value: "breakout_call", label: "Breakout Call" },
  { value: "bust_call",     label: "Bust Call" },
  { value: "sleeper_pick",  label: "Sleeper Pick" },
  { value: "start_sit",     label: "Start/Sit" },
  { value: "waiver_add",    label: "Waiver Wire Add" },
];

const TIMING_WINDOWS = [
  { value: "preseason",    label: "Preseason" },
  { value: "post_draft",   label: "Post-Draft" },
  { value: "early_season", label: "Early Season" },
  { value: "midseason",    label: "Midseason" },
  { value: "late_season",  label: "Late Season" },
  { value: "playoffs",     label: "Playoffs" },
];

const inputClass =
  "w-full rounded-lg bg-white border border-gray-300 px-4 py-2.5 text-gray-900 placeholder-gray-400 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none";

const selectClass =
  "w-full rounded-lg bg-white border border-gray-300 px-4 py-2.5 text-gray-900 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none";

type TakeType = "analyst" | "fantasy";

export default function SubmitForm() {
  const [step, setStep] = useState<"url" | "review">("url");
  const [takeType, setTakeType] = useState<TakeType>("analyst");
  const [tweetUrl, setTweetUrl] = useState("");
  const [prefilled, setPrefilled] = useState<TweetData | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [isFetching, startFetch] = useTransition();
  const [isSubmitting, startSubmit] = useTransition();
  const [dateOverride, setDateOverride] = useState(false);

  function handleFetch(e: React.FormEvent) {
    e.preventDefault();
    setFetchError(null);
    startFetch(async () => {
      try {
        const data = await fetchTweetData(tweetUrl);
        setPrefilled(data);
        setStep("review");
      } catch (err) {
        setFetchError(
          err instanceof Error ? err.message : "Couldn't fetch that tweet."
        );
      }
    });
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    if (takeType === "fantasy") {
      startSubmit(() => submitFantasyTake(formData));
    } else {
      startSubmit(() => submitTake(formData));
    }
  }

  // ── Step 1: URL input ────────────────────────────────────────────────────
  if (step === "url") {
    return (
      <div className="max-w-xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Submit a Take</h1>
          <p className="mt-2 text-zinc-400">
            Paste an X.com tweet URL and we'll pull the quote automatically.
          </p>
        </div>

        {/* Take type toggle */}
        <div className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500 mb-2">Take Type</p>
          <div className="inline-flex border-2 border-gray-900 overflow-hidden">
            <button
              type="button"
              onClick={() => setTakeType("analyst")}
              className={`px-5 py-2 font-mono text-[11px] tracking-widest uppercase font-black transition-colors ${
                takeType === "analyst"
                  ? "bg-gray-900 text-white"
                  : "bg-white text-gray-500 hover:text-gray-900"
              }`}
            >
              Analyst Take
            </button>
            <button
              type="button"
              onClick={() => setTakeType("fantasy")}
              className={`px-5 py-2 font-mono text-[11px] tracking-widest uppercase font-black transition-colors border-l-2 border-gray-900 ${
                takeType === "fantasy"
                  ? "text-white"
                  : "bg-white text-gray-500 hover:text-gray-900"
              }`}
              style={takeType === "fantasy" ? { backgroundColor: "#15803d" } : {}}
            >
              Fantasy Guru Take
            </button>
          </div>
          {takeType === "fantasy" && (
            <p className="mt-2 text-xs text-green-600 font-mono">
              Goes into the Fantasy TakeScore system · separate formula
            </p>
          )}
        </div>

        <form onSubmit={handleFetch} className="space-y-4">
          <div>
            <label htmlFor="tweet_url" className="block text-sm font-medium text-zinc-300 mb-1">
              X.com tweet URL <span className="text-emerald-400">*</span>
            </label>
            <input
              id="tweet_url"
              type="url"
              required
              value={tweetUrl}
              onChange={(e) => setTweetUrl(e.target.value)}
              placeholder="https://x.com/username/status/..."
              className={inputClass}
            />
          </div>
          {fetchError && <p className="text-sm text-red-400">{fetchError}</p>}
          <button
            type="submit"
            disabled={isFetching}
            className="w-full rounded-lg px-6 py-3.5 font-semibold text-black disabled:opacity-50 transition-colors"
            style={{ backgroundColor: takeType === "fantasy" ? "#15803d" : "#10b981", color: "black" }}
          >
            {isFetching ? "Fetching tweet…" : "Fetch Tweet →"}
          </button>
        </form>
      </div>
    );
  }

  // ── Step 2: Review & submit ──────────────────────────────────────────────
  const accentColor = takeType === "fantasy" ? "#15803d" : "#e2241a";
  const accentBg    = takeType === "fantasy" ? "#15803d" : "#10b981";

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6 flex items-center gap-4">
        <button
          onClick={() => setStep("url")}
          className="text-zinc-500 hover:text-zinc-300 text-sm transition-colors"
        >
          ← Back
        </button>
        <div>
          <h1 className="text-3xl font-bold">Review Take</h1>
          <p className="mt-1 text-zinc-400 text-sm">
            Confirm the details then hit submit —{" "}
            {takeType === "fantasy"
              ? "goes into the Fantasy TakeScore system."
              : "Claude will rate it automatically."}
          </p>
        </div>
      </div>

      {/* Take type toggle */}
      <div className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500 mb-2">Take Type</p>
        <div className="inline-flex border-2 border-gray-900 overflow-hidden">
          <button
            type="button"
            onClick={() => setTakeType("analyst")}
            className={`px-5 py-2 font-mono text-[11px] tracking-widest uppercase font-black transition-colors ${
              takeType === "analyst"
                ? "bg-gray-900 text-white"
                : "bg-white text-gray-500 hover:text-gray-900"
            }`}
          >
            Analyst Take
          </button>
          <button
            type="button"
            onClick={() => setTakeType("fantasy")}
            className={`px-5 py-2 font-mono text-[11px] tracking-widest uppercase font-black transition-colors border-l-2 border-gray-900 ${
              takeType === "fantasy" ? "text-white" : "bg-white text-gray-500 hover:text-gray-900"
            }`}
            style={takeType === "fantasy" ? { backgroundColor: "#15803d" } : {}}
          >
            Fantasy Guru Take
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
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
              <input id="expert_outlet" name="expert_outlet" type="text" placeholder="e.g. ESPN" className={inputClass} />
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
          <div>
            <label htmlFor="raw_text" className="block text-sm font-medium text-zinc-300 mb-1">
              Exact quote <span className="text-emerald-400">*</span>
            </label>
            <textarea id="raw_text" name="raw_text" required rows={5} defaultValue={prefilled?.rawText ?? ""} className={`${inputClass} resize-none`} />
          </div>
        </section>

        {/* Fantasy-specific fields */}
        {takeType === "fantasy" && (
          <section className="space-y-3 rounded-xl border-2 p-5" style={{ borderColor: "#15803d", backgroundColor: "#f0fdf4" }}>
            <h2 className="text-xs font-semibold uppercase tracking-widest" style={{ color: "#15803d" }}>Fantasy Details</h2>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="fantasy_category" className="block text-sm font-medium text-zinc-700 mb-1">
                  Category <span className="text-emerald-600">*</span>
                </label>
                <select id="fantasy_category" name="fantasy_category" required className={selectClass}>
                  {FANTASY_CATEGORIES.map(c => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="timing_window" className="block text-sm font-medium text-zinc-700 mb-1">Timing Window</label>
                <select id="timing_window" name="timing_window" className={selectClass}>
                  <option value="">— select —</option>
                  {TIMING_WINDOWS.map(t => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label htmlFor="player_name" className="block text-sm font-medium text-zinc-700 mb-1">Player Name</label>
                <input id="player_name" name="player_name" type="text" placeholder="e.g. Justin Jefferson" className={inputClass} />
              </div>
              <div>
                <label htmlFor="player_position" className="block text-sm font-medium text-zinc-700 mb-1">Position</label>
                <input id="player_position" name="player_position" type="text" placeholder="WR, RB, QB…" className={inputClass} />
              </div>
              <div>
                <label htmlFor="player_adp" className="block text-sm font-medium text-zinc-700 mb-1">ADP at Time</label>
                <input id="player_adp" name="player_adp" type="number" step="0.1" min="1" placeholder="e.g. 24.5" className={inputClass} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="boldness_score" className="block text-sm font-medium text-zinc-700 mb-1">Boldness Score (1–100)</label>
                <input id="boldness_score" name="boldness_score" type="number" min="1" max="100" placeholder="e.g. 75" className={inputClass} />
              </div>
              <div>
                <label htmlFor="sport_season" className="block text-sm font-medium text-zinc-700 mb-1">Sport / Season</label>
                <input id="sport_season" name="sport_season" type="text" placeholder="e.g. 2025 NFL" className={inputClass} />
              </div>
            </div>

            <div>
              <label htmlFor="resolution_date" className="block text-sm font-medium text-zinc-700 mb-1">Resolution Date (when to grade)</label>
              <input id="resolution_date" name="resolution_date" type="date" className={inputClass} />
            </div>
          </section>
        )}

        {/* Context (analyst takes only need sport) */}
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
                    <button type="button" onClick={() => setDateOverride(true)} className="ml-1 underline text-zinc-400 hover:text-zinc-200">
                      edit
                    </button>
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

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-lg px-6 py-3.5 font-semibold disabled:opacity-50 transition-colors"
          style={{ backgroundColor: accentBg, color: takeType === "fantasy" ? "white" : "black" }}
        >
          {isSubmitting
            ? takeType === "fantasy" ? "Submitting fantasy take…" : "Submitting & rating with AI…"
            : takeType === "fantasy" ? "Submit Fantasy Take" : "Submit Take"}
        </button>
      </form>
    </div>
  );
}
