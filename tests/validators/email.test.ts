import { describe, expect, it } from "vitest";

import { validateEmail } from "@/src/domain/validators";

describe("validateEmail", () => {
  it("rejects empty string", () => {
    expect(validateEmail("")).toBe("Email is required");
  });

  it.each([
    ["plain", "not-an-email"],
    ["missing @", "jane.example.com"],
    ["missing domain", "jane@"],
    ["missing TLD", "jane@example"],
    ["spaces", "jane @example.com"],
  ])("rejects %s", (_label, input) => {
    expect(validateEmail(input)).toBe("Enter a valid email address");
  });

  it.each(["jane@example.com", "j.doe+tag@sub.example.co.uk", "user@a.b"])(
    "accepts %s",
    (input) => {
      expect(validateEmail(input)).toBeNull();
    },
  );
});
