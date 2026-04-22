import { describe, expect, it } from "vitest";

import { MAX_AMOUNT, parseAmount, validateAmount } from "@/src/domain/validators";

describe("validateAmount", () => {
  it("requires a value", () => {
    expect(validateAmount(undefined)).toBe("Amount is required");
    expect(validateAmount(null)).toBe("Amount is required");
    expect(validateAmount("")).toBe("Amount is required");
  });

  it("rejects non-numeric strings", () => {
    expect(validateAmount("abc")).toBe("Amount must be a number");
  });

  it("rejects zero and negatives", () => {
    expect(validateAmount(0)).toBe("Amount must be greater than zero");
    expect(validateAmount(-1)).toBe("Amount must be greater than zero");
    expect(validateAmount("-50")).toBe("Amount must be greater than zero");
  });

  it("rejects amounts above the cap", () => {
    expect(validateAmount(MAX_AMOUNT + 1)).toBe("Amount is unrealistically high");
  });

  it("accepts the upper bound exactly", () => {
    expect(validateAmount(MAX_AMOUNT)).toBeNull();
  });

  it("accepts typical amounts from string or number", () => {
    expect(validateAmount(500)).toBeNull();
    expect(validateAmount("500")).toBeNull();
    expect(validateAmount("500.50")).toBeNull();
  });
});

describe("parseAmount", () => {
  it("parses numbers through", () => {
    expect(parseAmount(42)).toEqual({ ok: true, value: 42 });
  });

  it("parses numeric strings", () => {
    expect(parseAmount("42.5")).toEqual({ ok: true, value: 42.5 });
  });

  it("flags NaN numbers as required", () => {
    expect(parseAmount(Number.NaN)).toEqual({ ok: false, error: "Amount is required" });
  });
});
