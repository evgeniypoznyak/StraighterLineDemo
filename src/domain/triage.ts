import type { Applicant } from "./applicant";
import type { Program } from "./program";

export type ReviewTier = "standard" | "manual_review";

export type RiskFlag = "HIGH_AMOUNT" | "MINOR" | "SUSPICIOUS_SSN";

export type TriageResult = {
  reviewTier: ReviewTier;
  riskFlags: RiskFlag[];
};

const HIGH_AMOUNT_THRESHOLD = 1000;
const MINOR_AGE_THRESHOLD = 18;

/**
 * SSN patterns the Social Security Administration never assigns, plus
 * commonly-used placeholders. Not an exhaustive list, but enough to catch
 * obvious garbage and well-known fake values.
 *
 * SSA-excluded area numbers: 000, 666, 900-999.
 * See: https://www.ssa.gov/history/ssn/geocard.html
 */
const WELL_KNOWN_FAKE_SSNS = new Set([
  "123-45-6789",
  "111-11-1111",
  "222-22-2222",
  "333-33-3333",
  "444-44-4444",
  "555-55-5555",
  "777-77-7777",
  "888-88-8888",
  "999-99-9999",
]);

function isSuspiciousSsn(ssn: string): boolean {
  const [area, group, serial] = ssn.split("-");
  if (!area || !group || !serial) return true;

  if (area === "000" || area === "666") return true;
  if (area.startsWith("9")) return true;
  if (group === "00") return true;
  if (serial === "0000") return true;

  if (WELL_KNOWN_FAKE_SSNS.has(ssn)) return true;

  const digits = ssn.replace(/-/g, "");
  if (/^(\d)\1{8}$/.test(digits)) return true;

  return false;
}

function ageAt(dateOfBirth: string, now: Date): number {
  const dob = new Date(`${dateOfBirth}T00:00:00Z`);
  if (Number.isNaN(dob.getTime())) return Number.NaN;

  let age = now.getUTCFullYear() - dob.getUTCFullYear();
  const beforeBirthday =
    now.getUTCMonth() < dob.getUTCMonth() ||
    (now.getUTCMonth() === dob.getUTCMonth() && now.getUTCDate() < dob.getUTCDate());
  if (beforeBirthday) age -= 1;
  return age;
}

export function computeTriage(
  applicant: Applicant,
  program: Program,
  now: Date = new Date(),
): TriageResult {
  const flags: RiskFlag[] = [];

  if (program.amountRequested > HIGH_AMOUNT_THRESHOLD) {
    flags.push("HIGH_AMOUNT");
  }

  const age = ageAt(applicant.dateOfBirth, now);
  if (Number.isFinite(age) && age < MINOR_AGE_THRESHOLD) {
    flags.push("MINOR");
  }

  if (isSuspiciousSsn(applicant.ssn)) {
    flags.push("SUSPICIOUS_SSN");
  }

  return {
    reviewTier: flags.length > 0 ? "manual_review" : "standard",
    riskFlags: flags,
  };
}
