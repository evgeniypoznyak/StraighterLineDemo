import type { Applicant } from "./applicant";
import type { Program } from "./program";

export type ApplicationInput = {
  applicant: Applicant;
  program: Program;
};

export type ValidationOutcome =
  | { ok: true; value: ApplicationInput }
  | { ok: false; fieldErrors: Record<string, string> };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SSN_RE = /^\d{3}-?\d{2}-?\d{4}$/;
const POSTAL_RE = /^\d{5}(-\d{4})?$/;
const PHONE_RE = /^[\d\s().+-]{7,20}$/;
const STATE_RE = /^[A-Z]{2}$/;
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function normalizeSsn(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  return `${digits.slice(0, 3)}-${digits.slice(3, 5)}-${digits.slice(5, 9)}`;
}

export function validateApplicationInput(raw: unknown): ValidationOutcome {
  const errors: Record<string, string> = {};

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
  const amountRaw = programRaw.amountRequested;
  const amountRequested =
    typeof amountRaw === "number"
      ? amountRaw
      : typeof amountRaw === "string" && amountRaw.trim() !== ""
        ? Number(amountRaw)
        : Number.NaN;
  const agreementAccepted = programRaw.agreementAccepted === true;

  if (!firstName) errors["applicant.firstName"] = "First name is required";
  if (!lastName) errors["applicant.lastName"] = "Last name is required";
  if (!email) errors["applicant.email"] = "Email is required";
  else if (!EMAIL_RE.test(email)) errors["applicant.email"] = "Enter a valid email address";
  if (!phone) errors["applicant.phone"] = "Phone is required";
  else if (!PHONE_RE.test(phone)) errors["applicant.phone"] = "Enter a valid phone number";

  if (!dateOfBirth) {
    errors["applicant.dateOfBirth"] = "Date of birth is required";
  } else if (!ISO_DATE_RE.test(dateOfBirth)) {
    errors["applicant.dateOfBirth"] = "Use YYYY-MM-DD format";
  } else {
    const parsed = new Date(`${dateOfBirth}T00:00:00Z`);
    if (Number.isNaN(parsed.getTime())) {
      errors["applicant.dateOfBirth"] = "Not a valid date";
    } else if (parsed.getTime() > Date.now()) {
      errors["applicant.dateOfBirth"] = "Date of birth cannot be in the future";
    } else if (parsed.getUTCFullYear() < 1900) {
      errors["applicant.dateOfBirth"] = "Date of birth is unrealistic";
    }
  }

  let ssn = "";
  if (!ssnRaw) {
    errors["applicant.ssn"] = "SSN is required";
  } else if (!SSN_RE.test(ssnRaw)) {
    errors["applicant.ssn"] = "SSN must be 9 digits (XXX-XX-XXXX)";
  } else {
    ssn = normalizeSsn(ssnRaw);
  }

  if (!addrLine1) errors["applicant.address.line1"] = "Street address is required";
  if (!addrCity) errors["applicant.address.city"] = "City is required";
  if (!addrState) errors["applicant.address.state"] = "State is required";
  else if (!STATE_RE.test(addrState)) errors["applicant.address.state"] = "Use the 2-letter state code";
  if (!addrPostal) errors["applicant.address.postalCode"] = "Postal code is required";
  else if (!POSTAL_RE.test(addrPostal)) errors["applicant.address.postalCode"] = "Use a US ZIP (5 or 9 digits)";

  if (!programName) errors["program.name"] = "Program name is required";
  if (!Number.isFinite(amountRequested)) {
    errors["program.amountRequested"] = "Amount is required";
  } else if (amountRequested <= 0) {
    errors["program.amountRequested"] = "Amount must be greater than zero";
  } else if (amountRequested > 1_000_000) {
    errors["program.amountRequested"] = "Amount is unrealistically high";
  }

  if (!agreementAccepted) {
    errors["program.agreementAccepted"] = "You must accept the agreement to submit";
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, fieldErrors: errors };
  }

  const applicant: Applicant = {
    firstName,
    lastName,
    email,
    phone,
    dateOfBirth,
    ssn,
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
