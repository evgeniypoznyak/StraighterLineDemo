"use server";

import { ValidationError } from "@/src/domain/errors";
import { submitApplication } from "@/src/application/submit-application";
import type { RiskFlag, ReviewTier } from "@/src/domain/triage";

export type ApplyFormState =
  | { status: "idle" }
  | { status: "error"; fieldErrors: Record<string, string> }
  | {
      status: "success";
      applicationId: string;
      reviewTier: ReviewTier;
      riskFlags: RiskFlag[];
    };

function s(v: FormDataEntryValue | null): string {
  return typeof v === "string" ? v : "";
}

export async function submitApplicationAction(
  _prev: ApplyFormState,
  formData: FormData,
): Promise<ApplyFormState> {
  const raw = {
    applicant: {
      firstName: s(formData.get("firstName")),
      lastName: s(formData.get("lastName")),
      email: s(formData.get("email")),
      phone: s(formData.get("phone")),
      dateOfBirth: s(formData.get("dateOfBirth")),
      ssn: s(formData.get("ssn")),
      address: {
        line1: s(formData.get("addressLine1")),
        line2: s(formData.get("addressLine2")),
        city: s(formData.get("city")),
        state: s(formData.get("state")),
        postalCode: s(formData.get("postalCode")),
      },
    },
    program: {
      name: s(formData.get("programName")),
      amountRequested: Number(s(formData.get("amountRequested"))),
      agreementAccepted: formData.get("agreementAccepted") === "on",
    },
  };

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
