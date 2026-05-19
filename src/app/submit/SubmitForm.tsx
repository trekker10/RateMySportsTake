"use client";

import { useState, useTransition } from "react";
import { submitTake } from "@/app/actions/takes";
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

const inputClass =
  "w-full rounded-lg bg-white border border-gray-300 px-4 py-2.5 text-gray-900 placeholder-gray-400 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none";

export default function SubmitForm() {
  const [step, setStep] = useState<"url" | "review">("url");
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
    startSubmit(() => submitTake(formData));
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
            className="w-full rounded-lg bg-emerald-500 px-6 py-3.5 font-semibold text-black hover:bg-emerald-400 disabled:opacity-50 transition-colors"
          >
            {isFetching ? "Fetching tweet…" : "Fetch Tweet →"}
          </button>
        </form>
      </div>
    );
  }

  // ── Step 2: Review & submit ──────────────────────────────────────────────
  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8 flex items-center gap-4">
        <button
          onClick={() => setStep("url")}
          className="text-zinc-500 hover:text-zinc-300 text-sm transition-colors"
        >
          ← Back
        </button>
        <div>
          <h1 className="text-3xl font-bold">Review Take</h1>
          <p className="mt-1 text-zinc-400 text-sm">
            Confirm the details then hit submit — Claude will rate it automatically.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        <input type="hidden" name="source_type" value="tweet" />
        <input type="hidden" name="source_url" value={prefilled?.sourceUrl ?? ""} />

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

        <section className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-500">The Take</h2>
          <div>
            <label htmlFor="raw_text" className="block text-sm font-medium text-zinc-300 mb-1">
              Exact quote <span className="text-emerald-400">*</span>
            </label>
            <textarea id="raw_text" name="raw_text" required rows={5} defaultValue={prefilled?.rawText ?? ""} className={`${inputClass} resize-none`} />
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-500">Context</h2>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="sport" className="block text-sm font-medium text-zinc-300 mb-1">
                Sport <span className="text-emerald-400">*</span>
              </label>
              <input id="sport" name="sport" list="sports-list" required placeholder="e.g. NBA" className={inputClass} />
              <datalist id="sports-list">{SPORTS.map((s) => <option key={s} value={s} />)}</datalist>
            </div>
            <div>
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
          className="w-full rounded-lg bg-emerald-500 px-6 py-3.5 font-semibold text-black hover:bg-emerald-400 disabled:opacity-50 transition-colors"
        >
          {isSubmitting ? "Submitting & rating with AI…" : "Submit Take"}
        </button>
      </form>
    </div>
  );
}
