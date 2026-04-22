import { describe, expect, it } from "vitest";

import { validateRequiredField } from "@/src/domain/validators";

describe("validateRequiredField", () => {
  it("rejects empty string with the provided label", () => {
    expect(validateRequiredField("", "First name")).toBe("First name is required");
    expect(validateRequiredField("", "City")).toBe("City is required");
  });

  it("accepts any non-empty string", () => {
    expect(validateRequiredField("Jane", "First name")).toBeNull();
    expect(validateRequiredField("a", "X")).toBeNull();
  });
});
