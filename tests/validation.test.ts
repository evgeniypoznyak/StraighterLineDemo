import { describe, expect, it } from "vitest";

import { validateApplicationInput } from "@/src/domain/validation";

function validRaw() {
  return {
    applicant: {
      firstName: "Jane",
      lastName: "Doe",
      email: "jane@example.com",
      phone: "555-123-4567",
      dateOfBirth: "1990-05-10",
      ssn: "123-45-6780",
      address: {
        line1: "1 Main St",
        city: "Albany",
        state: "NY",
        postalCode: "12207",
      },
    },
    program: {
      name: "ECE Certification",
      amountRequested: 500,
      agreementAccepted: true,
    },
  };
}

describe("validateApplicationInput", () => {
  it("accepts a well-formed submission", () => {
    const result = validateApplicationInput(validRaw());
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.applicant.ssn).toBe("123-45-6780");
      expect(result.value.program.amountRequested).toBe(500);
    }
  });

  it("normalizes SSN without dashes to XXX-XX-XXXX", () => {
    const raw = validRaw();
    raw.applicant.ssn = "123456780";
    const result = validateApplicationInput(raw);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.applicant.ssn).toBe("123-45-6780");
    }
  });

  it("rejects when agreement is not accepted", () => {
    const raw = validRaw();
    raw.program.agreementAccepted = false;
    const result = validateApplicationInput(raw);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.fieldErrors["program.agreementAccepted"]).toBeDefined();
    }
  });

  it("rejects malformed SSN", () => {
    const raw = validRaw();
    raw.applicant.ssn = "12-34-5678";
    const result = validateApplicationInput(raw);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.fieldErrors["applicant.ssn"]).toBeDefined();
    }
  });

  it("rejects zero or negative amounts", () => {
    const raw = validRaw();
    raw.program.amountRequested = 0;
    const result = validateApplicationInput(raw);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.fieldErrors["program.amountRequested"]).toBeDefined();
    }
  });

  it("rejects future DOB", () => {
    const raw = validRaw();
    raw.applicant.dateOfBirth = "3000-01-01";
    const result = validateApplicationInput(raw);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.fieldErrors["applicant.dateOfBirth"]).toBeDefined();
    }
  });

  it("rejects invalid email", () => {
    const raw = validRaw();
    raw.applicant.email = "not-an-email";
    const result = validateApplicationInput(raw);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.fieldErrors["applicant.email"]).toBeDefined();
    }
  });

  it("returns an error envelope when the body is not an object", () => {
    expect(validateApplicationInput(null).ok).toBe(false);
    expect(validateApplicationInput("string").ok).toBe(false);
    expect(validateApplicationInput([]).ok).toBe(false);
  });

  it("uppercases state codes", () => {
    const raw = validRaw();
    raw.applicant.address.state = "ny";
    const result = validateApplicationInput(raw);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.applicant.address.state).toBe("NY");
    }
  });
});
