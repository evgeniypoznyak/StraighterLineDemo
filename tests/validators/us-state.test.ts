import { describe, expect, it } from "vitest";

import { validateUsStateCode } from "@/src/domain/validators";
import { US_STATES, isKnownStateCode } from "@/src/domain/us-states";

describe("validateUsStateCode", () => {
  it("requires a value", () => {
    expect(validateUsStateCode("")).toBe("State is required");
  });

  it("rejects unknown codes", () => {
    expect(validateUsStateCode("ZZ")).toBe("Select a valid US state");
    expect(validateUsStateCode("XX")).toBe("Select a valid US state");
  });

  it("accepts every known state code (uppercase)", () => {
    for (const { code } of US_STATES) {
      expect(validateUsStateCode(code)).toBeNull();
    }
  });

  it("accepts lowercase by uppercasing before matching", () => {
    expect(validateUsStateCode("ny")).toBeNull();
  });
});

describe("isKnownStateCode", () => {
  it("returns true for every state in the list", () => {
    for (const { code } of US_STATES) {
      expect(isKnownStateCode(code)).toBe(true);
    }
  });

  it("returns false for unknown codes", () => {
    expect(isKnownStateCode("ZZ")).toBe(false);
  });

  it("includes all 50 states plus DC", () => {
    expect(US_STATES.length).toBe(51);
  });
});
