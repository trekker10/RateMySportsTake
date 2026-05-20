"use client";

import { useState, useTransition } from "react";
import { searchExpertTakes, type FoundTake } from "@/app/actions/search";
import { importTake } from "@/app/actions/takes";
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

type ImportStatus = "idle" | "importing" | "done" | "error";

interface ResultState {
  take: FoundTake;
  selected: boolean;
  sport: string;
  status: ImportStatus;
}

export default function ImportSearch() {
  const [expertName, setExpertName] = useState("");
  const [topic, setTopic] = useState("");
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
        const found = await searchExpertTakes(expertName, topic);
        setResults(
          found.map((take) => ({ take, selected: true, sport: "", status: "idle" }))
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

  function selectAll() {
    setResults((prev) => prev!.map((r) => ({ ...r, selected: true })));
  }

  function selectNone() {
    setResults((prev) => prev!.map((r) => ({ ...r, selected: false })));
  }

  async function handleImportSelected() {
    if (!results) return;
    const toImport = results.filter((r) => r.selected);
    if (toImport.some((r) => !r.sport)) {
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

      const result = await importTake({
        expertName,
        rawText: item.take.raw_text,
        sourceType: item.take.source_type as SourceType,
        sourceUrl: item.take.source_url || null,
        sport: item.sport,
        dateMade: item.take.date_made || new Date().toISOString().split("T")[0],
      });

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
  const missingSport = selectedItems.some((r) => !r.sport);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Import Takes</h1>
        <p className="mt-1 text-zinc-400">
          Search the web for predictions from any expert. Claude finds and
          extracts quotes automatically.
        </p>
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

                  {/* Sport selector — only when selected and not yet imported */}
                  {item.selected && item.status === "idle" && (
                    <div
                      className="flex items-center gap-2"
                      onClick={(e) => e.stopPropagation()}
                    >
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
