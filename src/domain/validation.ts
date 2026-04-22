import type { Applicant } from "./applicant";
import type { Program } from "./program";
import {
  normalizeSsn,
  parseAmount,
  validateAmount,
  validateDateOfBirth,
  validateEmail,
  validatePhone,
  validateRequiredField,
  validateSsnFormat,
  validateUsPostalCode,
  validateUsStateCode,
} from "./validators";

export type ApplicationInput = {
  applicant: Applicant;
  program: Program;
};

export type ValidationOutcome =
  | { ok: true; value: ApplicationInput }
  | { ok: false; fieldErrors: Record<string, string> };

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function collect(
  errors: Record<string, string>,
  path: string,
  message: string | null,
) {
  if (message) errors[path] = message;
}

export function validateApplicationInput(raw: unknown): ValidationOutcome {
  if (!isPlainObject(raw)) {
    return { ok: false, fieldErrors: { _: "Request body must be an object" } };
  }

  const applicantRaw = isPlainObject(raw.applicant) ? raw.applicant : {};
  const programRaw = isPlainObject(raw.program) ? raw.program : {};
  const addressRaw = isPlainObject(applicantRaw.address) ? applicantRaw.address : {};

  const firstName = str(applicantRaw.firstName);
  const lastName = str(applicantRaw.lastName);
  const email = str(applicantRaw.email);
  const phone = str(applicantRaw.phone);
  const dateOfBirth = str(applicantRaw.dateOfBirth);
  const ssnRaw = str(applicantRaw.ssn);

  const addrLine1 = str(addressRaw.line1);
  const addrLine2 = str(addressRaw.line2);
  const addrCity = str(addressRaw.city);
  const addrState = str(addressRaw.state).toUpperCase();
  const addrPostal = str(addressRaw.postalCode);

  const programName = str(programRaw.name);
  const agreementAccepted = programRaw.agreementAccepted === true;

  const errors: Record<string, string> = {};

  collect(errors, "applicant.firstName", validateRequiredField(firstName, "First name"));
  collect(errors, "applicant.lastName", validateRequiredField(lastName, "Last name"));
  collect(errors, "applicant.email", validateEmail(email));
  collect(errors, "applicant.phone", validatePhone(phone));
  collect(errors, "applicant.dateOfBirth", validateDateOfBirth(dateOfBirth));
  collect(errors, "applicant.ssn", validateSsnFormat(ssnRaw));

  collect(errors, "applicant.address.line1", validateRequiredField(addrLine1, "Street address"));
  collect(errors, "applicant.address.city", validateRequiredField(addrCity, "City"));
  collect(errors, "applicant.address.state", validateUsStateCode(addrState));
  collect(errors, "applicant.address.postalCode", validateUsPostalCode(addrPostal));

  collect(errors, "program.name", validateRequiredField(programName, "Program name"));
  collect(errors, "program.amountRequested", validateAmount(programRaw.amountRequested));

  if (!agreementAccepted) {
    errors["program.agreementAccepted"] = "You must accept the agreement to submit";
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, fieldErrors: errors };
  }

  const parsedAmount = parseAmount(programRaw.amountRequested);
  // parsedAmount.ok is guaranteed true here because validateAmount passed above.
  const amountRequested = parsedAmount.ok ? parsedAmount.value : Number.NaN;

  const applicant: Applicant = {
    firstName,
    lastName,
    email,
    phone,
    dateOfBirth,
    ssn: normalizeSsn(ssnRaw),
    address: {
      line1: addrLine1,
      ...(addrLine2 ? { line2: addrLine2 } : {}),
      city: addrCity,
      state: addrState,
      postalCode: addrPostal,
    },
  };

  const program: Program = {
    name: programName,
    amountRequested,
    agreementAccepted: true,
  };

  return { ok: true, value: { applicant, program } };
}
