import { describe, expect, it } from "vitest";

import { validatePhone } from "@/src/domain/validators";

describe("validatePhone", () => {
  it("rejects empty string", () => {
    expect(validatePhone("")).toBe("Phone is required");
  });

  it.each([
    ["letters", "abc-def-ghij"],
    ["too short", "12345"],
    ["too long", "1".repeat(25)],
    ["unsupported chars", "555#123#4567"],
  ])("rejects %s", (_label, input) => {
    expect(validatePhone(input)).toBe("Enter a valid phone number");
  });

  it.each([
    "555-123-4567",
    "(555) 123-4567",
    "+1 555 123 4567",
    "5551234567",
  ])("accepts %s", (input) => {
    expect(validatePhone(input)).toBeNull();
  });
});
