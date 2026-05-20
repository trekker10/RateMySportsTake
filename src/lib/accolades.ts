export type Accolade = {
  emoji: string;
  label: string;
  className: string;
};

const ACCOLADE_STYLE: Record<string, string> = {
  elite_analyst:      "bg-amber-100 text-amber-700 border border-amber-200",
  sharp_mind:         "bg-emerald-100 text-emerald-700 border border-emerald-200",
  fading_fast:        "bg-orange-100 text-orange-700 border border-orange-200",
  take_landfill:      "bg-red-100 text-red-600 border border-red-200",
  dead_eye:           "bg-blue-100 text-blue-700 border border-blue-200",
  lock_of_century:    "bg-yellow-100 text-yellow-700 border border-yellow-200",
  fade_this_guy:      "bg-red-50 text-red-500 border border-red-200",
  broken_clock:       "bg-zinc-100 text-zinc-600 border border-zinc-200",
  scorched_earth:     "bg-orange-50 text-orange-600 border border-orange-200",
  on_a_heater:        "bg-emerald-100 text-emerald-700 border border-emerald-200",
  in_freefall:        "bg-red-100 text-red-600 border border-red-200",
  flip_flopper:       "bg-purple-100 text-purple-700 border border-purple-200",
  consistent_diamond: "bg-sky-100 text-sky-700 border border-sky-200",
  inactive:           "bg-zinc-100 text-zinc-500 border border-zinc-200",
};

export function accoladeToDisplay(key: string, emoji: string, label: string): Accolade {
  return {
    emoji,
    label,
    className: ACCOLADE_STYLE[key] ?? "bg-zinc-100 text-zinc-600 border border-zinc-200",
  };
}

// Kept for backwards compat — real accolades now come from expert_accolades table
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function computeAccolades(..._args: any[]): Accolade[] {
  return [];
}
