/**
 * Returns the canonical public URL for an expert page.
 * Uses the slug (Twitter-handle-based) when available, falls back to UUID.
 */
export function expertUrl(
  expert: { expert_id: string; slug?: string | null },
  suffix?: string,
): string {
  const base = `/experts/${expert.slug ?? expert.expert_id}`;
  return suffix ? `${base}${suffix}` : base;
}
