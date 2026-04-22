/**
 * Shape the raw FormData entries into the object that validateApplicationInput
 * expects. Intentionally free of 'use server' or 'use client' so both the
 * Server Action and the client form can import it.
 */

function s(v: FormDataEntryValue | null): string {
  return typeof v === "string" ? v : "";
}

export function rawApplicationFromFormData(formData: FormData) {
  const amount = s(formData.get("amountRequested"));
  return {
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
      amountRequested: amount === "" ? Number.NaN : Number(amount),
      agreementAccepted: formData.get("agreementAccepted") === "on",
    },
  };
}
