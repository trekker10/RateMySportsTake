"use client";

import { useState, useTransition } from "react";
import {
  addShowAccount,
  toggleShowAccount,
  deleteShowAccount,
  type ShowAccount,
} from "@/app/actions/show-accounts";

const NETWORKS = ["ESPN", "Fox Sports", "CBS Sports", "NBC Sports", "NFL Network", "The Athletic", "Barstool", "Other"];

function AddForm({ onAdded }: { onAdded: (a: ShowAccount) => void }) {
  const [open, setOpen] = useState(false);
  const [handle, setHandle] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [network, setNetwork] = useState("ESPN");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit() {
    if (!handle.trim() || !displayName.trim()) return;
    setError(null);
    startTransition(async () => {
      const result = await addShowAccount({ handle, display_name: displayName, network });
      if (result.success) {
        setHandle(""); setDisplayName(""); setNetwork("ESPN");
        setOpen(false);
        // Optimistically add a placeholder — page will revalidate for the real row
        onAdded({ id: crypto.randomUUID(), handle: handle.replace(/^@/, ""), display_name: displayName, network, active: true, created_at: new Date().toISOString() });
      } else {
        setError(result.error ?? "Failed to add");
      }
    });
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="px-4 py-2 rounded-lg text-sm font-semibold text-white transition-colors"
        style={{ backgroundColor: "#111827" }}
      >
        + Add Show Account
      </button>
    );
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-4">
      <h3 className="font-semibold text-gray-900">Add Show Account</h3>
      <div className="grid sm:grid-cols-3 gap-3">
        <div>
          <label className="block text-[10px] font-mono tracking-wider text-gray-500 mb-1 uppercase">X Handle</label>
          <input
            type="text"
            value={handle}
            onChange={e => setHandle(e.target.value)}
            placeholder="FirstTake"
            className="w-full rounded border border-gray-300 bg-white px-2.5 py-1.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-gray-500"
          />
        </div>
        <div>
          <label className="block text-[10px] font-mono tracking-wider text-gray-500 mb-1 uppercase">Display Name</label>
          <input
            type="text"
            value={displayName}
            onChange={e => setDisplayName(e.target.value)}
            placeholder="First Take"
            className="w-full rounded border border-gray-300 bg-white px-2.5 py-1.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-gray-500"
          />
        </div>
        <div>
          <label className="block text-[10px] font-mono tracking-wider text-gray-500 mb-1 uppercase">Network</label>
          <select
            value={network}
            onChange={e => setNetwork(e.target.value)}
            className="w-full rounded border border-gray-300 bg-white px-2.5 py-1.5 text-sm text-gray-900 focus:outline-none focus:border-gray-500"
          >
            {NETWORKS.map(n => <option key={n}>{n}</option>)}
          </select>
        </div>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-2">
        <button
          onClick={handleSubmit}
          disabled={isPending || !handle.trim() || !displayName.trim()}
          className="px-4 py-1.5 rounded-lg text-sm font-semibold text-white disabled:opacity-50 transition-colors"
          style={{ backgroundColor: "#111827" }}
        >
          {isPending ? "Adding…" : "Add Account"}
        </button>
        <button
          onClick={() => { setOpen(false); setError(null); }}
          className="px-4 py-1.5 rounded-lg border border-gray-300 text-sm text-gray-500 hover:text-gray-800 transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

function AccountRow({ account, onToggle, onDelete }: {
  account: ShowAccount;
  onToggle: (id: string, active: boolean) => void;
  onDelete: (id: string) => void;
}) {
  const [toggling, startToggle] = useTransition();
  const [deleting, startDelete] = useTransition();

  return (
    <div className="flex items-center gap-4 px-5 py-3.5">
      {/* Handle */}
      <div className="w-40 shrink-0">
        <a
          href={`https://x.com/${account.handle}`}
          target="_blank"
          rel="noopener noreferrer"
          className="font-mono text-sm font-semibold text-gray-900 hover:underline"
        >
          @{account.handle}
        </a>
      </div>

      {/* Display name */}
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-700">{account.display_name}</p>
      </div>

      {/* Network */}
      <div className="w-32 shrink-0">
        <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600">
          {account.network || "—"}
        </span>
      </div>

      {/* Active toggle */}
      <div className="w-20 shrink-0 flex items-center gap-2">
        <button
          onClick={() => startToggle(async () => {
            const result = await toggleShowAccount(account.id, !account.active);
            if (result.success) onToggle(account.id, !account.active);
          })}
          disabled={toggling}
          className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors disabled:opacity-50 ${
            account.active ? "bg-emerald-500" : "bg-gray-300"
          }`}
        >
          <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
            account.active ? "translate-x-[18px]" : "translate-x-[2px]"
          }`} />
        </button>
        <span className="text-xs text-gray-400">{account.active ? "On" : "Off"}</span>
      </div>

      {/* Delete */}
      <button
        onClick={() => {
          if (!confirm(`Remove @${account.handle}?`)) return;
          startDelete(async () => {
            const result = await deleteShowAccount(account.id);
            if (result.success) onDelete(account.id);
          });
        }}
        disabled={deleting}
        className="shrink-0 rounded border border-red-200 px-2 py-1 text-xs text-red-400 hover:border-red-400 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-40"
      >
        {deleting ? "…" : "Delete"}
      </button>
    </div>
  );
}

export default function ShowAccountsPanel({ initialAccounts }: { initialAccounts: ShowAccount[] }) {
  const [accounts, setAccounts] = useState<ShowAccount[]>(initialAccounts);

  function handleToggle(id: string, active: boolean) {
    setAccounts(prev => prev.map(a => a.id === id ? { ...a, active } : a));
  }
  function handleDelete(id: string) {
    setAccounts(prev => prev.filter(a => a.id !== id));
  }
  function handleAdded(a: ShowAccount) {
    setAccounts(prev => [...prev, a].sort((x, y) => x.display_name.localeCompare(y.display_name)));
  }

  const active   = accounts.filter(a => a.active).length;
  const inactive = accounts.filter(a => !a.active).length;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <p className="text-sm text-gray-500">
          {active} active · {inactive} inactive · {accounts.length} total
        </p>
        <div className="flex items-center gap-3">
          <a
            href="/api/show-accounts"
            target="_blank"
            className="text-xs font-mono text-gray-400 hover:text-gray-700 underline"
          >
            View JSON →
          </a>
          <AddForm onAdded={handleAdded} />
        </div>
      </div>

      {accounts.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white px-5 py-12 text-center italic text-gray-400">
          No show accounts yet. Add one above.
        </div>
      ) : (
        <div className="rounded-xl border border-gray-200 bg-white divide-y divide-gray-100">
          {/* Header */}
          <div className="flex items-center gap-4 px-5 py-2 bg-gray-50 rounded-t-xl">
            <div className="w-40 shrink-0 text-[10px] font-mono tracking-wider text-gray-400 uppercase">Handle</div>
            <div className="flex-1 text-[10px] font-mono tracking-wider text-gray-400 uppercase">Display Name</div>
            <div className="w-32 shrink-0 text-[10px] font-mono tracking-wider text-gray-400 uppercase">Network</div>
            <div className="w-20 shrink-0 text-[10px] font-mono tracking-wider text-gray-400 uppercase">Active</div>
            <div className="w-14 shrink-0" />
          </div>
          {accounts.map(account => (
            <AccountRow
              key={account.id}
              account={account}
              onToggle={handleToggle}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}
