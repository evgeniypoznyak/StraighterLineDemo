"use server";

import { ValidationError } from "@/src/domain/errors";
import { submitApplication } from "@/src/application/submit-application";
import type { RiskFlag, ReviewTier } from "@/src/domain/triage";
import { rawApplicationFromFormData } from "./form-data";

export type ApplyFormState =
  | { status: "idle" }
  | { status: "error"; fieldErrors: Record<string, string> }
  | {
      status: "success";
      applicationId: string;
      reviewTier: ReviewTier;
      riskFlags: RiskFlag[];
    };

export async function submitApplicationAction(
  _prev: ApplyFormState,
  formData: FormData,
): Promise<ApplyFormState> {
  const raw = rawApplicationFromFormData(formData);

  try {
    const result = submitApplication(raw);
    return {
      status: "success",
      applicationId: result.applicationId,
      reviewTier: result.triage.reviewTier,
      riskFlags: result.triage.riskFlags,
    };
  } catch (err) {
    if (err instanceof ValidationError) {
      return { status: "error", fieldErrors: err.fieldErrors };
    }
    console.error("unexpected error in submit action", err);
    return {
      status: "error",
      fieldErrors: { _: "Something went wrong. Please try again." },
    };
  }
}
