import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";

import { POST } from "@/app/api/applications/route";
import { applicationRepo } from "@/src/infrastructure/repositories/application-repo";
import { handoffRepo } from "@/src/infrastructure/repositories/handoff-repo";

const API_KEY = "test-api-key-xyz";

function buildRequest(init: {
  apiKey?: string | null;
  body?: unknown;
  rawBody?: string;
}): NextRequest {
  const headers = new Headers({ "content-type": "application/json" });
  if (init.apiKey !== undefined && init.apiKey !== null) {
    headers.set("x-api-key", init.apiKey);
  }
  const body =
    init.rawBody !== undefined ? init.rawBody : init.body !== undefined ? JSON.stringify(init.body) : undefined;
  return new NextRequest("http://localhost/api/applications", {
    method: "POST",
    headers,
    body,
  });
}

function validBody() {
  return {
    applicant: {
      firstName: "Jane",
      lastName: "Doe",
      email: "jane@example.com",
      phone: "555-123-4567",
      dateOfBirth: "1990-05-10",
      ssn: "123-45-6780",
      address: {
        line1: "1 Main St",
        city: "Albany",
        state: "NY",
        postalCode: "12207",
      },
    },
    program: {
      name: "ECE Certification",
      amountRequested: 500,
      agreementAccepted: true,
    },
  };
}

describe("POST /api/applications", () => {
  beforeEach(() => {
    process.env.APPLICATIONS_API_KEY = API_KEY;
    applicationRepo.clear();
    handoffRepo.clear();
  });

  afterEach(() => {
    delete process.env.APPLICATIONS_API_KEY;
  });

  it("returns 401 when the API key header is missing", async () => {
    const res = await POST(buildRequest({ body: validBody() }));
    expect(res.status).toBe(401);
    expect(applicationRepo.count()).toBe(0);
    expect(handoffRepo.count()).toBe(0);
  });

  it("returns 401 when the API key is wrong", async () => {
    const res = await POST(buildRequest({ apiKey: "wrong-key", body: validBody() }));
    expect(res.status).toBe(401);
    expect(applicationRepo.count()).toBe(0);
  });

  it("returns 400 when the body is not valid JSON", async () => {
    const res = await POST(buildRequest({ apiKey: API_KEY, rawBody: "not json" }));
    expect(res.status).toBe(400);
    expect(applicationRepo.count()).toBe(0);
  });

  it("returns 400 and field errors when the body fails validation", async () => {
    const bad = validBody();
    bad.program.agreementAccepted = false;
    const res = await POST(buildRequest({ apiKey: API_KEY, body: bad }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.fieldErrors["program.agreementAccepted"]).toBeDefined();
    expect(applicationRepo.count()).toBe(0);
  });

  it("returns 201 with applicationId + triage on valid submission", async () => {
    const res = await POST(buildRequest({ apiKey: API_KEY, body: validBody() }));
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(typeof json.applicationId).toBe("string");
    expect(json.applicationId.length).toBeGreaterThan(0);
    expect(json.reviewTier).toBe("auto_approve");
    expect(json.riskFlags).toEqual([]);
    expect(applicationRepo.count()).toBe(1);
    expect(handoffRepo.count()).toBe(1);
  });

  it("routes to manual_review when a risk flag fires", async () => {
    const body = validBody();
    body.program.amountRequested = 5000;
    const res = await POST(buildRequest({ apiKey: API_KEY, body }));
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.reviewTier).toBe("manual_review");
    expect(json.riskFlags).toContain("HIGH_AMOUNT");
  });

  it("downstream handoff omits SSN, DOB, and address", async () => {
    const res = await POST(buildRequest({ apiKey: API_KEY, body: validBody() }));
    expect(res.status).toBe(201);
    const handoff = handoffRepo.all()[0];
    expect(handoff).toBeDefined();
    const serialized = JSON.stringify(handoff);
    expect(serialized).not.toContain("123-45-6780");
    expect(serialized).not.toContain("1990-05-10");
    expect(serialized).not.toContain("1 Main St");
  });
});
