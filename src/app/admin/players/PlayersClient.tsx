"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  createPlayer,
  updatePlayer,
  deletePlayer,
  importPlayersFromTags,
  mergePlayers,
  type Player,
} from "@/app/actions/players";

const inputClass =
  "w-full rounded-lg bg-white border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-gray-500";

// ── Tag input for aliases ─────────────────────────────────────────────────────
function AliasInput({
  value,
  onChange,
}: {
  value: string[];
  onChange: (v: string[]) => void;
}) {
  const [input, setInput] = useState("");

  function add() {
    const trimmed = input.trim();
    if (trimmed && !value.includes(trimmed)) onChange([...value, trimmed]);
    setInput("");
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }}
          placeholder="Type an alias and press Enter…"
          className={inputClass}
        />
        <button type="button" onClick={add}
          className="shrink-0 px-3 py-2 rounded-lg border border-gray-300 text-sm text-gray-600 hover:border-gray-500 hover:text-gray-900 transition-colors">
          Add
        </button>
      </div>
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {value.map((alias) => (
            <span key={alias}
              className="inline-flex items-center gap-1 rounded-full bg-gray-100 border border-gray-300 px-2.5 py-1 text-xs text-gray-700">
              {alias}
              <button type="button" onClick={() => onChange(value.filter((a) => a !== alias))}
                className="text-gray-400 hover:text-red-500 transition-colors leading-none">×</button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Player drawer form ────────────────────────────────────────────────────────
function PlayerDrawer({
  player, onClose, onSaved, anchorY,
}: {
  player: Player | null;
  onClose: () => void;
  onSaved: (p: Player) => void;
  anchorY?: number;
}) {
  const isEdit = !!player;
  const [canonicalName, setCanonicalName] = useState(player?.canonical_name ?? "");
  const [aliases, setAliases] = useState<string[]>(player?.aliases ?? []);
  const [sport, setSport] = useState(player?.sport ?? "");
  const [position, setPosition] = useState(player?.position ?? "");
  const [team, setTeam] = useState(player?.team ?? "");
  const [active, setActive] = useState(player?.active ?? true);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSave() {
    if (!canonicalName.trim()) { setError("Canonical name is required."); return; }
    setError(null);
    const fields = {
      canonical_name: canonicalName.trim(),
      aliases, sport: sport.trim(), position: position.trim(), team: team.trim(), active,
    };
    startTransition(async () => {
      if (isEdit && player) {
        const result = await updatePlayer(player.player_id, fields);
        if (result.success) onSaved({ ...player, ...fields });
        else setError(result.error ?? "Save failed.");
      } else {
        const result = await createPlayer(fields);
        if (result.success) {
          onSaved({ player_id: crypto.randomUUID(), ...fields, created_at: new Date().toISOString(), takes_count: 0 });
        } else setError(result.error ?? "Save failed.");
      }
    });
  }

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <aside
        className="fixed z-50 w-full max-w-md bg-white shadow-2xl border border-gray-200 rounded-xl flex flex-col"
        style={(() => {
          const vh = window.innerHeight;
          const ay = anchorY ?? vh / 2;
          const PANEL_HEIGHT = 560;
          const top = Math.min(Math.max(ay - 24, 8), vh - PANEL_HEIGHT - 8);
          const maxHeight = vh - top - 8;
          return { right: "1rem", top, maxHeight };
        })()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 shrink-0">
          <h2 className="font-semibold text-gray-900 text-base">
            {isEdit ? `Edit — ${player!.canonical_name}` : "Add Player"}
          </h2>
          <button onClick={onClose} className="rounded p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">
          <div>
            <label className="block text-[10px] font-mono tracking-wider text-gray-500 mb-1.5 uppercase">
              Canonical Name <span className="text-red-500">*</span>
            </label>
            <input type="text" value={canonicalName} onChange={(e) => setCanonicalName(e.target.value)}
              placeholder="e.g. Patrick Mahomes" className={inputClass} />
          </div>
          <div>
            <label className="block text-[10px] font-mono tracking-wider text-gray-500 mb-1.5 uppercase">Aliases</label>
            <p className="text-xs text-gray-400 mb-2">Alternate spellings or nicknames that map to this player.</p>
            <AliasInput value={aliases} onChange={setAliases} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-mono tracking-wider text-gray-500 mb-1.5 uppercase">Sport</label>
              <input type="text" value={sport} onChange={(e) => setSport(e.target.value)} placeholder="NFL / NBA / MLB…" className={inputClass} />
            </div>
            <div>
              <label className="block text-[10px] font-mono tracking-wider text-gray-500 mb-1.5 uppercase">Position</label>
              <input type="text" value={position} onChange={(e) => setPosition(e.target.value)} placeholder="QB / WR / PG…" className={inputClass} />
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-mono tracking-wider text-gray-500 mb-1.5 uppercase">Team</label>
            <input type="text" value={team} onChange={(e) => setTeam(e.target.value)} placeholder="e.g. Kansas City Chiefs" className={inputClass} />
          </div>
          <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-gray-900">Active</p>
              <p className="text-xs text-gray-500 mt-0.5">Inactive players are hidden from auto-suggest.</p>
            </div>
            <button type="button" onClick={() => setActive((p) => !p)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${active ? "bg-gray-900" : "bg-gray-300"}`}>
              <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${active ? "translate-x-5" : "translate-x-0.5"}`} />
            </button>
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <div className="flex items-center gap-3 pt-2 pb-2">
            <button onClick={handleSave} disabled={isPending}
              className="rounded-lg bg-gray-900 text-white px-5 py-2.5 text-sm font-semibold hover:bg-gray-700 disabled:opacity-50 transition-colors">
              {isPending ? "Saving…" : isEdit ? "Save changes" : "Add player"}
            </button>
            <button onClick={onClose}
              className="rounded-lg border border-gray-300 px-5 py-2.5 text-sm text-gray-500 hover:text-gray-900 hover:border-gray-500 transition-colors">
              Cancel
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}

// ── Merge modal ───────────────────────────────────────────────────────────────
function MergeModal({
  selected,
  onClose,
  onMerged,
}: {
  selected: Player[];
  onClose: () => void;
  onMerged: (keepId: string, mergeIds: string[], newAliases: string[]) => void;
}) {
  const [keepId, setKeepId] = useState(selected[0]?.player_id ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const keeper = selected.find((p) => p.player_id === keepId);
  const merging = selected.filter((p) => p.player_id !== keepId);

  function handleMerge() {
    if (!keepId) { setError("Pick a player to keep."); return; }
    startTransition(async () => {
      const result = await mergePlayers(keepId, merging.map((p) => p.player_id));
      if (result.success) {
        // Build the same alias set the server computed so local state matches
        const newAliasSet = new Set<string>(keeper!.aliases ?? []);
        for (const mp of merging) {
          newAliasSet.add(mp.canonical_name);
          for (const a of mp.aliases ?? []) newAliasSet.add(a);
        }
        newAliasSet.delete(keeper!.canonical_name);
        onMerged(keepId, merging.map((p) => p.player_id), [...newAliasSet]);
      } else {
        setError(result.error ?? "Merge failed.");
      }
    });
  }

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-2xl border border-gray-200 w-full max-w-lg p-6 space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-900">Merge Players</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-700 transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>

          <p className="text-sm text-gray-500">
            Choose which player to <span className="font-semibold text-gray-900">keep</span>. The others will be deleted — their canonical names automatically become aliases on the kept player.
          </p>

          {/* Player picker */}
          <div className="space-y-2">
            {selected.map((p) => {
              const isKeeper = p.player_id === keepId;
              return (
                <button
                  key={p.player_id}
                  type="button"
                  onClick={() => setKeepId(p.player_id)}
                  className={`w-full text-left rounded-lg border px-4 py-3 transition-colors ${
                    isKeeper
                      ? "border-gray-900 bg-gray-900 text-white"
                      : "border-gray-300 bg-white text-gray-700 hover:border-gray-500"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-sm">{p.canonical_name}</p>
                      {(p.aliases ?? []).length > 0 && (
                        <p className={`text-xs mt-0.5 ${isKeeper ? "text-gray-300" : "text-gray-400"}`}>
                          Aliases: {p.aliases.join(", ")}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {p.takes_count != null && p.takes_count > 0 && (
                        <span className={`text-xs font-mono ${isKeeper ? "text-gray-300" : "text-gray-400"}`}>
                          {p.takes_count} takes
                        </span>
                      )}
                      {isKeeper ? (
                        <span className="text-xs font-bold uppercase tracking-wider bg-white text-gray-900 rounded px-2 py-0.5">
                          KEEP
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400 uppercase tracking-wider">merge away</span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Preview */}
          {keeper && merging.length > 0 && (
            <div className="rounded-lg bg-gray-50 border border-gray-200 px-4 py-3 space-y-1">
              <p className="text-[10px] font-mono tracking-wider text-gray-500 uppercase">Result preview</p>
              <p className="text-sm font-semibold text-gray-900">{keeper.canonical_name}</p>
              <p className="text-xs text-gray-500">
                Aliases will include:{" "}
                <span className="text-gray-700">
                  {[
                    ...(keeper.aliases ?? []),
                    ...merging.map((p) => p.canonical_name),
                    ...merging.flatMap((p) => p.aliases ?? []),
                  ]
                    .filter((a) => a !== keeper.canonical_name)
                    .filter((a, i, arr) => arr.indexOf(a) === i)
                    .join(", ") || "none"}
                </span>
              </p>
            </div>
          )}

          {error && <p className="text-sm text-red-500">{error}</p>}

          <div className="flex items-center gap-3">
            <button
              onClick={handleMerge}
              disabled={isPending || !keepId}
              className="rounded-lg bg-gray-900 text-white px-5 py-2.5 text-sm font-semibold hover:bg-gray-700 disabled:opacity-50 transition-colors"
            >
              {isPending ? "Merging…" : `Merge ${merging.length} into ${keeper?.canonical_name ?? "…"}`}
            </button>
            <button onClick={onClose}
              className="rounded-lg border border-gray-300 px-5 py-2.5 text-sm text-gray-500 hover:text-gray-900 hover:border-gray-500 transition-colors">
              Cancel
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function PlayersClient({ initialPlayers }: { initialPlayers: Player[] }) {
  const [players, setPlayers] = useState<Player[]>(initialPlayers);
  const [search, setSearch] = useState("");
  const [drawerPlayer, setDrawerPlayer] = useState<Player | null | "new">(null);
  const [drawerAnchorY, setDrawerAnchorY] = useState<number | undefined>(undefined);
  const [importMsg, setImportMsg] = useState<string | null>(null);
  const [isImporting, startImport] = useTransition();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showMerge, setShowMerge] = useState(false);

  const filtered = players.filter((p) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      p.canonical_name.toLowerCase().includes(q) ||
      (p.aliases ?? []).some((a) => a.toLowerCase().includes(q)) ||
      (p.sport ?? "").toLowerCase().includes(q) ||
      (p.team ?? "").toLowerCase().includes(q)
    );
  });

  const selectedPlayers = players.filter((p) => selectedIds.has(p.player_id));

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (filtered.every((p) => selectedIds.has(p.player_id))) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map((p) => p.player_id)));
    }
  }

  function handleSaved(saved: Player) {
    setPlayers((prev) => {
      const idx = prev.findIndex((p) => p.player_id === saved.player_id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], ...saved };
        return next;
      }
      return [...prev, saved].sort((a, b) => a.canonical_name.localeCompare(b.canonical_name));
    });
    setDrawerPlayer(null);
  }

  function handleMerged(keepId: string, mergeIds: string[], newAliases: string[]) {
    setPlayers((prev) =>
      prev
        .filter((p) => !mergeIds.includes(p.player_id))
        .map((p) => p.player_id === keepId ? { ...p, aliases: newAliases } : p)
    );
    setSelectedIds(new Set());
    setShowMerge(false);
  }

  async function handleDelete(player: Player) {
    if (!confirm(`Delete "${player.canonical_name}"? This cannot be undone.`)) return;
    setDeletingId(player.player_id);
    const result = await deletePlayer(player.player_id);
    if (result.success) {
      setPlayers((prev) => prev.filter((p) => p.player_id !== player.player_id));
      setSelectedIds((prev) => { const n = new Set(prev); n.delete(player.player_id); return n; });
    } else {
      alert(`Delete failed: ${result.error}`);
    }
    setDeletingId(null);
  }

  async function bulkDelete() {
    if (!confirm(`Permanently delete ${selectedIds.size} player${selectedIds.size !== 1 ? "s" : ""}? This cannot be undone.`)) return;
    for (const id of [...selectedIds]) {
      await deletePlayer(id);
      setPlayers((prev) => prev.filter((p) => p.player_id !== id));
    }
    setSelectedIds(new Set());
  }

  function handleImport() {
    setImportMsg(null);
    startImport(async () => {
      const result = await importPlayersFromTags();
      if (result.success) {
        setImportMsg(
          result.imported === 0
            ? "All tag names already in registry — nothing new to import."
            : `Imported ${result.imported} new player${result.imported === 1 ? "" : "s"} from take tags.`
        );
        const { getPlayers: gp, getPlayerTakeCounts: gc } = await import("@/app/actions/players");
        const [fresh, counts] = await Promise.all([gp(), gc()]);
        setPlayers(fresh.map((p) => ({ ...p, takes_count: counts[p.player_id] ?? 0 })));
      } else {
        setImportMsg(`Import failed: ${result.error}`);
      }
    });
  }

  const allFilteredSelected = filtered.length > 0 && filtered.every((p) => selectedIds.has(p.player_id));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold">Manage Players</h1>
          <p className="mt-1 text-gray-500">Player registry — canonical names, aliases, and take counts.</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <button onClick={handleImport} disabled={isImporting}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-600 hover:border-gray-500 hover:text-gray-900 disabled:opacity-50 transition-colors">
            {isImporting ? "Importing…" : "⬇ Import from tags"}
          </button>
          <button onClick={(e) => { setDrawerAnchorY(e.clientY); setDrawerPlayer("new"); }}
            className="rounded-lg bg-gray-900 text-white px-4 py-2 text-sm font-semibold hover:bg-gray-700 transition-colors">
            + Add Player
          </button>
        </div>
      </div>

      {/* Import result message */}
      {importMsg && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 flex items-center justify-between gap-3">
          <p className="text-sm text-blue-800">{importMsg}</p>
          <button onClick={() => setImportMsg(null)} className="text-blue-400 hover:text-blue-700 text-lg leading-none">×</button>
        </div>
      )}

      {/* Search */}
      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search by name, alias, sport, or team…"
        className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-gray-500"
      />

      {/* Bulk action bar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 rounded-lg bg-gray-900 text-white px-4 py-2.5 flex-wrap">
          <span className="font-mono text-xs font-semibold">{selectedIds.size} selected</span>
          <button onClick={() => setSelectedIds(new Set())} className="text-[11px] text-gray-400 hover:text-white underline">
            Deselect all
          </button>
          <div className="flex-1" />
          {selectedIds.size >= 2 && (
            <button
              onClick={() => setShowMerge(true)}
              className="px-3 py-1.5 rounded bg-blue-600 hover:bg-blue-500 text-xs font-semibold transition-colors"
            >
              Merge {selectedIds.size} players
            </button>
          )}
          <button
            onClick={bulkDelete}
            className="px-3 py-1.5 rounded bg-red-600 hover:bg-red-500 text-xs font-semibold transition-colors"
          >
            Delete {selectedIds.size} players
          </button>
        </div>
      )}

      {/* Table */}
      <div className="rounded-xl border border-gray-300 overflow-hidden" style={{ backgroundColor: "#f5f0e6" }}>
        {/* Table header */}
        <div className="hidden md:grid grid-cols-[32px_2fr_1fr_1fr_80px_80px_120px] gap-4 px-4 py-2.5 border-b border-gray-300 bg-gray-100 items-center">
          <input
            type="checkbox"
            checked={allFilteredSelected}
            onChange={toggleSelectAll}
            className="h-4 w-4 rounded border-gray-400 accent-gray-900 cursor-pointer"
          />
          {["Canonical Name", "Sport", "Team", "Aliases", "Takes", "Actions"].map((h) => (
            <span key={h} className="text-[10px] font-mono tracking-wider text-gray-500 uppercase">{h}</span>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="px-5 py-12 text-center text-gray-400">
            {players.length === 0
              ? 'No players yet. Click "Import from tags" or "+ Add Player" to get started.'
              : "No players match your search."}
          </div>
        )}

        <div className="divide-y divide-gray-200">
          {filtered.map((player) => {
            const isSelected = selectedIds.has(player.player_id);
            return (
              <div
                key={player.player_id}
                className={`px-4 py-3 md:grid md:grid-cols-[32px_2fr_1fr_1fr_80px_80px_120px] md:gap-4 md:items-center flex flex-col gap-2 transition-colors ${isSelected ? "bg-blue-50" : ""}`}
              >
                {/* Checkbox */}
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => toggleSelect(player.player_id)}
                  className="h-4 w-4 rounded border-gray-400 accent-gray-900 cursor-pointer shrink-0"
                />

                {/* Canonical name + active badge */}
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-semibold text-sm text-gray-900 truncate">{player.canonical_name}</span>
                  {!player.active && (
                    <span className="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-mono bg-gray-200 text-gray-500">inactive</span>
                  )}
                </div>

                {/* Sport */}
                <span className="text-sm text-gray-600">{player.sport || <span className="text-gray-300">—</span>}</span>

                {/* Team */}
                <span className="text-sm text-gray-600 truncate">{player.team || <span className="text-gray-300">—</span>}</span>

                {/* Alias count */}
                <span className="text-sm text-gray-500">
                  {(player.aliases ?? []).length > 0 ? (
                    <span className="cursor-default" title={(player.aliases ?? []).join(", ")}>
                      {player.aliases.length} alias{player.aliases.length !== 1 ? "es" : ""}
                    </span>
                  ) : (
                    <span className="text-gray-300">—</span>
                  )}
                </span>

                {/* Takes count */}
                <span className="text-sm font-mono text-gray-600">{player.takes_count ?? 0}</span>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <button onClick={(e) => { setDrawerAnchorY(e.clientY); setDrawerPlayer(player); }}
                    className="rounded-lg border border-gray-300 px-3 py-1 text-xs text-gray-600 hover:border-gray-500 hover:text-gray-900 transition-colors">
                    Edit
                  </button>
                  <button onClick={() => handleDelete(player)} disabled={deletingId === player.player_id}
                    className="rounded-lg border border-red-200 text-red-400 hover:border-red-400 hover:text-red-600 hover:bg-red-50 px-2 py-1 text-xs transition-colors disabled:opacity-40"
                    title="Delete player">
                    {deletingId === player.player_id ? "…" : "🗑"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Summary */}
      {players.length > 0 && (
        <p className="text-xs text-gray-400 font-mono">
          {filtered.length} of {players.length} player{players.length !== 1 ? "s" : ""}
          {search && " matching search"}
        </p>
      )}

      <Link href="/admin" className="inline-block text-sm text-gray-500 hover:text-gray-800 transition-colors">
        ← Back to Admin
      </Link>

      {/* Edit / Add drawer */}
      {drawerPlayer !== null && (
        <PlayerDrawer
          player={drawerPlayer === "new" ? null : drawerPlayer}
          onClose={() => { setDrawerPlayer(null); setDrawerAnchorY(undefined); }}
          onSaved={handleSaved}
          anchorY={drawerAnchorY}
        />
      )}

      {/* Merge modal */}
      {showMerge && selectedPlayers.length >= 2 && (
        <MergeModal
          selected={selectedPlayers}
          onClose={() => setShowMerge(false)}
          onMerged={(keepId, mergeIds, newAliases) => handleMerged(keepId, mergeIds, newAliases)}
        />
      )}
    </div>
  );
}
