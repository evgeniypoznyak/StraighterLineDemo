import { isKnownStateCode } from "../us-states";

export function validateUsStateCode(raw: string): string | null {
  if (!raw) return "State is required";
  if (!isKnownStateCode(raw.toUpperCase())) return "Select a valid US state";
  return null;
}
