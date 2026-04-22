import { describe, expect, it } from "vitest";

import { validateUsPostalCode } from "@/src/domain/validators";

describe("validateUsPostalCode", () => {
  it("requires a value", () => {
    expect(validateUsPostalCode("")).toBe("Postal code is required");
  });

  it.each([
    ["four digits", "1234"],
    ["letters", "ABCDE"],
    ["missing hyphen", "123456789"],
    ["wrong ZIP+4 shape", "12345-12"],
  ])("rejects %s", (_label, input) => {
    expect(validateUsPostalCode(input)).toBe("Use a US ZIP (5 or 9 digits)");
  });

  it("accepts 5-digit ZIP", () => {
    expect(validateUsPostalCode("12207")).toBeNull();
  });

  it("accepts ZIP+4", () => {
    expect(validateUsPostalCode("12207-1234")).toBeNull();
  });
});
