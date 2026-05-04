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
    ["9 digits with separators", "123-456-789"],
    ["9 digits no separators", "123456789"],
    ["7 digits local only", "555-1234"],
    ["11 digits not starting with 1", "25551234567"],
    ["12 digits", "123456789012"],
  ])("rejects %s", (_label, input) => {
    expect(validatePhone(input)).toBe("Enter a valid phone number");
  });

  it.each([
    "555-123-4567",
    "(555) 123-4567",
    "+1 555 123 4567",
    "5551234567",
    "1-555-123-4567",
    "+1 (555) 123-4567",
  ])("accepts %s", (input) => {
    expect(validatePhone(input)).toBeNull();
  });
});
