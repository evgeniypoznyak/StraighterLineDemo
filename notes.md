# Notes — StraighterLine ECE Take-Home

A working log of how this solution was built. Every decision, every prompt, every tradeoff, captured as the work happened, in order. Intended to give the reviewer insight into the thinking process, not just the final artifact.

This is AI-assisted work, not AI-generated. I drove the design, I chose the tradeoffs, I reviewed every line before it landed.

---

## 0 — The brief

The task is a stipend application flow: a public `/apply` form that collects applicant PII (name, email, phone, DOB, SSN, address) plus program info (name, amount, agreement), a `POST /api/applications` route protected by `X-API-Key`, in-memory persistence, a triage step that assigns a review tier and risk flags, and a decoupled downstream handoff record. At least one meaningful test. README covering PII handling, triage logic, AI tool usage, setup.

Four-hour cap. No databases, no Docker, no AWS.

**What I noticed on the first read.** The prompt is doing three things at once: it's asking for a functional feature, it's probing how I think about sensitive data, and it's looking at separation of concerns. The easy shortcut is a single `route.ts` that does everything inline. The interesting version splits domain, application, and infrastructure so the shape of the code answers the PII question on its own. I'm going with the interesting version.

**What I'm optimizing for.**
1. **A reviewer can read the code and know what I'd do in production.** Every choice has a reason I can defend.
2. **PII is handled carefully.** Not theatrically. Specifically. SSN never logged, never echoed back, never in the downstream record.
3. **Tests that exercise the real logic** — triage rules and auth — not coverage-theater unit tests on getters.
4. **Small, readable commits.** Each one compiles, lints, and tells one story.

---

## 1 — Reading the Next.js 16 docs first

`AGENTS.md` warns: "This is NOT the Next.js you know. APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code."

Before writing anything I read:

- [`01-app/01-getting-started/15-route-handlers.md`](node_modules/next/dist/docs/01-app/01-getting-started/15-route-handlers.md) — Route Handlers live in `app/**/route.ts`, export named HTTP methods (`POST`, `GET`, etc.), receive `Request` and return `Response`. `NextRequest`/`NextResponse` are extended helpers. `RouteContext<'/path/[id]'>` is a new globally-available helper for typing dynamic params.
- [`01-app/02-guides/forms.md`](node_modules/next/dist/docs/01-app/02-guides/forms.md) — Server Actions are the idiomatic form handler: `<form action={serverAction}>` receives the `FormData` automatically. `useActionState` wires validation errors + pending state into a Client Component. Auth must be re-verified inside every Server Action regardless of where it's rendered.
- [`01-app/02-guides/data-security.md`](node_modules/next/dist/docs/01-app/02-guides/data-security.md) — The guide recommends a Data Access Layer that runs server-only, enforces authorization, and returns safe DTOs. That's the pattern I'm following with `src/application/submit-application.ts` and the handoff DTO.

Takeaway: the task maps cleanly onto the framework's grain. Route Handler for the API, Server Action for the form, shared use case below both. No fighting the framework.

---

## 2 — Architecture decisions (with reasoning)

### Why DDD + Hexagonal instead of flat Next.js

A flat `app/api/applications/route.ts` with validation, triage, and persistence inline would fit in one file. For a four-hour exercise that's tempting. I'm not doing it because:

- The brief explicitly evaluates **separation of concerns**. Folder structure is the cheapest way to demonstrate that.
- The triage rules need isolated unit tests. Pure functions in `src/domain/triage.ts` are trivially testable; inline code in a route handler is not.
- The downstream handoff requirement is a domain-level concept. It belongs in the domain layer, not bolted onto an HTTP handler.

The shape:

```
app/                    # transport (Next.js): UI + HTTP API
src/
  domain/               # pure: types, rules, validation — no I/O
  application/          # use cases: orchestrate domain + infra
  infrastructure/       # adapters: repos, auth, logging
```

Each layer depends only on inner layers. `domain/` doesn't import anything from `infrastructure/`. That's Hexagonal in spirit without over-engineering.

### Why a shared `submitApplication` use case

The UI form and the API route both need to do the same thing: validate → triage → persist → handoff. I considered two shapes:

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

### Why hand-rolled validation instead of Zod

For this scope (SSN patterns, DOB/age, email, amount bounds, required fields) a 60-line `validation.ts` is clearer than a Zod schema plus `safeParse` plus flattening errors. Zod is great when validation is the majority of the app's logic. Here it isn't. Keeping the dependency footprint minimal also means less supply-chain surface for a take-home that handles SSNs.

If this were production and the schema grew, I'd switch to Zod. The shape of the validator matches `safeParse` return shape precisely so the migration is mechanical.

### Why the commit granularity

Each commit should stand on its own: compiles, lints, tells one story. Not one big "done" commit. Not twenty micro-commits that hide the narrative. The reviewer should be able to read the log and watch the feature grow in the order I built it.

---

## 3 — PII threat model

_(filled in after Phase 3b)_

---

## 4 — Triage rules

_(filled in after Phase 3b)_

---

## 5 — Build log (phase by phase)

_(filled in as each phase completes)_

---

## 6 — Testing approach

_(filled in after Phase 5)_

---

## 7 — AI tool usage

_(filled in before submission)_

---

## 8 — What I'd do next

_(filled in before submission)_

---

## 9 — Tradeoffs against the 4-hour cap

_(filled in before submission)_
