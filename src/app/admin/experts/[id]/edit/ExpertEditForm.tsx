"use client";

import { useState, useTransition } from "react";
import { updateExpert } from "@/app/actions/experts";

const inputClass =
  "w-full rounded-lg bg-zinc-900 border border-zinc-700 px-4 py-2.5 text-zinc-50 placeholder-zinc-600 focus:border-emerald-500 focus:outline-none";

export default function ExpertEditForm({ expert }: { expert: Record<string, unknown> }) {
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

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
    </form>
  );
}
