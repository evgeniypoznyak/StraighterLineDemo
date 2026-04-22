import { describe, expect, it } from "vitest";

import { parseDateOfBirth, validateDateOfBirth } from "@/src/domain/validators";

const NOW = new Date("2026-04-22T00:00:00Z");

describe("validateDateOfBirth", () => {
  it("rejects empty string", () => {
    expect(validateDateOfBirth("", NOW)).toBe("Date of birth is required");
  });

  it.each([
    ["slash format", "04/22/1990"],
    ["short year", "90-04-22"],
    ["trailing text", "1990-04-22 abc"],
  ])("rejects %s (%s)", (_label, input) => {
    expect(validateDateOfBirth(input, NOW)).toBe("Use YYYY-MM-DD format");
  });

  it("rejects calendar impossibilities", () => {
    expect(validateDateOfBirth("1990-02-31", NOW)).toBe("Not a valid date");
  });

  it("rejects future dates", () => {
    expect(validateDateOfBirth("3000-01-01", NOW)).toBe("Date of birth cannot be in the future");
  });

  it("rejects pre-1900 dates", () => {
    expect(validateDateOfBirth("1899-12-31", NOW)).toBe("Date of birth is unrealistic");
  });

  it("accepts a plausible past date", () => {
    expect(validateDateOfBirth("1990-05-10", NOW)).toBeNull();
  });

  it("accepts today", () => {
    expect(validateDateOfBirth("2026-04-22", NOW)).toBeNull();
  });
});

describe("parseDateOfBirth", () => {
  it("returns null on malformed input", () => {
    expect(parseDateOfBirth("not-a-date")).toBeNull();
  });

  it("returns a Date for valid ISO input", () => {
    const d = parseDateOfBirth("1990-05-10");
    expect(d).toBeInstanceOf(Date);
    expect(d?.toISOString()).toBe("1990-05-10T00:00:00.000Z");
  });
});
