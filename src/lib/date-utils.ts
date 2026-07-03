/**
 * Returns the UTC start and end instants (as ISO strings) that bracket
 * the current calendar day in US Eastern time (handles EDT/EST automatically).
 *
 * Use this for "added today" queries so that takes submitted at e.g. 11pm ET
 * are counted on the correct Eastern calendar day rather than slipping into
 * the next UTC day.
 */
export function easternDayBoundsUtc(): { start: string; end: string } {
  const now = new Date();

  // Get today's and tomorrow's date strings in Eastern time (YYYY-MM-DD)
  const etToday    = now.toLocaleDateString("en-CA", { timeZone: "America/New_York" });
  const etTomorrow = new Date(now.getTime() + 86400000)
                       .toLocaleDateString("en-CA", { timeZone: "America/New_York" });

  // Convert an Eastern calendar date's midnight to the correct UTC instant.
  // Try UTC-4 (EDT) and UTC-5 (EST); pick the offset where the Eastern date
  // still reads as the target date — this handles DST transitions correctly.
  function etMidnightToUtc(dateStr: string): Date {
    for (const offsetHours of [4, 5]) {
      const candidate = new Date(`${dateStr}T00:00:00Z`);
      candidate.setUTCHours(offsetHours); // ET midnight = UTC 04:00 or 05:00
      const check = candidate.toLocaleDateString("en-CA", { timeZone: "America/New_York" });
      if (check === dateStr) return candidate;
    }
    // Fallback (should never be reached): EST offset
    return new Date(`${dateStr}T05:00:00Z`);
  }

  return {
    start: etMidnightToUtc(etToday).toISOString(),
    end:   etMidnightToUtc(etTomorrow).toISOString(),
  };
}
