export function validateRequiredField(raw: string, label: string): string | null {
  if (!raw) return `${label} is required`;
  return null;
}
