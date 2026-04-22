import type { Applicant } from "./applicant";
import type { Program } from "./program";
import type { TriageResult } from "./triage";

export type Application = {
  id: string;
  applicant: Applicant;
  program: Program;
  triage: TriageResult;
  submittedAt: string;
};
