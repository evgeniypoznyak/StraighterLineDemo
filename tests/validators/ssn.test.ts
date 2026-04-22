import { describe, expect, it } from "vitest";

import { normalizeSsn, validateSsnFormat } from "@/src/domain/validators";

describe("validateSsnFormat", () => {
  it("rejects empty string", () => {
    expect(validateSsnFormat("")).toBe("SSN is required");
  });

  it.each([
    ["too few digits", "12-34-5678"],
    ["letters", "abc-de-fghi"],
    ["extra digits", "123-45-67890"],
    ["no digits", "-"],
  ])("rejects %s", (_label, input) => {
    expect(validateSsnFormat(input)).toBe("SSN must be 9 digits (XXX-XX-XXXX)");
  });

  it.each(["123-45-6780", "123456780"])("accepts %s", (input) => {
    expect(validateSsnFormat(input)).toBeNull();
  });
});

describe("normalizeSsn", () => {
  it.each([
    ["123-45-6780", "123-45-6780"],
    ["123456780", "123-45-6780"],
    ["  123 45 6780  ", "123-45-6780"],
  ])("normalizes %s to %s", (input, expected) => {
    expect(normalizeSsn(input)).toBe(expected);
  });
});
