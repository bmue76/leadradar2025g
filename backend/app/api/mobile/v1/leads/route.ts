// app/api/mobile/v1/leads/route.ts
// LeadRadar2025g – Mobile API v1: Lead Create
//
// Contract:
//   POST /api/mobile/v1/leads
//   Header: x-api-key: <key>
//   Body: MobileLeadCreateRequest (validated here)
//   Delegates to: POST /api/leads (existing hardened flow)
//
// Response (v1):
//   Currently passthrough from /api/leads (same status/body)
//   (We can normalize to MobileLeadCreateResponseDTO in Block 5 if desired.)

import { NextResponse, type NextRequest } from "next/server";
import { requireApiKeyContext } from "@/lib/api-keys";
import { mobileLeadCreateRequestSchema } from "@/lib/validation/mobile";

function isResponse(v: unknown): v is Response {
  return v instanceof Response;
}

async function readJson(req: NextRequest): Promise<unknown> {
  try {
    return await req.json();
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    // Ensure API-key auth already here (nice errors + avoids useless internal call)
    const auth = await requireApiKeyContext(req);
    if (isResponse(auth)) return auth;

    const body = await readJson(req);
    if (!body) {
      return NextResponse.json(
        { error: "Invalid JSON body" },
        { status: 400, headers: { "cache-control": "no-store" } }
      );
    }

    const parsed = mobileLeadCreateRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          issues: parsed.error.issues.map((i) => ({
            path: i.path.join("."),
            message: i.message,
          })),
        },
        { status: 400, headers: { "cache-control": "no-store" } }
      );
    }

    // Delegate to existing endpoint (shares the whole lead-create flow)
    const url = new URL("/api/leads", req.nextUrl.origin);

    const headers = new Headers();
    // forward auth + content-type explicitly
    const apiKey = req.headers.get("x-api-key");
    if (apiKey) headers.set("x-api-key", apiKey);
    headers.set("content-type", "application/json");

    // If your /api/leads expects the same shape, we can pass as-is:
    // { formId, eventId?, values, source?, meta? }
    const res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(parsed.data),
      cache: "no-store",
    });

    // passthrough response body/status
    const text = await res.text();
    const contentType = res.headers.get("content-type") ?? "application/json";

    return new NextResponse(text, {
      status: res.status,
      headers: {
        "content-type": contentType,
        "cache-control": "no-store",
      },
    });
  } catch (err) {
    if (isResponse(err)) return err;

    const message = err instanceof Error ? err.message : "Internal Server Error";
    return NextResponse.json(
      { error: message },
      { status: 500, headers: { "cache-control": "no-store" } }
    );
  }
}
