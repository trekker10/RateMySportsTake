"use client";

import { useState } from "react";
import { upsertShow, deleteShow, type Show } from "@/app/actions/shows";
import { useRouter } from "next/navigation";

function ShowForm({
  initial,
  onDone,
  onCancel,
}: {
  initial?: Show;
  onDone: () => void;
  onCancel: () => void;
}) {
  const [name, setName]       = useState(initial?.name ?? "");
  const [network, setNetwork] = useState(initial?.network ?? "");
  const [logoUrl, setLogoUrl] = useState(initial?.logo_url ?? "");
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const res = await upsertShow({
      show_id: initial?.show_id,
      name: name.trim(),
      network: network.trim() || null,
      logo_url: logoUrl.trim() || null,
    });
    setSaving(false);
    if (!res.success) { setError(res.error); return; }
    onDone();
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border border-zinc-700 bg-zinc-800 p-5 space-y-4">
      <h3 className="text-sm font-semibold text-zinc-200">
        {initial ? "Edit Show" : "Add Show"}
      </h3>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-mono text-zinc-400 mb-1 uppercase tracking-wider">Show Name *</label>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            required
            placeholder="The Herd with Colin Cowherd"
            className="w-full rounded-lg border border-zinc-600 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-zinc-400"
          />
        </div>
        <div>
          <label className="block text-xs font-mono text-zinc-400 mb-1 uppercase tracking-wider">Network / Platform</label>
          <input
            value={network}
            onChange={e => setNetwork(e.target.value)}
            placeholder="FS1, ESPN, Podcast…"
            className="w-full rounded-lg border border-zinc-600 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-zinc-400"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-mono text-zinc-400 mb-1 uppercase tracking-wider">Logo URL</label>
        <input
          value={logoUrl}
          onChange={e => setLogoUrl(e.target.value)}
          placeholder="https://…/logo.png"
          className="w-full rounded-lg border border-zinc-600 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-zinc-400"
        />
      </div>

      {/* Logo preview */}
      {logoUrl.trim() && (
        <div className="flex items-center gap-3">
          <span className="text-xs text-zinc-500 font-mono uppercase tracking-wider">Preview:</span>
          <img
            src={logoUrl.trim()}
            alt="logo preview"
            className="h-10 max-w-[160px] object-contain rounded bg-white p-1"
            onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
          />
        </div>
      )}

      {error && <p className="text-sm text-red-400">{error}</p>}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={saving || !name.trim()}
          className="rounded-lg bg-green-700 px-4 py-2 text-sm font-semibold text-white hover:bg-green-600 disabled:opacity-50 transition-colors"
        >
          {saving ? "Saving…" : initial ? "Save Changes" : "Add Show"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-zinc-600 px-4 py-2 text-sm text-zinc-300 hover:border-zinc-400 transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

export default function ShowsClient({ initialShows }: { initialShows: Show[] }) {
  const router = useRouter();
  const [shows, setShows]         = useState<Show[]>(initialShows);
  const [adding, setAdding]       = useState(false);
  const [editId, setEditId]       = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  function refresh() {
    router.refresh();
    setAdding(false);
    setEditId(null);
  }

  async function handleDelete(showId: string) {
    if (!confirm("Delete this show? This cannot be undone.")) return;
    setDeletingId(showId);
    await deleteShow(showId);
    setShows(s => s.filter(x => x.show_id !== showId));
    setDeletingId(null);
  }

  return (
    <div className="space-y-4">
      {/* Add button */}
      {!adding && (
        <button
          onClick={() => setAdding(true)}
          className="rounded-lg bg-zinc-800 border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-200 hover:border-zinc-500 hover:text-white transition-colors"
        >
          + Add Show
        </button>
      )}

      {/* Add form */}
      {adding && (
        <ShowForm onDone={refresh} onCancel={() => setAdding(false)} />
      )}

      {/* Shows list */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 divide-y divide-zinc-800">
        {shows.length === 0 && !adding && (
          <p className="px-5 py-10 text-center text-zinc-500 text-sm">
            No shows yet. Add your first one above.
          </p>
        )}

        {shows.map(show => (
          <div key={show.show_id}>
            {editId === show.show_id ? (
              <div className="p-4">
                <ShowForm
                  initial={show}
                  onDone={refresh}
                  onCancel={() => setEditId(null)}
                />
              </div>
            ) : (
              <div className="flex items-center gap-4 px-5 py-4">
                {/* Logo */}
                <div className="shrink-0 w-14 h-10 rounded bg-white flex items-center justify-center overflow-hidden">
                  {show.logo_url ? (
                    <img
                      src={show.logo_url}
                      alt={show.name}
                      className="max-h-full max-w-full object-contain p-0.5"
                    />
                  ) : (
                    <span className="text-[10px] text-zinc-400 font-mono text-center leading-tight px-1">NO LOGO</span>
                  )}
                </div>

                {/* Name + network */}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-zinc-100 truncate">{show.name}</p>
                  {show.network && (
                    <p className="text-xs font-mono text-zinc-500 uppercase tracking-wider mt-0.5">{show.network}</p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => setEditId(show.show_id)}
                    className="rounded-lg border border-zinc-700 px-3 py-1.5 text-sm text-zinc-300 hover:border-zinc-500 hover:text-zinc-100 transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(show.show_id)}
                    disabled={deletingId === show.show_id}
                    className="rounded-lg border border-red-900 px-3 py-1.5 text-sm text-red-400 hover:border-red-700 hover:text-red-300 transition-colors disabled:opacity-40"
                  >
                    {deletingId === show.show_id ? "…" : "Delete"}
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
