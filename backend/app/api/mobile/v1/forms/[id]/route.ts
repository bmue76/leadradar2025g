// app/api/mobile/v1/forms/[id]/route.ts
// LeadRadar2025g – Mobile API v1: Form Detail
//
// Contract:
//   GET /api/mobile/v1/forms/:id
//   Header: x-api-key: <key>
//   Response: MobileFormDTO

import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiKeyContext } from "@/lib/api-keys";
import { toMobileFormDTO } from "@/lib/mobile-mappers";

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

    const { id } = await params;
    const formId = parseIntId(id);

    if (!formId) {
      return NextResponse.json(
        { error: "Invalid form id" },
        { status: 400, headers: { "cache-control": "no-store" } }
      );
    }

    const form = await prisma.form.findFirst({
      where: { id: formId, tenantId },
      include: { fields: true },
    });

    if (!form) {
      return NextResponse.json(
        { error: "Form not found" },
        { status: 404, headers: { "cache-control": "no-store" } }
      );
    }

    return NextResponse.json(toMobileFormDTO(form), {
      status: 200,
      headers: { "cache-control": "no-store" },
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
