import type { Applicant } from "./applicant";
import type { Program } from "./program";

export type ApplicationInput = {
  applicant: Applicant;
  program: Program;
};

export type ValidationOutcome =
  | { ok: true; value: ApplicationInput }
  | { ok: false; fieldErrors: Record<string, string> };

export function validateApplicationInput(_raw: unknown): ValidationOutcome {
  // Implemented in Phase 3b.
  return { ok: false, fieldErrors: { _: "not yet implemented" } };
}
