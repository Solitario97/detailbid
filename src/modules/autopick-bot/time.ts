// ---------------------------------------------------------------------------
// Small timezone helper. Railway containers run in UTC regardless of where
// the business operates, so "10:00 / 19:00 Asia/Almaty" has to be computed
// from the configured IANA timezone name, not the server's own local time.
// Uses only the built-in Intl API — no new dependency (date-fns, the one
// date library already in this project, does not ship timezone support).
// ---------------------------------------------------------------------------

export interface TimeZoneParts {
  /** Calendar date in that timezone, formatted "YYYY-MM-DD". */
  date: string;
  /** Local hour in that timezone, 0-23. */
  hour: number;
  /** Local minute in that timezone, 0-59. */
  minute: number;
}

export function getTimeZonePartsAt(timeZone: string, at: Date): TimeZoneParts {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });

  const parts = Object.fromEntries(formatter.formatToParts(at).map((p) => [p.type, p.value]));

  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    hour: Number(parts.hour),
    minute: Number(parts.minute),
  };
}
