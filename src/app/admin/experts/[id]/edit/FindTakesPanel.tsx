"use client";

import { useState, useTransition } from "react";
import { searchExpertTakesForProfile, type FoundTake } from "@/app/actions/search";
import { importTakeForExpert } from "@/app/actions/takes";

const SOURCE_LABELS: Record<string, string> = {
  article: "Article",
  podcast: "Podcast",
  tv_segment: "TV",
  radio: "Radio",
  other: "Other",
};

export default function FindTakesPanel({
  expertId,
  expertName,
  twitterHandle,
}: {
  expertId: string;
  expertName: string;
  twitterHandle: string | null;
}) {
  const [topic, setTopic] = useState("");
  const [results, setResults] = useState<FoundTake[]>([]);
  const [searched, setSearched] = useState(false);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [sports, setSports] = useState<Record<number, string>>({});
  const [imported, setImported] = useState<Set<number>>(new Set());
  const [errors, setErrors] = useState<Record<number, string>>({});
  const [isSearching, startSearch] = useTransition();
  const [isImporting, startImport] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  function handleSearch() {
    setResults([]);
    setSelected(new Set());
    setSports({});
    setImported(new Set());
    setErrors({});
    setMessage(null);
    startSearch(async () => {
      const found = await searchExpertTakesForProfile(expertId, expertName, twitterHandle, topic);
      setResults(found);
      setSearched(true);
    });
  }

  function toggleSelect(i: number) {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  }

  function handleImportSelected() {
    const toImport = [...selected].filter(i => !imported.has(i));
    if (toImport.length === 0) return;
    setMessage(null);
    startImport(async () => {
      const newImported = new Set(imported);
      const newErrors = { ...errors };
      for (const i of toImport) {
        const take = results[i];
        const result = await importTakeForExpert({
          expertId,
          rawText: take.raw_text,
          sourceType: take.source_type,
          sourceUrl: take.source_url || null,
          sport: sports[i] ?? "",
          dateMade: take.date_made || new Date().toISOString().split("T")[0],
        });
        if (result.success) {
          newImported.add(i);
          delete newErrors[i];
        } else {
          newErrors[i] = result.error;
        }
      }
      setImported(newImported);
      setErrors(newErrors);
      const successCount = toImport.filter(i => newImported.has(i)).length;
      setMessage(`${successCount} take${successCount !== 1 ? "s" : ""} imported and sent to AI for rating.`);
    });
  }

  const pendingSelected = [...selected].filter(i => !imported.has(i));

  return (
    <div className="rounded-xl border border-zinc-700 bg-zinc-900 overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-zinc-700">
        <h2 className="font-semibold text-zinc-100">Find Takes Online</h2>
        <p className="text-xs text-zinc-500 mt-0.5">
          AI searches the web for predictions and bold claims by {expertName}.
          {twitterHandle && <span className="ml-1 text-zinc-600">Using {twitterHandle} to verify identity.</span>}
        </p>
      </div>

      {/* Search bar */}
      <div className="px-5 py-4 flex gap-3 border-b border-zinc-800">
        <input
          type="text"
          value={topic}
          onChange={e => setTopic(e.target.value)}
          onKeyDown={e => e.key === "Enter" && handleSearch()}
          placeholder="Topic (optional) — e.g. NBA Finals, Patrick Mahomes…"
          className="flex-1 rounded-lg bg-zinc-800 border border-zinc-700 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-zinc-500"
          disabled={isSearching}
        />
        <button
          onClick={handleSearch}
          disabled={isSearching}
          className="px-4 py-2 rounded-lg bg-white text-black text-sm font-semibold hover:bg-zinc-200 transition-colors disabled:opacity-50 shrink-0"
        >
          {isSearching ? "Searching…" : "Search"}
        </button>
      </div>

      {/* Loading state */}
      {isSearching && (
        <div className="px-5 py-10 text-center">
          <p className="text-zinc-400 text-sm animate-pulse">Searching the web for takes — this takes ~20 seconds…</p>
        </div>
      )}

      {/* Results */}
      {!isSearching && searched && (
        <>
          {results.length === 0 ? (
            <div className="px-5 py-8 text-center text-zinc-500 text-sm">
              No takes found. Try a different topic or leave it blank for a broad search.
            </div>
          ) : (
            <>
              {/* Action bar */}
              <div className="px-5 py-3 bg-zinc-800/50 border-b border-zinc-800 flex items-center justify-between gap-4">
                <p className="text-xs text-zinc-400">{results.length} takes found · {selected.size} selected</p>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setSelected(selected.size === results.length ? new Set() : new Set(results.map((_, i) => i)))}
                    className="text-xs text-zinc-400 hover:text-zinc-200 transition-colors"
                  >
                    {selected.size === results.length ? "Deselect all" : "Select all"}
                  </button>
                  {pendingSelected.length > 0 && (
                    <button
                      onClick={handleImportSelected}
                      disabled={isImporting}
                      className="px-4 py-1.5 rounded-lg bg-emerald-500 text-black text-xs font-semibold hover:bg-emerald-400 transition-colors disabled:opacity-50"
                    >
                      {isImporting ? "Importing…" : `Import ${pendingSelected.length} selected`}
                    </button>
                  )}
                </div>
              </div>

              {message && (
                <div className="px-5 py-2 bg-emerald-900/30 border-b border-emerald-800 text-xs text-emerald-400">
                  ✓ {message}
                </div>
              )}

              <div className="divide-y divide-zinc-800">
                {results.map((take, i) => {
                  const isImported = imported.has(i);
                  const isSelected = selected.has(i);
                  const err = errors[i];
                  return (
                    <div
                      key={i}
                      onClick={() => !isImported && toggleSelect(i)}
                      className={`px-5 py-4 cursor-pointer transition-colors ${
                        isImported
                          ? "opacity-50 cursor-default"
                          : isSelected
                          ? "bg-emerald-900/20"
                          : "hover:bg-zinc-800/40"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        {/* Checkbox */}
                        <div className={`mt-0.5 w-4 h-4 shrink-0 rounded border flex items-center justify-center transition-colors ${
                          isImported
                            ? "border-emerald-600 bg-emerald-600"
                            : isSelected
                            ? "border-emerald-500 bg-emerald-500"
                            : "border-zinc-600"
                        }`}>
                          {(isSelected || isImported) && (
                            <svg className="w-2.5 h-2.5 text-black" fill="currentColor" viewBox="0 0 12 12">
                              <path d="M10 3L5 8.5 2 5.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                            </svg>
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-zinc-100 italic">"{take.raw_text}"</p>
                          <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-zinc-500">
                            <span className="rounded bg-zinc-800 px-2 py-0.5">{SOURCE_LABELS[take.source_type] ?? take.source_type}</span>
                            {take.date_made && <span>{take.date_made}</span>}
                            {take.source_url && (
                              <a
                                href={take.source_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={e => e.stopPropagation()}
                                className="hover:text-zinc-300 transition-colors truncate max-w-[260px]"
                              >
                                {take.source_url}
                              </a>
                            )}
                            {isImported && <span className="text-emerald-500 font-medium">✓ Imported</span>}
                          </div>
                          {err && <p className="mt-1 text-xs text-red-400">{err}</p>}

                          {/* Sport picker — only show when selected and not imported */}
                          {isSelected && !isImported && (
                            <div className="mt-2" onClick={e => e.stopPropagation()}>
                              <input
                                type="text"
                                value={sports[i] ?? ""}
                                onChange={e => setSports(prev => ({ ...prev, [i]: e.target.value }))}
                                placeholder="Sport / league (e.g. NBA, NFL) — optional"
                                className="w-full max-w-xs rounded bg-zinc-800 border border-zinc-700 px-2 py-1 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none"
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
