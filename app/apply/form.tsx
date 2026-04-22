"use client";

import { useActionState, useState, type FormEvent, type FocusEvent } from "react";
import { useFormStatus } from "react-dom";

import { validateApplicationInput } from "@/src/domain/validation";

import { submitApplicationAction, type ApplyFormState } from "./actions";
import { rawApplicationFromFormData } from "./form-data";

const INITIAL_STATE: ApplyFormState = { status: "idle" };

export function ApplyForm() {
  const [serverState, formAction] = useActionState(submitApplicationAction, INITIAL_STATE);
  const [clientErrors, setClientErrors] = useState<Record<string, string>>({});

  if (serverState.status === "success") {
    return <SuccessPanel state={serverState} />;
  }

  const serverErrors = serverState.status === "error" ? serverState.fieldErrors : {};
  const fieldErrors = { ...serverErrors, ...clientErrors };
  const generalError = fieldErrors._;

  function validateFieldOnBlur(errorKey: string, form: HTMLFormElement | null) {
    if (!form) return;
    const result = validateApplicationInput(rawApplicationFromFormData(new FormData(form)));
    const fieldError = result.ok ? undefined : result.fieldErrors[errorKey];
    setClientErrors((prev) => {
      const next = { ...prev };
      if (fieldError) next[errorKey] = fieldError;
      else delete next[errorKey];
      return next;
    });
  }

  function handleFieldBlur(errorKey: string) {
    return (event: FocusEvent<HTMLInputElement>) => {
      validateFieldOnBlur(errorKey, event.currentTarget.form);
    };
  }

  function clearErrorFor(errorKey: string) {
    setClientErrors((prev) => {
      if (!(errorKey in prev)) return prev;
      const next = { ...prev };
      delete next[errorKey];
      return next;
    });
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    const form = event.currentTarget;
    const data = new FormData(form);
    const result = validateApplicationInput(rawApplicationFromFormData(data));
    if (!result.ok) {
      event.preventDefault();
      setClientErrors(result.fieldErrors);
      focusFirstError(form, result.fieldErrors);
    } else {
      setClientErrors({});
    }
  }

  return (
    <form action={formAction} onSubmit={handleSubmit} className="space-y-8" noValidate>
      {generalError ? (
        <p role="alert" className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-200">
          {generalError}
        </p>
      ) : null}

      <Fieldset title="Applicant">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="First name" name="firstName" errorKey="applicant.firstName" required error={fieldErrors["applicant.firstName"]} autoComplete="given-name" onChange={clearErrorFor} onBlur={handleFieldBlur("applicant.firstName")} />
          <Field label="Last name" name="lastName" errorKey="applicant.lastName" required error={fieldErrors["applicant.lastName"]} autoComplete="family-name" onChange={clearErrorFor} onBlur={handleFieldBlur("applicant.lastName")} />
          <Field label="Email" name="email" errorKey="applicant.email" type="email" required error={fieldErrors["applicant.email"]} autoComplete="email" onChange={clearErrorFor} onBlur={handleFieldBlur("applicant.email")} />
          <Field label="Phone" name="phone" errorKey="applicant.phone" type="tel" required error={fieldErrors["applicant.phone"]} autoComplete="tel" onChange={clearErrorFor} onBlur={handleFieldBlur("applicant.phone")} />
          <Field label="Date of birth" name="dateOfBirth" errorKey="applicant.dateOfBirth" type="date" required error={fieldErrors["applicant.dateOfBirth"]} autoComplete="bday" onChange={clearErrorFor} onBlur={handleFieldBlur("applicant.dateOfBirth")} />
          <Field label="SSN" name="ssn" errorKey="applicant.ssn" required placeholder="XXX-XX-XXXX" error={fieldErrors["applicant.ssn"]} autoComplete="off" inputMode="numeric" onChange={clearErrorFor} onBlur={handleFieldBlur("applicant.ssn")} />
        </div>
      </Fieldset>

      <Fieldset title="Address">
        <div className="grid gap-4">
          <Field label="Street" name="addressLine1" errorKey="applicant.address.line1" required error={fieldErrors["applicant.address.line1"]} autoComplete="address-line1" onChange={clearErrorFor} onBlur={handleFieldBlur("applicant.address.line1")} />
          <Field label="Apt / Suite (optional)" name="addressLine2" errorKey="applicant.address.line2" autoComplete="address-line2" onChange={clearErrorFor} />
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="City" name="city" errorKey="applicant.address.city" required error={fieldErrors["applicant.address.city"]} autoComplete="address-level2" onChange={clearErrorFor} onBlur={handleFieldBlur("applicant.address.city")} />
            <Field label="State" name="state" errorKey="applicant.address.state" required placeholder="NY" maxLength={2} error={fieldErrors["applicant.address.state"]} autoComplete="address-level1" onChange={clearErrorFor} onBlur={handleFieldBlur("applicant.address.state")} />
            <Field label="Postal code" name="postalCode" errorKey="applicant.address.postalCode" required error={fieldErrors["applicant.address.postalCode"]} autoComplete="postal-code" inputMode="numeric" onChange={clearErrorFor} onBlur={handleFieldBlur("applicant.address.postalCode")} />
          </div>
        </div>
      </Fieldset>

      <Fieldset title="Program">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Program name" name="programName" errorKey="program.name" required error={fieldErrors["program.name"]} onChange={clearErrorFor} onBlur={handleFieldBlur("program.name")} />
          <Field label="Amount requested (USD)" name="amountRequested" errorKey="program.amountRequested" type="number" min="1" step="1" required error={fieldErrors["program.amountRequested"]} inputMode="numeric" onChange={clearErrorFor} onBlur={handleFieldBlur("program.amountRequested")} />
        </div>
        <label className="flex items-start gap-3 text-sm text-zinc-700 dark:text-zinc-300">
          <input
            type="checkbox"
            name="agreementAccepted"
            className="mt-0.5 h-4 w-4 rounded border-zinc-300"
            onChange={(e) => {
              if (e.target.checked) clearErrorFor("program.agreementAccepted");
              else validateFieldOnBlur("program.agreementAccepted", e.target.form);
            }}
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

function focusFirstError(form: HTMLFormElement, errors: Record<string, string>) {
  const firstKey = Object.keys(errors)[0];
  if (!firstKey) return;
  const inputName = ERROR_KEY_TO_FIELD[firstKey];
  if (!inputName) return;
  const el = form.elements.namedItem(inputName);
  if (el instanceof HTMLElement) el.focus();
}

const ERROR_KEY_TO_FIELD: Record<string, string> = {
  "applicant.firstName": "firstName",
  "applicant.lastName": "lastName",
  "applicant.email": "email",
  "applicant.phone": "phone",
  "applicant.dateOfBirth": "dateOfBirth",
  "applicant.ssn": "ssn",
  "applicant.address.line1": "addressLine1",
  "applicant.address.city": "city",
  "applicant.address.state": "state",
  "applicant.address.postalCode": "postalCode",
  "program.name": "programName",
  "program.amountRequested": "amountRequested",
  "program.agreementAccepted": "agreementAccepted",
};

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
  errorKey: string;
  type?: string;
  required?: boolean;
  placeholder?: string;
  error?: string;
  autoComplete?: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
  maxLength?: number;
  min?: string;
  step?: string;
  onChange?: (errorKey: string) => void;
  onBlur?: (event: FocusEvent<HTMLInputElement>) => void;
};

function Field({
  label,
  name,
  errorKey,
  type = "text",
  required,
  placeholder,
  error,
  autoComplete,
  inputMode,
  maxLength,
  min,
  step,
  onChange,
  onBlur,
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
        onChange={onChange ? () => onChange(errorKey) : undefined}
        onBlur={onBlur}
        className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm transition-colors focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900 aria-[invalid=true]:border-red-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:focus:border-zinc-50"
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
