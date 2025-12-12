// app/api/mobile/v1/events/route.ts
// LeadRadar2025g – Mobile API v1: Events
//
// Contract:
//   GET /api/mobile/v1/events
//   Header: x-api-key: <key>
//   Response: { items: MobileEventDTO[] }

import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiKeyContext } from "@/lib/api-keys";
import { toMobileEventDTO } from "@/lib/mobile-mappers";

function isResponse(v: unknown): v is Response {
  return v instanceof Response;
}

function parseStatuses(url: URL): string[] {
  // Optional override via ?status=PLANNED,ACTIVE
  const raw = url.searchParams.get("status");
  if (!raw) return ["PLANNED", "ACTIVE"];

  const parts = raw
    .split(",")
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean);

  return parts.length ? parts : ["PLANNED", "ACTIVE"];
}

export async function GET(req: NextRequest) {
  try {
    const ctx = await requireApiKeyContext(req);
    if (isResponse(ctx)) return ctx;

    // In deinem Projekt ist tenantId eine Int (number)
    const tenantId = ctx.tenantId;

    const url = new URL(req.url);
    const statuses = parseStatuses(url);

    const events = await prisma.event.findMany({
      where: {
        tenantId,
        // TS: Enum typing umgehen ohne `any`; runtime bleiben es strings
        status: { in: statuses as unknown as never[] },
      },
      orderBy: [{ startDate: "desc" }, { createdAt: "desc" }],
    });

    return NextResponse.json(
      { items: events.map(toMobileEventDTO) },
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
