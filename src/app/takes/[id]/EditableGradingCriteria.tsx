"use client";

import { useState, useTransition } from "react";
import { updateGradingCriteria } from "@/app/actions/takes";

export default function EditableGradingCriteria({
  takeId,
  initial,
}: {
  takeId: string;
  initial: string;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(initial);
  const [saved, setSaved] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleSave() {
    startTransition(async () => {
      await updateGradingCriteria(takeId, value);
      setSaved(true);
      setEditing(false);
      setTimeout(() => setSaved(false), 3000);
    });
  }

  function handleCancel() {
    setValue(initial);
    setEditing(false);
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">
          Grading Criteria
        </p>
        <div className="flex items-center gap-3">
          {saved && <span className="text-xs text-emerald-500">✓ Saved</span>}
          {!editing && (
            <button
              onClick={() => setEditing(true)}
              className="text-xs text-gray-400 hover:text-gray-700 transition-colors border border-gray-200 rounded px-2 py-0.5"
            >
              Edit
            </button>
          )}
        </div>
      </div>

      {editing ? (
        <div className="space-y-3">
          <textarea
            value={value}
            onChange={e => setValue(e.target.value)}
            rows={4}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none resize-none"
            autoFocus
          />
          <p className="text-xs text-gray-400">
            This will be used when Claude grades this take. Be specific — describe exactly what outcome would make this TRUE.
          </p>
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={isPending || !value.trim()}
              className="px-4 py-1.5 rounded-lg bg-emerald-500 text-black text-xs font-semibold hover:bg-emerald-400 transition-colors disabled:opacity-50"
            >
              {isPending ? "Saving…" : "Save"}
            </button>
            <button
              onClick={handleCancel}
              className="px-4 py-1.5 rounded-lg border border-gray-200 text-gray-500 text-xs hover:border-gray-400 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <p className="text-gray-700 text-sm leading-relaxed">{value}</p>
      )}
    </div>
  );
}
