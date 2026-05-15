"use client";

import { useState, useTransition } from "react";
import { followExpert, unfollowExpert } from "@/app/actions/follows";

interface Props {
  expertId: string;
  initialFollowing: boolean;
  isLoggedIn: boolean;
}

export default function FollowButton({ expertId, initialFollowing, isLoggedIn }: Props) {
  const [following, setFollowing] = useState(initialFollowing);
  const [isPending, startTransition] = useTransition();

  if (!isLoggedIn) {
    return (
      <a
        href="/auth/login"
        className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-400 hover:border-zinc-500 hover:text-zinc-200 transition-colors"
      >
        Login to follow
      </a>
    );
  }

  function handleClick() {
    startTransition(async () => {
      if (following) {
        await unfollowExpert(expertId);
        setFollowing(false);
      } else {
        await followExpert(expertId);
        setFollowing(true);
      }
    });
  }

  return (
    <button
      onClick={handleClick}
      disabled={isPending}
      className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50 ${
        following
          ? "bg-zinc-800 text-zinc-300 hover:bg-zinc-700 border border-zinc-700"
          : "bg-emerald-500 text-black hover:bg-emerald-400"
      }`}
    >
      {isPending ? "…" : following ? "Following" : "Follow"}
    </button>
  );
}
