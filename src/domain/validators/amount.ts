export const MIN_AMOUNT = 0;
export const MAX_AMOUNT = 1_000_000;

export type AmountParseResult =
  | { ok: true; value: number }
  | { ok: false; error: string };

export function parseAmount(raw: unknown): AmountParseResult {
  if (typeof raw === "number") {
    return Number.isFinite(raw) ? { ok: true, value: raw } : { ok: false, error: "Amount is required" };
  }
  if (typeof raw === "string" && raw.trim() !== "") {
    const n = Number(raw);
    return Number.isFinite(n) ? { ok: true, value: n } : { ok: false, error: "Amount must be a number" };
  }
  return { ok: false, error: "Amount is required" };
}

export function validateAmount(raw: unknown): string | null {
  const parsed = parseAmount(raw);
  if (!parsed.ok) return parsed.error;
  if (parsed.value <= MIN_AMOUNT) return "Amount must be greater than zero";
  if (parsed.value > MAX_AMOUNT) return "Amount is unrealistically high";
  return null;
}
