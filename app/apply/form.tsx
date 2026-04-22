"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { submitApplicationAction, type ApplyFormState } from "./actions";

const INITIAL_STATE: ApplyFormState = { status: "idle" };

export function ApplyForm() {
  const [state, formAction] = useActionState(submitApplicationAction, INITIAL_STATE);

  if (state.status === "success") {
    return <SuccessPanel state={state} />;
  }

  const fieldErrors = state.status === "error" ? state.fieldErrors : {};
  const generalError = fieldErrors._;

  return (
    <form action={formAction} className="space-y-8" noValidate>
      {generalError ? (
        <p role="alert" className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-200">
          {generalError}
        </p>
      ) : null}

      <Fieldset title="Applicant">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="First name" name="firstName" required error={fieldErrors["applicant.firstName"]} autoComplete="given-name" />
          <Field label="Last name" name="lastName" required error={fieldErrors["applicant.lastName"]} autoComplete="family-name" />
          <Field label="Email" name="email" type="email" required error={fieldErrors["applicant.email"]} autoComplete="email" />
          <Field label="Phone" name="phone" type="tel" required error={fieldErrors["applicant.phone"]} autoComplete="tel" />
          <Field label="Date of birth" name="dateOfBirth" type="date" required error={fieldErrors["applicant.dateOfBirth"]} autoComplete="bday" />
          <Field label="SSN" name="ssn" required placeholder="XXX-XX-XXXX" error={fieldErrors["applicant.ssn"]} autoComplete="off" inputMode="numeric" />
        </div>
      </Fieldset>

      <Fieldset title="Address">
        <div className="grid gap-4">
          <Field label="Street" name="addressLine1" required error={fieldErrors["applicant.address.line1"]} autoComplete="address-line1" />
          <Field label="Apt / Suite (optional)" name="addressLine2" autoComplete="address-line2" />
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="City" name="city" required error={fieldErrors["applicant.address.city"]} autoComplete="address-level2" />
            <Field label="State" name="state" required placeholder="NY" maxLength={2} error={fieldErrors["applicant.address.state"]} autoComplete="address-level1" />
            <Field label="Postal code" name="postalCode" required error={fieldErrors["applicant.address.postalCode"]} autoComplete="postal-code" inputMode="numeric" />
          </div>
        </div>
      </Fieldset>

      <Fieldset title="Program">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Program name" name="programName" required error={fieldErrors["program.name"]} />
          <Field label="Amount requested (USD)" name="amountRequested" type="number" min="1" step="1" required error={fieldErrors["program.amountRequested"]} inputMode="numeric" />
        </div>
        <label className="flex items-start gap-3 text-sm text-zinc-700 dark:text-zinc-300">
          <input
            type="checkbox"
            name="agreementAccepted"
            required
            className="mt-0.5 h-4 w-4 rounded border-zinc-300"
          />
          <span>
            I confirm the information above is accurate and I agree to the program terms.
          </span>
        </label>
        {fieldErrors["program.agreementAccepted"] ? (
          <p className="text-sm text-red-700 dark:text-red-300">{fieldErrors["program.agreementAccepted"]}</p>
        ) : null}
      </Fieldset>

      <SubmitButton />
    </form>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex h-11 items-center justify-center rounded-md bg-zinc-900 px-6 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:opacity-60 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
    >
      {pending ? "Submitting…" : "Submit application"}
    </button>
  );
}

function Fieldset({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-zinc-50">{title}</h2>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

type FieldProps = {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  placeholder?: string;
  error?: string;
  autoComplete?: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
  maxLength?: number;
  min?: string;
  step?: string;
};

function Field({
  label,
  name,
  type = "text",
  required,
  placeholder,
  error,
  autoComplete,
  inputMode,
  maxLength,
  min,
  step,
}: FieldProps) {
  const id = `field-${name}`;
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
        {label}
        {required ? <span className="ml-1 text-red-600">*</span> : null}
      </label>
      <input
        id={id}
        name={name}
        type={type}
        required={required}
        placeholder={placeholder}
        autoComplete={autoComplete}
        inputMode={inputMode}
        maxLength={maxLength}
        min={min}
        step={step}
        aria-invalid={error ? "true" : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm transition-colors focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:focus:border-zinc-50"
      />
      {error ? (
        <p id={`${id}-error`} className="mt-1 text-sm text-red-700 dark:text-red-300">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function SuccessPanel({ state }: { state: Extract<ApplyFormState, { status: "success" }> }) {
  const tierLabel = state.reviewTier === "auto_approve" ? "Auto-approved" : "Sent for manual review";
  return (
    <div className="rounded-lg border border-green-200 bg-green-50 p-6 dark:border-green-900 dark:bg-green-950">
      <h2 className="text-lg font-semibold text-green-900 dark:text-green-100">
        Application received
      </h2>
      <dl className="mt-4 grid gap-3 text-sm text-green-900 dark:text-green-100">
        <div>
          <dt className="font-medium">Application ID</dt>
          <dd className="font-mono">{state.applicationId}</dd>
        </div>
        <div>
          <dt className="font-medium">Status</dt>
          <dd>{tierLabel}</dd>
        </div>
        {state.riskFlags.length > 0 ? (
          <div>
            <dt className="font-medium">Flags</dt>
            <dd>
              <ul className="list-inside list-disc">
                {state.riskFlags.map((flag) => (
                  <li key={flag}>{flag}</li>
                ))}
              </ul>
            </dd>
          </div>
        ) : null}
      </dl>
      <p className="mt-4 text-sm text-green-900/80 dark:text-green-100/80">
        We&apos;ll follow up at the email address you provided.
      </p>
    </div>
  );
}
