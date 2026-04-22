export const PHONE_PATTERN = /^[\d\s().+-]{7,20}$/;

export function validatePhone(raw: string): string | null {
  if (!raw) return "Phone is required";
  if (!PHONE_PATTERN.test(raw)) return "Enter a valid phone number";
  return null;
}
