"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateExpert, deleteExpert } from "@/app/actions/experts";

const inputClass =
  "w-full rounded-lg bg-white border border-gray-300 px-4 py-2.5 text-gray-900 placeholder-gray-400 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none";

export default function ExpertEditForm({ expert }: { expert: Record<string, unknown> }) {
  const router = useRouter();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleteInput, setDeleteInput] = useState("");
  const [isDeleting, startDelete] = useTransition();

  const id = expert.expert_id as string;
  const avatarUrl = expert.avatar_url as string | null;
  const [previewUrl, setPreviewUrl] = useState(avatarUrl ?? "");

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      try {
        await updateExpert(id, formData);
        setSaved(true);
      } catch {
        setError("Failed to save. Please try again.");
      }
    });
  }

  const initials = (expert.name as string)
    .split(" ")
    .map((w: string) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Avatar preview */}
      <div className="flex items-center gap-5">
        <div className="h-20 w-20 shrink-0 rounded-full overflow-hidden bg-zinc-800 flex items-center justify-center text-2xl font-bold text-zinc-300">
          {previewUrl ? (
            <img src={previewUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            initials
          )}
        </div>
        <div className="flex-1">
          <label className="block text-sm font-medium text-zinc-300 mb-1">
            Profile image URL
          </label>
          <input
            name="avatar_url"
            type="url"
            defaultValue={avatarUrl ?? ""}
            placeholder="https://pbs.twimg.com/profile_images/..."
            className={inputClass}
            onChange={(e) => setPreviewUrl(e.target.value)}
          />
          <p className="mt-1 text-xs text-zinc-600">Paste any public image URL — Twitter profile pics work great.</p>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-zinc-300 mb-1">
          Name <span className="text-emerald-400">*</span>
        </label>
        <input name="name" type="text" required defaultValue={expert.name as string} className={inputClass} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-1">Outlet</label>
          <input name="outlet" type="text" defaultValue={(expert.outlet as string) ?? ""} placeholder="e.g. ESPN" className={inputClass} />
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-1">Twitter / X handle</label>
          <input name="twitter_handle" type="text" defaultValue={(expert.twitter_handle as string) ?? ""} placeholder="@stephenasmith" className={inputClass} />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-zinc-300 mb-1">Bio</label>
        <textarea
          name="bio"
          rows={4}
          defaultValue={(expert.bio as string) ?? ""}
          placeholder="Short bio about this expert…"
          className={`${inputClass} resize-none`}
        />
      </div>

      {/* Verified analyst toggle */}
      <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-gray-900">Verified Analyst</p>
          <p className="text-xs text-gray-500 mt-0.5">
            Verified analysts appear on public leaderboards. Unverified profiles are hidden from rankings.
          </p>
        </div>
        <label className="relative inline-flex items-center cursor-pointer ml-6 shrink-0">
          <input
            type="checkbox"
            name="verified"
            value="true"
            defaultChecked={expert.verified as boolean}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500" />
        </label>
      </div>

      {/* Fantasy Guru toggle */}
      <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-gray-900">Fantasy Guru</p>
          <p className="text-xs text-gray-500 mt-0.5">
            Fantasy gurus appear on the Fantasy leaderboard instead of (or in addition to) the Analysts leaderboard.
          </p>
        </div>
        <label className="relative inline-flex items-center cursor-pointer ml-6 shrink-0">
          <input
            type="checkbox"
            name="is_fantasy_guru"
            value="true"
            defaultChecked={!!(expert.is_fantasy_guru as boolean)}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600" />
        </label>
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <div className="flex items-center gap-4">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg bg-emerald-500 px-6 py-2.5 font-semibold text-black hover:bg-emerald-400 disabled:opacity-50 transition-colors"
        >
          {isPending ? "Saving…" : "Save changes"}
        </button>
        {saved && <span className="text-sm text-emerald-400">✓ Saved</span>}
      </div>

      {/* Danger Zone */}
      <div className="mt-8 rounded-lg border border-red-300 bg-red-50 p-5 space-y-3">
        <p className="text-sm font-bold text-red-700 uppercase tracking-wide">Danger Zone</p>
        {!deleteConfirm ? (
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-gray-900">Delete this analyst</p>
              <p className="text-xs text-gray-500 mt-0.5">Permanently removes the analyst and all their takes. This cannot be undone.</p>
            </div>
            <button
              type="button"
              onClick={() => setDeleteConfirm(true)}
              className="ml-6 shrink-0 rounded-lg border border-red-400 text-red-600 px-4 py-2 text-sm font-semibold hover:bg-red-100 transition-colors"
            >
              Delete analyst
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-gray-700">
              Type <span className="font-mono font-bold text-red-700">{expert.name as string}</span> to confirm deletion of this analyst and all their takes:
            </p>
            <input
              type="text"
              value={deleteInput}
              onChange={e => setDeleteInput(e.target.value)}
              placeholder={expert.name as string}
              className="w-full rounded-lg border border-red-300 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-red-500"
            />
            <div className="flex items-center gap-3">
              <button
                type="button"
                disabled={deleteInput !== (expert.name as string) || isDeleting}
                onClick={() => {
                  startDelete(async () => {
                    const result = await deleteExpert(id);
                    if (result.success) {
                      router.push("/admin/experts");
                    } else {
                      setError(result.error ?? "Delete failed.");
                      setDeleteConfirm(false);
                      setDeleteInput("");
                    }
                  });
                }}
                className="rounded-lg bg-red-600 text-white px-4 py-2 text-sm font-semibold hover:bg-red-700 disabled:opacity-40 transition-colors"
              >
                {isDeleting ? "Deleting…" : "Confirm delete"}
              </button>
              <button
                type="button"
                onClick={() => { setDeleteConfirm(false); setDeleteInput(""); }}
                className="text-sm text-gray-500 hover:text-gray-800 underline"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </form>
  );
}
