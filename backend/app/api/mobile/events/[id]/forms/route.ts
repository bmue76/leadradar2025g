import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiKeyContext } from "@/lib/api-keys";
import { checkDualRateLimit } from "@/lib/api-rate-limit";

function parseId(param: string | undefined): number | null {
  if (!param) return null;
  const n = Number(param);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { tenantId, apiKeyId } = await requireApiKeyContext(req);

    const { id } = await context.params;
    const eventId = parseId(id);

    if (!eventId) {
      return NextResponse.json({ error: "Invalid event id" }, { status: 400 });
    }

    // Rate Limit (API-Key + IP)
    const rl = checkDualRateLimit(req, {
      routeKey: "GET:/api/mobile/events/:id/forms",
      windowMs: 60_000,
      tenantId,
      apiKeyId,
      maxRequestsPerApiKey: 120,
      maxRequestsPerIp: 240,
    });

    if (!rl.allowed) {
      return NextResponse.json(
        {
          error: "Too many requests",
          code: "RATE_LIMITED",
          details: {
            limitedBy: rl.limitedBy,
            retryAfterMs: rl.retryAfterMs,
            retryAfterSeconds: rl.retryAfterSeconds,
          },
        },
        {
          status: 429,
          headers: { "Retry-After": rl.retryAfterSeconds.toString() },
        }
      );
    }

    // Ownership: Event muss zum Tenant gehören
    const event = await prisma.event.findFirst({
      where: { id: eventId, tenantId },
      select: { id: true },
    });

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    const eventForms = await prisma.eventForm.findMany({
      where: { eventId },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        createdAt: true,
        form: {
          select: {
            id: true,
            name: true,
            updatedAt: true,
          },
        },
      },
    });

    const forms = eventForms.map((ef) => ({
      eventFormId: ef.id,
      formId: ef.form.id,
      name: ef.form.name,
      updatedAt: ef.form.updatedAt,
    }));

    return NextResponse.json({ forms }, { status: 200 });
  } catch (error: any) {
    if (error?.status && error?.message) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error("[GET /api/mobile/events/[id]/forms] Unexpected error", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
