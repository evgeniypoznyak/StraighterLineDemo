import { NextResponse, type NextRequest } from "next/server";

import { ValidationError } from "@/src/domain/errors";
import { submitApplication } from "@/src/application/submit-application";
import { isValidApiKey } from "@/src/infrastructure/auth/api-key";

export async function POST(request: NextRequest) {
  if (!isValidApiKey(request.headers.get("x-api-key"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON" }, { status: 400 });
  }

  try {
    const result = submitApplication(body);
    return NextResponse.json(
      {
        applicationId: result.applicationId,
        reviewTier: result.triage.reviewTier,
        riskFlags: result.triage.riskFlags,
      },
      { status: 201 },
    );
  } catch (err) {
    if (err instanceof ValidationError) {
      return NextResponse.json(
        { error: "Validation failed", fieldErrors: err.fieldErrors },
        { status: 400 },
      );
    }
    console.error("unexpected error submitting application", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
