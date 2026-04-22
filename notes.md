# Notes. StraighterLine ECE Take-Home

A working log of how this solution was built. Decisions, prompts, tradeoffs, captured as the work happened. Intended to give the reviewer insight into the thinking process, not just the final artifact.

This is AI-assisted work, not AI-generated. I drove the design, chose the tradeoffs, and reviewed every line before it landed.

---

## 0. The brief

The task is a stipend application flow: a public `/apply` form that collects applicant PII (name, email, phone, DOB, SSN, address) plus program info (name, amount, agreement), a `POST /api/applications` route protected by `X-API-Key`, in-memory persistence, a triage step that assigns a review tier and risk flags, and a decoupled downstream handoff record. At least one meaningful test. README covering PII handling, triage logic, AI tool usage, setup.

Four-hour cap. No databases, no Docker, no AWS.

**What I noticed on the first read.** The prompt is doing three things at once: it's asking for a functional feature, it's probing how I think about sensitive data, and it's looking at separation of concerns. The easy shortcut is a single `route.ts` that does everything inline. The interesting version splits domain, application, and infrastructure so the shape of the code answers the PII question on its own. I'm going with the interesting version.

**What I'm optimizing for.**
1. **A reviewer can read the code and know what I'd do in production.** Every choice has a reason I can defend.
2. **PII is handled carefully and concretely.** SSN is never logged, never echoed back, and never included in the downstream record.
3. **Tests that exercise the real logic** (triage rules, validation, auth) instead of coverage-theater unit tests on getters.
4. **Small, readable commits.** Each one compiles, lints, and tells one story.

---

## 1. Reading the Next.js 16 docs first

`AGENTS.md` warns: "This is NOT the Next.js you know. APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code."

Before writing anything I read:

- [`01-app/01-getting-started/15-route-handlers.md`](node_modules/next/dist/docs/01-app/01-getting-started/15-route-handlers.md). Route Handlers live in `app/**/route.ts`, export named HTTP methods (`POST`, `GET`, etc.), receive `Request` and return `Response`. `NextRequest`/`NextResponse` are extended helpers. `RouteContext<'/path/[id]'>` is a new globally-available helper for typing dynamic params.
- [`01-app/02-guides/forms.md`](node_modules/next/dist/docs/01-app/02-guides/forms.md). Server Actions are the idiomatic form handler: `<form action={serverAction}>` receives the `FormData` automatically. `useActionState` wires validation errors + pending state into a Client Component. Auth must be re-verified inside every Server Action regardless of where it's rendered.
- [`01-app/02-guides/data-security.md`](node_modules/next/dist/docs/01-app/02-guides/data-security.md). The guide recommends a Data Access Layer that runs server-only, enforces authorization, and returns safe DTOs. That's the pattern I'm following with `src/application/submit-application.ts` and the handoff DTO.

Takeaway: the task maps cleanly onto the framework's grain. Route Handler for the API, Server Action for the form, shared use case below both. No fighting the framework.

---

## 2. Architecture decisions (with reasoning)

### Why DDD + Hexagonal instead of flat Next.js

A flat `app/api/applications/route.ts` with validation, triage, and persistence inline would fit in one file. For a four-hour exercise that's tempting. I'm not doing it because:

- The brief explicitly evaluates **separation of concerns**. Folder structure is the cheapest way to demonstrate that.
- The triage rules need isolated unit tests. Pure functions in `src/domain/triage.ts` are trivially testable; inline code in a route handler is not.
- The downstream handoff requirement is a domain-level concept. It belongs in the domain layer, not bolted onto an HTTP handler.

The shape:

```
app/                    # transport (Next.js): UI + HTTP API
src/
  domain/               # pure types, rules, validation. No I/O.
  application/          # use cases: orchestrate domain + infra
  infrastructure/       # adapters: repos, auth, logging
```

Each layer depends only on inner layers. `domain/` doesn't import anything from `infrastructure/`. Hexagonal in spirit, without the ceremony.

### Why a shared `submitApplication` use case

The UI form and the API route both need to do the same thing: validate, triage, persist, hand off. I considered two shapes:

1. **API-only: UI calls `POST /api/applications` via `fetch`.** Rejected because the browser would need the API key, and the API key must never reach the client.
2. **Shared use case: both paths call `submitApplication(input)`.** UI through a Server Action, API through a Route Handler. Each path is responsible for its own auth concern (the UI is an authenticated-by-form-submission public endpoint; the API requires `X-API-Key`). The actual work is defined once.

Going with (2). The use case is the seam. If the persistence layer changes later (DB, queue, external service), both entry points follow for free.

### Why the API key never reaches the browser

The `X-API-Key` header protects the machine-to-machine API. If the UI called that same endpoint from the client, the key would be bundled into the JavaScript and trivially extractable. The Server Action path runs entirely on the server, so the UI never needs to know the key exists. This also means the UI form is rate-limited and auditable separately from the API (in production).

### Why triage is pure functions

```ts
computeTriage(applicant, program) → { reviewTier, riskFlags }
```

No I/O, no clock dependency beyond what's injected (for age-from-DOB), no side effects. Each rule is an independent predicate. Adding a new rule is one function + one test. The test file becomes a readable spec of the business logic.

### Why the downstream handoff record is an explicit DTO

The brief asks for a "separate in-memory record containing only the data needed for continued processing." This is a data-minimization requirement in disguise. I'm making it explicit: a `DownstreamRecord` type in `src/domain/handoff.ts` that is literally a different shape from `Application`. It cannot contain SSN because SSN is not a field on the type. Compile-time enforcement of the PII boundary.

### Why Vitest over Jest

Vitest works with TypeScript and ESM out of the box with zero config on Next.js 16. Jest needs a Babel or SWC transform configured for ESM in this project shape. Vitest's `vi` mock API is compatible with Jest's `jest` if I ever needed to switch. No ceremony, fast startup, fits the four-hour budget.

### Validate on both sides: client for UX, server for trust

Validation runs on the client AND on the server. They share the same `validateApplicationInput` function. Different reasons, both load-bearing:

- **Client-side is a UX affordance.** Users see inline errors immediately instead of waiting for a network roundtrip for each bad field. Feels fast, respects their time.
- **Server-side is the source of truth.** The client can be tampered with, disabled, replayed, or called from curl. Anything that survives the network boundary must be re-validated. The client validator is convenience; the server validator is the contract.

Implementation detail: `validateApplicationInput` is pure TypeScript (RegExp, Date, Number; nothing Node-only), so it imports cleanly into the Client Component. The `FormData → raw` shaping was extracted into [`app/apply/form-data.ts`](app/apply/form-data.ts) so the Server Action and the client form share one conversion path.

Flow:
1. **On blur** of a field the user actually touched: re-run `validateApplicationInput`, pluck out that field's error, show it inline. Nothing else's errors are affected. That's what makes the UX feel alive. You see a bad email right when you Tab past it, not on submit.
2. **On change** of a field with an existing error: clear its error immediately. The user is fixing it; yelling at them mid-keystroke is worse than waiting for the next blur.
3. **On submit:** run `validateApplicationInput` on the full form. If invalid, `event.preventDefault()`, show every error, focus the first invalid field. Nothing is sent to the server.
4. **On the server:** if the submission makes it through, the Server Action re-validates anyway. Triage and persist only run on valid input.

Per-field blur validation with clear-on-edit is the pattern. Submit-time validation is the safety net for fields the user never focused.

### Why hand-rolled validation instead of Zod

For this scope (SSN patterns, DOB/age, email, amount bounds, required fields) a 100-line `validation.ts` is clearer than a Zod schema plus `safeParse` plus flattening errors. Zod is great when validation is the majority of the app's logic. Here it isn't. Keeping the dependency footprint minimal also means less supply-chain surface for a take-home that handles SSNs.

If this were production and the schema grew, I'd switch to Zod. The shape of the validator matches `safeParse` return shape precisely, so the migration is mechanical.

### Why the commit granularity

Each commit should stand on its own: compiles, lints, tells one story. Not one big "done" commit. Not twenty micro-commits that hide the narrative. The reviewer should be able to read the log and watch the feature grow in the order I built it.

---

## 3. PII threat model

The brief evaluates "sensitive data protection." Here's the data flow, explicit.

### Where PII enters

1. **Browser → Server Action.** A user fills the `/apply` form. Full PII (name, email, phone, DOB, SSN, address) is posted as `FormData` over HTTPS to a Server Action. This runs server-side; no client JS sees the raw SSN after the field loses focus.
2. **External caller → POST /api/applications.** JSON body with the same shape. TLS expected (enforced at the infra boundary in production; not wired here).

### Where PII lives

- **Full `Application` aggregate.** Held in `src/infrastructure/repositories/application-repo.ts` as an in-memory `Map<id, Application>`. Per the brief, no persistence. In production this becomes a database row with SSN stored encrypted (KMS envelope, field-level).
- **`DownstreamRecord`.** A different shape. Fields: `applicationId`, `applicantName`, `applicantEmail`, `programName`, `amountRequested`, `reviewTier`, `riskFlags`, `submittedAt`. No SSN. No DOB. No address. This is what a downstream reviewer queue or notification worker reads.

### Where PII does NOT go

- **Logs.** Every `console.*` call goes through `redact()`, which replaces SSN with the last four digits and strips DOB/address. Grep the repo for raw `console.log(applicant.ssn)` to confirm there isn't one.
- **API response.** The 200 response from `POST /api/applications` is `{ applicationId, reviewTier, riskFlags }`. No echo of submitted PII. Clients that need the full record would fetch it via a separate authenticated endpoint.
- **Error messages.** Validation errors reference the field by path (`applicant.ssn`) with a human message ("SSN must be 9 digits"). They never echo the submitted value.
- **The client bundle.** The API key never touches the browser because the UI goes through a Server Action, not `fetch('/api/applications')`.

### Per-field handling

| Field | Client | Server | Stored | Logged | In downstream record |
|---|---|---|---|---|---|
| First/last name | plaintext input | plaintext | plaintext | yes | yes |
| Email | plaintext input | plaintext | plaintext | yes | yes |
| Phone | plaintext input | plaintext | plaintext | no | no |
| DOB | plaintext input | parsed to date | plaintext (in-memory) | no | no |
| SSN | plaintext input | normalized to `XXX-XX-XXXX` | plaintext (in-memory; encrypted at rest in prod) | redacted to last 4 | **no** |
| Address | plaintext input | plaintext | plaintext | no | no |

### Auth and timing

`X-API-Key` is compared with `crypto.timingSafeEqual`, not `===`. String equality short-circuits on the first differing byte, leaking the prefix length. Timing-safe compare runs in constant time.

### What I'd add in production

- Encryption at rest for SSN (AWS KMS envelope, field-level).
- TLS enforcement + HSTS header.
- Content Security Policy, SameSite=strict cookies, CSRF tokens for the form path.
- Structured logging (Pino or Datadog) with a PII scrubber at the transport layer, not relying on `redact()` discipline at each call site.
- Rate limiting on `POST /api/applications` by IP and by API key.
- Append-only audit log: every submission, every lookup.
- Secret rotation for `APPLICATIONS_API_KEY`, ideally via AWS Secrets Manager.

---

## 4. Triage rules

Pure functions in [src/domain/triage.ts](src/domain/triage.ts). Each rule is independent. Multiple rules can fire on the same submission; the flags stack. `reviewTier` resolves to `manual_review` if any flag is present, else `auto_approve`.

### Rules

| Rule | Trigger | Flag |
|---|---|---|
| High amount | `program.amountRequested > 1000` | `HIGH_AMOUNT` |
| Minor applicant | Age derived from DOB `< 18` at submission time | `MINOR` |
| Suspicious SSN | See patterns below | `SUSPICIOUS_SSN` |

### Suspicious SSN patterns

Based on Social Security Administration rules (numbers the SSA never issues) plus commonly-used placeholders:

- Area number `000` (never assigned)
- Area number `666` (never assigned)
- Area number `9xx` (never assigned, reserved)
- Group number `00`
- Serial number `0000`
- All nine digits the same (`111-11-1111` through `999-99-9999`)
- Known placeholder `123-45-6789`

Reference: [SSA SSN geo card history](https://www.ssa.gov/history/ssn/geocard.html).

This is not exhaustive. In production I'd also run an SSN-validity service (e.g., Experian Precise ID, LexisNexis) to cross-check against issued-number records. That's an external dependency the brief excludes.

### Pre-triage validation

The agreement checkbox is **not** a triage rule. If unchecked, `validateApplicationInput` rejects the submission before triage runs. Unchecked agreement is a malformed submission, not a risky one.

### Why not a score

I considered a numeric risk score instead of a flag list. Rejected: for a downstream human reviewer, flag names ("MINOR", "HIGH_AMOUNT") are more actionable than "risk score = 0.7". The reviewer queue can sort and filter on flags directly.

---

## 5. Build log (phase by phase)

_(filled in as each phase completes)_

---

## 6. Testing approach

Three test files, 32 assertions total. Run with `npm test`.

### What each file covers

**[`tests/triage.test.ts`](tests/triage.test.ts).** The business logic. One test per rule plus boundary cases:
- `HIGH_AMOUNT` at $1000 (not flagged; boundary is exclusive) and $1000.01 (flagged).
- `MINOR` at 17, 18, and a birthday-not-yet-this-year edge (so the month/day logic in `ageAt` is exercised).
- `SUSPICIOUS_SSN` parameterized over every pattern class: areas 000/666/9xx, group 00, serial 0000, all-same-digit, well-known placeholders. Plus a realistic SSN to prove the happy path.
- Combined flags: stacking plus `manual_review` resolution.

**[`tests/validation.test.ts`](tests/validation.test.ts).** Input contract. Covers happy path, SSN normalization to `XXX-XX-XXXX`, unchecked agreement, malformed SSN, zero/negative amount, future DOB, invalid email, non-object body, and state-code uppercasing. If the validator drifts, these break.

**[`tests/api-auth.test.ts`](tests/api-auth.test.ts).** The HTTP contract, against the real `POST` handler (imported directly and invoked with a mocked `NextRequest`):
- 401 on missing `X-API-Key`.
- 401 on wrong `X-API-Key`.
- 400 on non-JSON body.
- 400 with `fieldErrors` on validation failure.
- 201 on happy path with `{ applicationId, reviewTier, riskFlags }` in the body.
- Triage routing: `manual_review` + `HIGH_AMOUNT` when amount > $1000.
- **PII assertion:** the downstream handoff record, JSON-serialized, does not contain the SSN, DOB, or street address. This is the code-level guarantee behind the PII threat model. If someone ever adds SSN to `DownstreamRecord`, this test catches it immediately.

### What I didn't test

Given the four-hour cap, I left these out:

- **React component tests** for the form. `useActionState` and Server Actions make these awkward to mock. The submit path is already covered end-to-end by `api-auth.test.ts` (it exercises the same `submitApplication` use case the form triggers). A component test would validate rendering, not behavior.
- **Redaction helpers.** Small pure functions covered implicitly by the log output visible in the API test run (`***-**-6780`, `j***@example.com`). A unit test would be easy but low-value.
- **Concurrency** against the in-memory repos. Node single-thread + module-scoped Map means no race. If persistence moved to a real DB, I'd add tests for unique-id generation under contention.

### Why these tests and not more

The brief asks for "at least one meaningful test." The three I wrote map to the three concerns the brief scores against: business logic (triage), data discipline (handoff has no PII), and API contract (auth, validation, 201 shape). That's the minimum set that, if they pass, gives me confidence in the implementation.

---

## 7. AI tool usage

The honest accounting.

**Tool:** Claude Code (Anthropic's CLI, Opus 4.7). Used as a pair programmer, not a code generator.

**What the AI did well.**
- Drafted repetitive boilerplate: Tailwind class strings, test scaffolding, in-memory repository shape.
- Surfaced Next.js 16 API conventions I might have gotten wrong from memory alone. I verified every one by reading [`node_modules/next/dist/docs/`](node_modules/next/dist/docs/) before using it.
- Proposed the SSN pattern list. I cross-checked against SSA rules myself.

**Where I overrode or corrected the AI.**
- **Initial validation was submit-only.** I changed it to blur-time per-field validation with clear-on-edit. The model's first pass would have shipped a worse UX.
- **I rejected a mixed-mode form** that combined native browser tooltips with inline errors. The final version uses `noValidate` plus a shared custom validator so the errors are consistent.
- **I rewrote several commit messages** the model drafted. Commit messages are mine, not generated.
- **I deleted "defensive" `try/catch` blocks** the model added around already-safe operations. Every handler has one error path, nothing more.

**How I validated the model.**
- Ran `tsc --noEmit`, `eslint`, `next build`, and `vitest run` between every phase.
- Smoke-tested the API with real `curl` calls against the dev server for 401, 201, triage, and validation paths.
- Read every diff before committing. Not a single commit was `git add -A && commit` without reviewing the changes first.

**What I would not do.**
- Paste raw PII into an AI prompt. Every example in this codebase uses fake values. Real applicant data never leaves the server.
- Ship a test the AI wrote without me understanding what it asserts.

---

## 8. What I'd do next

If I had more time or this were going into production:

- **Persistence.** Real database. Postgres via Drizzle or Prisma. SSN field-level encryption at rest using AWS KMS envelope encryption.
- **Deploy target.** API Gateway + ECS Fargate for the HTTP API; API key in AWS Secrets Manager with rotation; Next.js app on the same cluster or Vercel. CloudWatch for logs.
- **Security hardening.** CSP, HSTS, SameSite=strict cookies, CSRF tokens for the form path. Rate limiting by IP and by API key. Structured logging with a PII scrubber at the transport layer rather than relying on `redact()` discipline at every call site.
- **Observability.** Datadog for structured logs and traces. Mixpanel for conversion analytics on the submission funnel (no PII events). PagerDuty for 5xx anomalies on `POST /api/applications`.
- **Admin UI.** A reviewer queue reading from the handoff store. Filter by `reviewTier` and `riskFlags`. Audit log for every reviewer action (who saw what, when).
- **Notifications.** Transactional email on submission, status change, and approval. Use a templated email service; unsubscribe handled out of band.
- **Testing.** React Testing Library component tests for the form. Integration tests against a real DB in CI. Property-based tests on the triage rules (fast-check) to fuzz edge cases.
- **Idempotency.** An idempotency key header on `POST /api/applications` so a retrying client can't create duplicate records under a bad network.

---

## 9. Tradeoffs against the 4-hour cap

Explicit "I chose X over Y because Z":

- **Vitest over Jest.** Jest needs a Babel or SWC transform configured for ESM in this Next.js 16 shape. Vitest is zero-config. Saved roughly 30 minutes.
- **Hand-rolled validator over Zod.** For this scope the validator is around 100 lines with type-specific error messages. Zod would be shorter per rule but adds a dependency and a `safeParse` indirection. If the schema grew past 3x this size, I'd switch.
- **In-memory `Map` repositories over a fake DB abstraction.** The brief says in-memory. A repository interface with an in-memory adapter was the cheapest way to signal "persistence would swap in here."
- **One Server Action plus one Route Handler, both calling the same use case, instead of only the API.** Took about 15 minutes more than just calling the API from the client. Paid back by keeping the API key off the client entirely.
- **Three test files (triage, validation, api-auth) instead of full coverage.** The brief asks for "at least one meaningful test." I went to three because those are the three concerns the brief evaluates against. Component tests, redaction helper tests, and fuzz tests were out of scope.
- **Minimal CSS, no component library.** Tailwind utility classes inline. A design system would have eaten an hour and added nothing the brief scores.
- **No Docker, no CI config.** The brief explicitly excludes them, and setting up a local Docker flow for a 4-hour exercise is ceremony.
- **No AWS deployment.** Scoped out by the brief. README sketches the realistic path.
- **No admin UI for the review queue.** The handoff record is the seam where that feature would plug in; building the reader was out of scope.
- **notes.md in English instead of bilingual.** Kept in one language to stay readable for the reviewer.
