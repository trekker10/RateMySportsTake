"use client";

import { useState, useTransition } from "react";
import { searchExpertTakes, type FoundTake } from "@/app/actions/search";
import { importTake, submitFantasyTake } from "@/app/actions/takes";
import type { SourceType } from "@/types/database";

const SPORTS = [
  "NBA", "NFL", "MLB", "NHL", "Soccer",
  "College Football", "College Basketball", "MMA", "Golf", "Tennis", "Other",
];

const SOURCE_LABELS: Record<string, string> = {
  article: "Article",
  podcast: "Podcast",
  tv_segment: "TV Segment",
  radio: "Radio",
  other: "Other",
};

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

type TakeType = "analyst" | "fantasy";
type ImportStatus = "idle" | "importing" | "done" | "error";

interface ResultState {
  take: FoundTake;
  selected: boolean;
  sport: string;
  fantasyCategory: string;
  timingWindow: string;
  status: ImportStatus;
}

export default function ImportSearch() {
  const [takeType, setTakeType] = useState<TakeType>("analyst");
  const [expertName, setExpertName] = useState("");
  const [topic, setTopic] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [results, setResults] = useState<ResultState[] | null>(null);
  const [isSearching, startSearch] = useTransition();
  const [searchError, setSearchError] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importSummary, setImportSummary] = useState<string | null>(null);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setSearchError(null);
    setResults(null);
    setImportSummary(null);
    startSearch(async () => {
      try {
        const found = await searchExpertTakes(expertName, topic, dateFrom || undefined, dateTo || undefined);
        setResults(
          found.map((take) => ({ take, selected: true, sport: "", fantasyCategory: "breakout_call", timingWindow: "", status: "idle" }))
        );
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        setSearchError(`Search failed: ${msg}`);
      }
    });
  }

  function toggleSelected(i: number) {
    setResults((prev) =>
      prev!.map((r, idx) => (idx === i ? { ...r, selected: !r.selected } : r))
    );
  }

  function setSport(i: number, sport: string) {
    setResults((prev) =>
      prev!.map((r, idx) => (idx === i ? { ...r, sport } : r))
    );
  }

  function setFantasyCategory(i: number, fantasyCategory: string) {
    setResults((prev) =>
      prev!.map((r, idx) => (idx === i ? { ...r, fantasyCategory } : r))
    );
  }

  function setTimingWindow(i: number, timingWindow: string) {
    setResults((prev) =>
      prev!.map((r, idx) => (idx === i ? { ...r, timingWindow } : r))
    );
  }

  function selectAll() {
    setResults((prev) => prev!.map((r) => ({ ...r, selected: true })));
  }

  function selectNone() {
    setResults((prev) => prev!.map((r) => ({ ...r, selected: false })));
  }

  async function handleImportSelected() {
    if (!results) return;
    const toImport = results.filter((r) => r.selected);

    if (takeType === "analyst" && toImport.some((r) => !r.sport)) {
      alert("Please select a sport for every checked take before importing.");
      return;
    }

    setIsImporting(true);
    setImportSummary(null);
    let successCount = 0;

    for (const item of toImport) {
      const idx = results.indexOf(item);
      setResults((prev) =>
        prev!.map((r, i) => (i === idx ? { ...r, status: "importing" } : r))
      );

      let result: { success: boolean; error?: string };

      if (takeType === "fantasy") {
        const fd = new FormData();
        fd.set("expert_name",      expertName);
        fd.set("raw_text",         item.take.raw_text);
        fd.set("date_made",        item.take.date_made || new Date().toISOString().split("T")[0]);
        fd.set("fantasy_category", item.fantasyCategory);
        fd.set("timing_window",    item.timingWindow);
        try {
          await submitFantasyTake(fd);
          result = { success: true };
        } catch {
          result = { success: false, error: "Failed" };
        }
      } else {
        result = await importTake({
          expertName,
          rawText: item.take.raw_text,
          sourceType: item.take.source_type as SourceType,
          sourceUrl: item.take.source_url || null,
          sport: item.sport,
          dateMade: item.take.date_made || new Date().toISOString().split("T")[0],
        });
      }

      setResults((prev) =>
        prev!.map((r, i) =>
          i === idx ? { ...r, status: result.success ? "done" : "error" } : r
        )
      );

      if (result.success) successCount++;
    }

    setIsImporting(false);
    setImportSummary(
      `Imported ${successCount} of ${toImport.length} take${toImport.length !== 1 ? "s" : ""} successfully.`
    );
  }

  const selectedItems = results?.filter((r) => r.selected) ?? [];
  const allSelected = results?.every((r) => r.selected) ?? false;
  const missingSport = takeType === "analyst" && selectedItems.some((r) => !r.sport);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Import Takes</h1>
        <p className="mt-1 text-zinc-400">
          Search the web for predictions from any expert. Claude finds and
          extracts quotes automatically.
        </p>
      </div>

      {/* Take type toggle */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500 mb-2">Take Type</p>
        <div className="inline-flex border-2 border-zinc-600 overflow-hidden rounded-lg">
          <button
            type="button"
            onClick={() => setTakeType("analyst")}
            className={`px-5 py-2 font-mono text-[11px] tracking-widest uppercase font-black transition-colors ${
              takeType === "analyst"
                ? "bg-zinc-700 text-white"
                : "bg-zinc-900 text-zinc-500 hover:text-zinc-300"
            }`}
          >
            Analyst Take
          </button>
          <button
            type="button"
            onClick={() => setTakeType("fantasy")}
            className={`px-5 py-2 font-mono text-[11px] tracking-widest uppercase font-black transition-colors border-l-2 border-zinc-600 ${
              takeType === "fantasy" ? "text-white" : "bg-zinc-900 text-zinc-500 hover:text-zinc-300"
            }`}
            style={takeType === "fantasy" ? { backgroundColor: "#15803d" } : {}}
          >
            Fantasy Guru Take
          </button>
        </div>
        {takeType === "fantasy" && (
          <p className="mt-1.5 text-xs font-mono" style={{ color: "#16a34a" }}>
            Takes will be routed to the Fantasy TakeScore system
          </p>
        )}
      </div>

      {/* Search form */}
      <form onSubmit={handleSearch} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1">
              Expert name <span className="text-emerald-400">*</span>
            </label>
            <input
              value={expertName}
              onChange={(e) => setExpertName(e.target.value)}
              placeholder="e.g. Stephen A. Smith"
              required
              className="w-full rounded-lg bg-white border border-gray-300 px-4 py-2.5 text-gray-900 placeholder-gray-400 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1">
              Topic or sport
            </label>
            <input
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g. Super Bowl, LeBron James"
              className="w-full rounded-lg bg-white border border-gray-300 px-4 py-2.5 text-gray-900 placeholder-gray-400 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Date range */}
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-1">
            Date range <span className="text-zinc-500 font-normal">(optional — leave blank for no limit)</span>
          </label>
          <div className="grid grid-cols-2 gap-3">
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 pointer-events-none">From</span>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-full rounded-lg bg-white border border-gray-300 pl-12 pr-4 py-2.5 text-gray-900 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 pointer-events-none">To</span>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-full rounded-lg bg-white border border-gray-300 pl-8 pr-4 py-2.5 text-gray-900 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={isSearching}
          className="w-full rounded-lg bg-emerald-500 px-6 py-3.5 font-semibold text-black hover:bg-emerald-400 disabled:opacity-50 transition-colors"
        >
          {isSearching ? "Searching the web… this takes ~20 seconds" : "Search for Takes"}
        </button>
      </form>

      {searchError && <p className="text-sm text-red-400">{searchError}</p>}

      {/* Results */}
      {results !== null && (
        <div className="space-y-4">

          {results.length === 0 ? (
            <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-8 text-center text-zinc-500">
              No takes found. Try a different expert name or topic.
            </div>
          ) : (
            <>
              {/* Toolbar */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 text-sm text-zinc-500">
                  <span>{results.length} take{results.length !== 1 ? "s" : ""} found</span>
                  <span>·</span>
                  <button
                    type="button"
                    onClick={allSelected ? selectNone : selectAll}
                    className="text-emerald-400 hover:text-emerald-300 transition-colors"
                  >
                    {allSelected ? "Deselect all" : "Select all"}
                  </button>
                </div>
                {selectedItems.length > 0 && (
                  <button
                    type="button"
                    onClick={handleImportSelected}
                    disabled={isImporting || missingSport}
                    className="rounded-lg bg-emerald-500 px-5 py-2 text-sm font-semibold text-black hover:bg-emerald-400 disabled:opacity-50 transition-colors"
                  >
                    {isImporting
                      ? "Importing…"
                      : `Import ${selectedItems.length} selected`}
                  </button>
                )}
              </div>

              {missingSport && selectedItems.length > 0 && (
                <p className="text-xs text-amber-400">
                  Add a sport to every checked take before importing.
                </p>
              )}

              {/* Take cards */}
              {results.map((item, i) => (
                <div
                  key={i}
                  onClick={() => item.status === "idle" && toggleSelected(i)}
                  className={`rounded-xl border p-5 space-y-4 transition-colors ${
                    item.status === "done"
                      ? "border-emerald-800 bg-emerald-950/20 cursor-default"
                      : item.status === "error"
                      ? "border-red-800 bg-red-950/20 cursor-default"
                      : item.status === "importing"
                      ? "border-zinc-700 bg-zinc-900 opacity-60 cursor-default"
                      : item.selected
                      ? "border-emerald-600 bg-zinc-900 cursor-pointer"
                      : "border-zinc-800 bg-zinc-900 hover:border-zinc-600 cursor-pointer"
                  }`}
                >
                  {/* Card header */}
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-zinc-800 px-2.5 py-0.5 text-xs text-zinc-400">
                        {SOURCE_LABELS[item.take.source_type] ?? item.take.source_type}
                      </span>
                      {item.take.date_made && (
                        <span className="text-xs text-zinc-500">{item.take.date_made}</span>
                      )}
                      {item.take.source_url && (
                        <a
                          href={item.take.source_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="text-xs text-emerald-500 hover:underline truncate max-w-xs"
                        >
                          Source ↗
                        </a>
                      )}
                    </div>

                    {item.status === "done" ? (
                      <span className="text-sm text-emerald-400 shrink-0">✓ Imported</span>
                    ) : item.status === "error" ? (
                      <span className="text-sm text-red-400 shrink-0">Failed</span>
                    ) : item.status === "importing" ? (
                      <span className="text-sm text-zinc-500 shrink-0">Importing…</span>
                    ) : (
                      <input
                        type="checkbox"
                        checked={item.selected}
                        onChange={() => toggleSelected(i)}
                        onClick={(e) => e.stopPropagation()}
                        className="mt-0.5 h-4 w-4 accent-emerald-500 shrink-0"
                      />
                    )}
                  </div>

                  {/* The take */}
                  <p className="text-zinc-100 leading-relaxed">
                    "{item.take.raw_text}"
                  </p>

                  {/* Per-take fields — only when selected and not yet imported */}
                  {item.selected && item.status === "idle" && (
                    <div
                      className="space-y-2"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {takeType === "analyst" ? (
                        <div className="flex items-center gap-2">
                          <input
                            list={`sports-${i}`}
                            value={item.sport}
                            onChange={(e) => setSport(i, e.target.value)}
                            placeholder="Sport (required to import)"
                            className="flex-1 rounded-lg bg-zinc-800 border border-zinc-700 px-3 py-1.5 text-sm text-zinc-50 placeholder-zinc-600 focus:border-emerald-500 focus:outline-none"
                          />
                          <datalist id={`sports-${i}`}>
                            {SPORTS.map((s) => <option key={s} value={s} />)}
                          </datalist>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <select
                            value={item.fantasyCategory}
                            onChange={(e) => setFantasyCategory(i, e.target.value)}
                            className="flex-1 rounded-lg bg-zinc-800 border border-zinc-700 px-3 py-1.5 text-sm text-zinc-50 focus:outline-none"
                            style={{ borderColor: "#15803d" }}
                          >
                            {FANTASY_CATEGORIES.map(c => (
                              <option key={c.value} value={c.value}>{c.label}</option>
                            ))}
                          </select>
                          <select
                            value={item.timingWindow}
                            onChange={(e) => setTimingWindow(i, e.target.value)}
                            className="flex-1 rounded-lg bg-zinc-800 border border-zinc-700 px-3 py-1.5 text-sm text-zinc-50 focus:outline-none"
                          >
                            <option value="">Timing (optional)</option>
                            {TIMING_WINDOWS.map(t => (
                              <option key={t.value} value={t.value}>{t.label}</option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}

              {/* Bottom import button */}
              {selectedItems.length > 0 && (
                <button
                  type="button"
                  onClick={handleImportSelected}
                  disabled={isImporting || missingSport}
                  className="w-full rounded-lg bg-emerald-500 px-6 py-3.5 font-semibold text-black hover:bg-emerald-400 disabled:opacity-50 transition-colors"
                >
                  {isImporting
                    ? "Importing…"
                    : `Import ${selectedItems.length} selected take${selectedItems.length !== 1 ? "s" : ""}`}
                </button>
              )}

              {importSummary && (
                <p className="text-center text-sm text-emerald-400">{importSummary}</p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
