import { timingSafeEqual } from "node:crypto";

/**
 * Constant-time comparison of an incoming X-API-Key header against the
 * configured APPLICATIONS_API_KEY. Returns false for any mismatch, missing
 * input, or missing env config.
 */
export function isValidApiKey(provided: string | null | undefined): boolean {
  const expected = process.env.APPLICATIONS_API_KEY;
  if (!expected || !provided) return false;

  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;

  return timingSafeEqual(a, b);
}
