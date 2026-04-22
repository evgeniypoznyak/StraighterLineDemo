export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateEmail(raw: string): string | null {
  if (!raw) return "Email is required";
  if (!EMAIL_PATTERN.test(raw)) return "Enter a valid email address";
  return null;
}
