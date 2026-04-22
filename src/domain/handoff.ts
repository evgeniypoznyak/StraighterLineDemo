import type { ReviewTier, RiskFlag } from "./triage";

/**
 * Data-minimized record passed to downstream review processing.
 * Intentionally omits SSN, date of birth, and full address.
 */
export type DownstreamRecord = {
  applicationId: string;
  applicantName: string;
  applicantEmail: string;
  programName: string;
  amountRequested: number;
  reviewTier: ReviewTier;
  riskFlags: RiskFlag[];
  submittedAt: string;
};
