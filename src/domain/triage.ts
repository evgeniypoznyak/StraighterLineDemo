import type { Applicant } from "./applicant";
import type { Program } from "./program";

export type ReviewTier = "auto_approve" | "manual_review";

export type RiskFlag = "HIGH_AMOUNT" | "MINOR" | "SUSPICIOUS_SSN";

export type TriageResult = {
  reviewTier: ReviewTier;
  riskFlags: RiskFlag[];
};

export function computeTriage(
  _applicant: Applicant,
  _program: Program,
  _now: Date = new Date(),
): TriageResult {
  // Implemented in Phase 3b.
  return { reviewTier: "auto_approve", riskFlags: [] };
}
