export const SSN_PATTERN = /^\d{3}-?\d{2}-?\d{4}$/;

/**
 * Normalize any accepted SSN shape (with or without dashes) to `XXX-XX-XXXX`.
 * Safe to call only on strings that have already passed SSN_PATTERN.
 */
export function normalizeSsn(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  return `${digits.slice(0, 3)}-${digits.slice(3, 5)}-${digits.slice(5, 9)}`;
}

export function validateSsnFormat(raw: string): string | null {
  if (!raw) return "SSN is required";
  if (!SSN_PATTERN.test(raw)) return "SSN must be 9 digits (XXX-XX-XXXX)";
  return null;
}
