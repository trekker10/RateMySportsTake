"use client";

import { useState, useTransition } from "react";
import { getExpertTakesPage, type ProfileTake } from "@/app/actions/takes";
import TakeCard from "@/components/TakeCard";

const PAGE_SIZE = 10;

interface ExpertStub {
  expert_id: string;
  name: string;
  slug: string | null;
  outlet: string | null;
  avatar_url: string | null;
}

interface Props {
  expert: ExpertStub;
  expertId: string;
  initialTakes: ProfileTake[];
  totalTakes: number;
  verdict: string;
  gradeMin: number | null;
  gradeMax: number | null;
  activeGrade: string | null;
  isLoggedIn?: boolean;
  isAdmin?: boolean;
  followedTakeIds?: string[];
}

export default function TakeLogSection({
  expert,
  expertId,
  initialTakes,
  totalTakes,
  verdict,
  gradeMin,
  gradeMax,
  isLoggedIn = false,
  isAdmin = false,
  followedTakeIds = [],
}: Props) {
  const [takes, setTakes] = useState<ProfileTake[]>(initialTakes);
  const [isPending, startTransition] = useTransition();

  const hasMore = takes.length < totalTakes;

  function loadMore() {
    startTransition(async () => {
      const next = await getExpertTakesPage(
        expertId, verdict, gradeMin, gradeMax, takes.length, PAGE_SIZE
      );
      setTakes((prev) => [...prev, ...next]);
    });
  }

  return (
    <div>
      {takes.length > 0 ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          {takes.map((take) => {
            const takeWithExpert = {
              ...take,
              experts: {
                expert_id: expert.expert_id,
                name:      expert.name,
                slug:      expert.slug,
                outlet:    expert.outlet ?? null,
                avatar_url: expert.avatar_url ?? null,
              },
            };
            return (
              <TakeCard
                key={take.take_id}
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                take={takeWithExpert as any}
                showExpert={true}
                showFollow
                isLoggedIn={isLoggedIn}
                isAdmin={isAdmin}
                isFollowing={followedTakeIds.includes(take.take_id)}
              />
            );
          })}
        </div>
      ) : (
        <div className="py-12 text-center italic text-gray-400">
          No takes found for this filter.
        </div>
      )}

      <div className="mt-6 flex items-center justify-between border-t-2 border-gray-900 pt-4">
        {hasMore ? (
          <button
            onClick={loadMore}
            disabled={isPending}
            className="italic text-gray-500 hover:text-gray-900 text-sm transition-colors disabled:opacity-50"
          >
            {isPending ? "Loading…" : `See all ${totalTakes} takes`}
          </button>
        ) : (
          <span className="italic text-gray-400 text-sm">
            {takes.length === 0 ? "No takes" : `All ${takes.length} takes shown`}
          </span>
        )}
        <span className="font-black text-xl text-gray-400">→</span>
      </div>
    </div>
  );
}
