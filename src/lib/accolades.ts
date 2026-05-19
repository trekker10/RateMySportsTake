export type Accolade = {
  emoji: string;
  label: string;
  className: string;
};

type ExpertSnap = {
  expert_id: string;
  overall_rating: number;
  graded_takes: number;
};

type RecentTake = {
  expert_id: string;
  grade: number | null;
  outcome_status: string;
  difficulty_score: number | null;
};

export function computeAccolades(
  expertId: string,
  overallRating: number,
  allExperts: ExpertSnap[],
  recentTakes: RecentTake[]
): Accolade[] {
  const accolades: Accolade[] = [];
  const myTakes = recentTakes.filter((t) => t.expert_id === expertId);

  // Elite / Landfill — rank among experts with at least 1 graded take
  const ranked = [...allExperts]
    .filter((e) => e.graded_takes > 0 && e.overall_rating > 0)
    .sort((a, b) => b.overall_rating - a.overall_rating);

  if (ranked.length >= 5) {
    const idx = ranked.findIndex((e) => e.expert_id === expertId);
    if (idx !== -1) {
      const pct = (idx + 1) / ranked.length;
      if (pct <= 0.1)
        accolades.push({ emoji: "🏆", label: "Elite Analyst", className: "bg-amber-100 text-amber-700 border border-amber-200" });
      else if (pct >= 0.9)
        accolades.push({ emoji: "🗑️", label: "Take Landfill", className: "bg-red-100 text-red-600 border border-red-200" });
    }
  }

  // On a Heater / In Freefall — recent graded takes vs overall rating
  const gradedRecent = myTakes.filter((t) => t.grade !== null);
  if (gradedRecent.length >= 2 && overallRating > 0) {
    const recentAvg = gradedRecent.reduce((s, t) => s + (t.grade ?? 0), 0) / gradedRecent.length;
    if (recentAvg >= overallRating + 10)
      accolades.push({ emoji: "📈", label: "On a Heater", className: "bg-emerald-100 text-emerald-700 border border-emerald-200" });
    else if (recentAvg <= overallRating - 15)
      accolades.push({ emoji: "📉", label: "In Freefall", className: "bg-orange-100 text-orange-700 border border-orange-200" });
  }

  // On Fire — recent high-grade confirmed take
  if (myTakes.some((t) => (t.grade ?? 0) >= 85 && t.outcome_status === "confirmed_true"))
    accolades.push({ emoji: "🔥", label: "On Fire", className: "bg-orange-50 text-orange-600 border border-orange-200" });

  // Big Take Alert — recent boldness 9 or 10
  if (myTakes.some((t) => (t.difficulty_score ?? 0) >= 9))
    accolades.push({ emoji: "🚨", label: "BIG TAKE ALERT", className: "bg-red-50 text-red-600 border border-red-300 font-semibold" });

  return accolades;
}
