import { describe, expect, it } from "vitest";

import { computeTriage, type RiskFlag } from "@/src/domain/triage";
import type { Applicant } from "@/src/domain/applicant";
import type { Program } from "@/src/domain/program";

const NOW = new Date("2026-04-22T00:00:00Z");

function makeApplicant(overrides: Partial<Applicant> = {}): Applicant {
  return {
    firstName: "Jane",
    lastName: "Doe",
    email: "jane@example.com",
    phone: "555-123-4567",
    dateOfBirth: "1990-01-01",
    ssn: "123-12-1234",
    address: {
      line1: "1 Main St",
      city: "Albany",
      state: "NY",
      postalCode: "12207",
    },
    ...overrides,
  };
}

function makeProgram(overrides: Partial<Program> = {}): Program {
  return {
    name: "ECE Certification",
    amountRequested: 500,
    agreementAccepted: true,
    ...overrides,
  };
}

function flags(a: Applicant, p: Program): RiskFlag[] {
  return computeTriage(a, p, NOW).riskFlags;
}

describe("computeTriage", () => {
  it("returns standard tier for a clean adult, low-amount, well-formed SSN", () => {
    const result = computeTriage(makeApplicant(), makeProgram(), NOW);
    expect(result.reviewTier).toBe("standard");
    expect(result.riskFlags).toEqual([]);
  });

  describe("HIGH_AMOUNT", () => {
    it("does not flag at the $1000 threshold (boundary exclusive)", () => {
      expect(flags(makeApplicant(), makeProgram({ amountRequested: 1000 }))).not.toContain("HIGH_AMOUNT");
    });
    it("flags above $1000", () => {
      expect(flags(makeApplicant(), makeProgram({ amountRequested: 1000.01 }))).toContain("HIGH_AMOUNT");
    });
  });

  describe("MINOR", () => {
    it("flags age 17", () => {
      const dob = "2009-01-01"; // 17 on 2026-04-22
      expect(flags(makeApplicant({ dateOfBirth: dob }), makeProgram())).toContain("MINOR");
    });
    it("does not flag age 18", () => {
      const dob = "2008-01-01"; // 18 on 2026-04-22
      expect(flags(makeApplicant({ dateOfBirth: dob }), makeProgram())).not.toContain("MINOR");
    });
    it("handles birthday-not-yet-reached this year", () => {
      const dob = "2008-06-15"; // still 17 on 2026-04-22
      expect(flags(makeApplicant({ dateOfBirth: dob }), makeProgram())).toContain("MINOR");
    });
  });

  describe("SUSPICIOUS_SSN", () => {
    it.each([
      ["000-12-3456", "area 000"],
      ["666-12-3456", "area 666"],
      ["900-12-3456", "area 9xx"],
      ["999-99-9999", "area 9xx"],
      ["123-00-3456", "group 00"],
      ["123-45-0000", "serial 0000"],
      ["111-11-1111", "all same digit"],
      ["123-45-6789", "well-known placeholder"],
    ])("flags %s (%s)", (ssn) => {
      expect(flags(makeApplicant({ ssn }), makeProgram())).toContain("SUSPICIOUS_SSN");
    });

    it("accepts a realistic SSN", () => {
      expect(flags(makeApplicant({ ssn: "123-45-6780" }), makeProgram())).not.toContain("SUSPICIOUS_SSN");
    });
  });

  it("stacks multiple flags and routes to manual_review", () => {
    const result = computeTriage(
      makeApplicant({ dateOfBirth: "2010-01-01", ssn: "666-12-3456" }),
      makeProgram({ amountRequested: 5000 }),
      NOW,
    );
    expect(result.reviewTier).toBe("manual_review");
    expect(result.riskFlags).toEqual(
      expect.arrayContaining(["HIGH_AMOUNT", "MINOR", "SUSPICIOUS_SSN"]),
    );
  });
});
