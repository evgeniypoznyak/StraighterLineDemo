export const PHONE_PATTERN = /^[\d\s().+-]{7,20}$/;

export function validatePhone(raw: string): string | null {
  if (!raw) return "Phone is required";
  if (!PHONE_PATTERN.test(raw)) return "Enter a valid phone number";

  const digits = raw.replace(/\D/g, "");
  if (digits.length === 10) return null;
  if (digits.length === 11 && digits.startsWith("1")) return null;
  return "Enter a valid phone number";
}
