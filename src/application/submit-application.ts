import { randomUUID } from "node:crypto";

import type { Application } from "@/src/domain/application";
import { ValidationError } from "@/src/domain/errors";
import type { DownstreamRecord } from "@/src/domain/handoff";
import { computeTriage, type TriageResult } from "@/src/domain/triage";
import { validateApplicationInput } from "@/src/domain/validation";
import { applicationRepo } from "@/src/infrastructure/repositories/application-repo";
import { handoffRepo } from "@/src/infrastructure/repositories/handoff-repo";
import { redactApplicant } from "@/src/infrastructure/logging/redact";

export type SubmitApplicationResult = {
  applicationId: string;
  triage: TriageResult;
};

/**
 * Single entry point for creating a stipend application. Both the UI Server
 * Action and the HTTP Route Handler delegate here. Auth concerns are the
 * responsibility of the caller (the UI is gated by form submission; the
 * HTTP handler is gated by X-API-Key). Validation, triage, persistence, and
 * downstream handoff are done once, here.
 */
export function submitApplication(rawInput: unknown): SubmitApplicationResult {
  const validation = validateApplicationInput(rawInput);
  if (!validation.ok) {
    throw new ValidationError(validation.fieldErrors);
  }

  const { applicant, program } = validation.value;
  const triage = computeTriage(applicant, program);

  const application: Application = {
    id: randomUUID(),
    applicant,
    program,
    triage,
    submittedAt: new Date().toISOString(),
  };

  applicationRepo.save(application);

  const handoff: DownstreamRecord = {
    applicationId: application.id,
    applicantName: `${applicant.firstName} ${applicant.lastName}`,
    applicantEmail: applicant.email,
    programName: program.name,
    amountRequested: program.amountRequested,
    reviewTier: triage.reviewTier,
    riskFlags: triage.riskFlags,
    submittedAt: application.submittedAt,
  };
  handoffRepo.enqueue(handoff);

  // Safe log: SSN redacted, DOB and address omitted entirely.
  console.log("application submitted", {
    id: application.id,
    reviewTier: triage.reviewTier,
    riskFlags: triage.riskFlags,
    applicant: redactApplicant(applicant),
  });

  return {
    applicationId: application.id,
    triage,
  };
}
