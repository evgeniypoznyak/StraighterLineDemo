# Stipend Application System

A Next.js + TypeScript take-home for StraighterLine's ECE division. Collects stipend applications through a public form, exposes a machine-to-machine API, triages each submission against a small rule set, and writes a decoupled downstream record with the minimum data a reviewer queue needs.

**For a full walkthrough of how this was built, see [notes.md](notes.md).** It covers the decisions, the tradeoffs, and the process.

## What's in the box

```
app/
  apply/             UI form + Server Action (calls the shared use case)
  api/applications/  POST handler (X-API-Key auth, calls the same use case)

src/
  domain/            Pure types, triage rules, per-field validators, US states
    validators/      One file per field: email, phone, ssn, dob, amount, ...
  application/       submitApplication use case
  infrastructure/    In-memory repositories, API-key auth, PII redaction

tests/               96 vitest specs covering validators, triage, validation, auth
```

## Setup

Requires Node 20+.

```bash
npm install
cp .env.example .env.local
# edit .env.local and set APPLICATIONS_API_KEY to any non-empty string

npm run dev       # http://localhost:3000/apply
npm test          # run the vitest suite (96 specs)
npm run lint
npm run build     # verify production build
```

## Using the system

**UI form.** Visit `/apply`, fill in the applicant and program fields, submit. On success you'll see the application id, the review tier, and any risk flags. Validation runs twice. Once on the client (per-field on blur, plus a final pass on submit) for instant feedback. Once on the server, which is the source of truth.

**API.** `POST /api/applications` with a JSON body matching the shape in [`tests/api-auth.test.ts`](tests/api-auth.test.ts) and an `X-API-Key` header:

```bash
curl -X POST http://localhost:3000/api/applications \
  -H "content-type: application/json" \
  -H "x-api-key: $APPLICATIONS_API_KEY" \
  -d '{
    "applicant": {
      "firstName": "Jane", "lastName": "Doe",
      "email": "jane@example.com", "phone": "555-123-4567",
      "dateOfBirth": "1990-05-10", "ssn": "123-45-6780",
      "address": {
        "line1": "1 Main St", "city": "Albany",
        "state": "NY", "postalCode": "12207"
      }
    },
    "program": {
      "name": "ECE Certification",
      "amountRequested": 500,
      "agreementAccepted": true
    }
  }'
```

**Responses:**
- `201` with `{ applicationId, reviewTier, riskFlags }` on success
- `400` with `{ error, fieldErrors? }` on bad JSON or failed validation
- `401` on missing or invalid `X-API-Key`

## How PII is handled

**Storage.** Full applicant data (including SSN, DOB, address) lives in an in-memory `Map` keyed by application id. Per the brief, no database. In production this would be a DB row with the SSN encrypted at rest (AWS KMS envelope encryption).

**Logging.** Every `console.*` call that touches applicant data goes through helpers in [`src/infrastructure/logging/redact.ts`](src/infrastructure/logging/redact.ts). SSN is logged as `***-**-1234` (last four). Email is logged as `j***@example.com`. DOB and full address are never logged. There is no raw `console.log(applicant)` anywhere in this repo.

**API response.** The 201 response returns only `applicationId`, `reviewTier`, `riskFlags`. No echo of submitted PII.

**Downstream handoff.** A separate store (`handoffRepo`) holds `DownstreamRecord` objects, a different TypeScript type with fewer fields. `DownstreamRecord` has **no SSN, no DOB, no full address**. The type makes it a compile-time error to add them back. A test ([`tests/api-auth.test.ts`](tests/api-auth.test.ts)) stringifies the record and asserts the SSN, DOB, and street are absent.

**API auth.** `X-API-Key` is compared with `crypto.timingSafeEqual`, not `===`, to avoid leaking the key's prefix length via timing differences. See [`src/infrastructure/auth/api-key.ts`](src/infrastructure/auth/api-key.ts).

**Client boundary.** The UI never receives the API key. The form submits via a Server Action, which runs server-side and delegates to the same `submitApplication` use case. The API key only matters for machine-to-machine callers.

**Validation.** Runs on both sides. Client-side is UX (inline errors on blur, no roundtrip). Server-side is trust. The client validator imports the same `validateApplicationInput` function the Server Action uses.

## Triage rules

Pure functions in [`src/domain/triage.ts`](src/domain/triage.ts). Each rule is independent; flags stack.

| Rule | Trigger | Flag |
|---|---|---|
| High amount | `program.amountRequested > 1000` | `HIGH_AMOUNT` |
| Minor applicant | Age derived from DOB, less than 18 at submission | `MINOR` |
| Suspicious SSN | Area `000`, `666`, or `9xx`; group `00`; serial `0000`; all-same-digit; known placeholders | `SUSPICIOUS_SSN` |

`reviewTier` is `manual_review` if any flag fires, else `standard`. The agreement checkbox is a validation gate, not a triage rule. An unchecked agreement is rejected before triage runs.

Full rule list with rationale: [notes.md, section 4](notes.md#4-triage-rules).

## AI tool usage

This codebase was written with Claude Code (Anthropic's CLI, Opus 4.7) as a pair. The work is AI-assisted, not AI-generated.

- I wrote the plan first, by hand, with the interview signals in mind. The plan drove the phased commits.
- Every suggestion from the model was reviewed before it landed. I rejected or rewrote changes I didn't agree with. Example: the initial form validated only on submit; I changed it to blur-time per-field.
- Commit messages are mine. Each commit compiles, lints, tells one story.
- The full process log, including the prompts I used and the decisions at each step, is in [notes.md](notes.md).

## What I'd do next

Outside the 4-hour cap:

- **Persistence.** Swap the in-memory repositories for a real DB (Postgres via Drizzle or Prisma). Field-level encryption for SSN using AWS KMS envelope encryption.
- **Deploy target.** ECS Fargate behind API Gateway for the HTTP API, with the API key stored in AWS Secrets Manager and rotated. Next.js app on the same cluster or on Vercel if speed matters more than AWS consolidation.
- **Security hardening.** Content Security Policy, HSTS, rate limiting by IP and by API key, CSRF tokens on the form path, structured logging with a PII scrubber at the transport layer.
- **Observability.** Structured logs to Datadog or CloudWatch, with the `redact()` helpers still running so no raw PII reaches log storage. Mixpanel for submission funnel analytics (no PII).
- **Admin UI.** A reviewer queue that reads from `handoffRepo` (or its DB equivalent) so a human can work through `manual_review` submissions. Audit log for every action.
- **Notifications.** Email the applicant on submission and when their status changes.
- **Testing.** Component tests for the form using React Testing Library. Integration tests that run against a real database in CI.

## Process log

For the full thinking, decisions, prompts, and tradeoffs as they happened, see [notes.md](notes.md).
