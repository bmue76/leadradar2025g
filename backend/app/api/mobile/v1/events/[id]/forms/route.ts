// app/api/mobile/v1/events/[id]/forms/route.ts
// LeadRadar2025g – Mobile API v1: Event Forms
//
// Contract:
//   GET /api/mobile/v1/events/:id/forms
//   Header: x-api-key: <key>
//   Response: { event: MobileEventDTO, forms: MobileFormDTO[] }

import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiKeyContext } from "@/lib/api-keys";
import { toMobileEventDTO, toMobileFormDTO } from "@/lib/mobile-mappers";

function isResponse(v: unknown): v is Response {
  return v instanceof Response;
}

function parseIntId(raw: string): number | null {
  const n = Number(raw);
  if (!Number.isInteger(n) || n <= 0) return null;
  return n;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireApiKeyContext(req);
    if (isResponse(auth)) return auth;

    const tenantId = auth.tenantId;

    // Next.js 16: params is a Promise
    const { id } = await params;
    const eventId = parseIntId(id);

    if (!eventId) {
      return NextResponse.json(
        { error: "Invalid event id" },
        { status: 400, headers: { "cache-control": "no-store" } }
      );
    }

    const event = await prisma.event.findFirst({
      where: { id: eventId, tenantId },
    });

    if (!event) {
      return NextResponse.json(
        { error: "Event not found" },
        { status: 404, headers: { "cache-control": "no-store" } }
      );
    }

    const bindings = await prisma.eventForm.findMany({
      where: {
        eventId,
        form: { tenantId },
      },
      include: {
        form: {
          include: { fields: true },
        },
      },
      orderBy: [{ id: "asc" }], // robust fallback (createdAt may not exist)
    });

    const forms = bindings
      .map((b) => b.form)
      .filter((f, idx, arr) => arr.findIndex((x) => x.id === f.id) === idx)
      .map((f) => toMobileFormDTO(f));

    return NextResponse.json(
      { event: toMobileEventDTO(event), forms },
      { status: 200, headers: { "cache-control": "no-store" } }
    );
  } catch (err) {
    if (isResponse(err)) return err;

    const message = err instanceof Error ? err.message : "Internal Server Error";
    return NextResponse.json(
      { error: message },
      { status: 500, headers: { "cache-control": "no-store" } }
    );
  }
}
