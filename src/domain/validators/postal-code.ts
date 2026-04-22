export const US_POSTAL_PATTERN = /^\d{5}(-\d{4})?$/;

export function validateUsPostalCode(raw: string): string | null {
  if (!raw) return "Postal code is required";
  if (!US_POSTAL_PATTERN.test(raw)) return "Use a US ZIP (5 or 9 digits)";
  return null;
}
