const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const EARLIEST_YEAR = 1900;

export function parseDateOfBirth(raw: string): Date | null {
  if (!ISO_DATE_PATTERN.test(raw)) return null;
  const parsed = new Date(`${raw}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return null;
  // Guard against JS silently rolling over invalid calendar dates
  // like "1990-02-31" into March 3. Round-trip and compare.
  if (parsed.toISOString().slice(0, 10) !== raw) return null;
  return parsed;
}

export function validateDateOfBirth(raw: string, now: Date = new Date()): string | null {
  if (!raw) return "Date of birth is required";
  if (!ISO_DATE_PATTERN.test(raw)) return "Use YYYY-MM-DD format";

  const parsed = parseDateOfBirth(raw);
  if (!parsed) return "Not a valid date";
  if (parsed.getTime() > now.getTime()) return "Date of birth cannot be in the future";
  if (parsed.getUTCFullYear() < EARLIEST_YEAR) return "Date of birth is unrealistic";

  return null;
}
