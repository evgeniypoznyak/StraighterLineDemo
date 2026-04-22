/**
 * Redact PII for logging. Never pass raw applicant data to console.* directly;
 * always route through one of these helpers.
 */

export function redactSsn(ssn: string): string {
  const digits = ssn.replace(/\D/g, "");
  if (digits.length !== 9) return "[invalid ssn]";
  return `***-**-${digits.slice(5)}`;
}

export function redactEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!local || !domain) return "[invalid email]";
  const head = local.slice(0, 1);
  return `${head}***@${domain}`;
}

/**
 * Safe summary of an applicant for log output. Intentionally omits DOB and
 * address entirely; includes name initials + redacted email + SSN last four.
 */
export function redactApplicant(a: {
  firstName: string;
  lastName: string;
  email: string;
  ssn: string;
}): Record<string, string> {
  return {
    name: `${a.firstName.charAt(0)}. ${a.lastName.charAt(0)}.`,
    email: redactEmail(a.email),
    ssn: redactSsn(a.ssn),
  };
}
