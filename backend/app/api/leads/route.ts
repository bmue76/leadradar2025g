// backend/app/api/leads/route.ts

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handleLeadCreatedEmailFlows } from "@/lib/lead-email-flows";
import { createLeadRequestSchema } from "@/lib/validation/leads";
import { requireApiKeyContext } from "@/lib/api-keys";
import { checkDualRateLimit } from "@/lib/api-rate-limit";
import type { ZodError } from "zod";

function isNonEmptyValue(value: unknown): boolean {
  if (value == null) return false;

  if (typeof value === "string") {
    return value.trim().length > 0;
  }

  if (Array.isArray(value)) {
    return value.some((item) => isNonEmptyValue(item));
  }

  return true;
}

export async function POST(req: NextRequest) {
  // 0) API-Key Auth erzwingen
  let apiKeyContext: Awaited<ReturnType<typeof requireApiKeyContext>>;
  try {
    apiKeyContext = await requireApiKeyContext(req);
  } catch (error: any) {
    if (error?.status && error?.message) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { tenantId, apiKeyId } = apiKeyContext;

  // 1) Dual Rate Limiting (API-Key + IP)
  const rl = checkDualRateLimit(req, {
    routeKey: "POST:/api/leads",
    windowMs: 60_000,
    tenantId,
    apiKeyId,
    maxRequestsPerApiKey: 30,
    maxRequestsPerIp: 60,
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
        headers: {
          "Retry-After": rl.retryAfterSeconds.toString(),
        },
      }
    );
  }

  // 2) Body einlesen & mit Zod validieren
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Ungültiger JSON-Body.", code: "INVALID_JSON" },
      { status: 400 }
    );
  }

  const parseResult = createLeadRequestSchema.safeParse(json);

  if (!parseResult.success) {
    const zodError = parseResult.error as ZodError;
    return NextResponse.json(
      {
        error: "Validation failed",
        code: "VALIDATION_ERROR",
        details: { issues: zodError.issues },
      },
      { status: 400 }
    );
  }

  const { formId, values, eventId, source } = parseResult.data;

  try {
    // 3) Form muss zum Tenant des API-Keys gehören
    const form = await prisma.form.findFirst({
      where: { id: formId, tenantId },
    });

    if (!form) {
      return NextResponse.json(
        { error: "Formular nicht gefunden.", code: "FORM_NOT_FOUND" },
        { status: 404 }
      );
    }

    // 4) Tenant laden (für E-Mail-Templates)
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
    });

    if (!tenant) {
      return NextResponse.json(
        { error: "Tenant für diesen API-Key wurde nicht gefunden.", code: "TENANT_NOT_FOUND" },
        { status: 500 }
      );
    }

    // 5) Optional: Event-Checks (Tenant + Binding Form <-> Event)
    if (eventId != null) {
      const event = await prisma.event.findFirst({
        where: { id: eventId, tenantId },
        select: { id: true },
      });

      if (!event) {
        return NextResponse.json(
          { error: "Event nicht gefunden.", code: "EVENT_NOT_FOUND" },
          { status: 404 }
        );
      }

      const binding = await prisma.eventForm.findFirst({
        where: { eventId, formId: form.id },
        select: { id: true },
      });

      if (!binding) {
        return NextResponse.json(
          {
            error: "Formular ist diesem Event nicht zugeordnet.",
            code: "FORM_NOT_ASSIGNED_TO_EVENT",
          },
          { status: 400 }
        );
      }
    }

    // 6) Pflichtfelder prüfen
    const formFields = await prisma.formField.findMany({
      where: { formId: form.id },
      orderBy: { order: "asc" },
    });

    const missingRequiredKeys: string[] = [];
    for (const field of formFields) {
      if (!field.required) continue;

      const rawValue = (values as Record<string, unknown>)[field.key];
      if (!isNonEmptyValue(rawValue)) missingRequiredKeys.push(field.key);
    }

    if (missingRequiredKeys.length > 0) {
      return NextResponse.json(
        {
          error: "Pflichtfelder fehlen oder sind leer.",
          code: "MISSING_REQUIRED_FIELDS",
          missingFields: missingRequiredKeys,
        },
        { status: 400 }
      );
    }

    // 7) Lead anlegen (tenantId IMMER aus API-Key)
    const now = new Date();
    const lead = await prisma.lead.create({
      data: {
        tenantId,
        formId: form.id,
        values: values as any,
        eventId: eventId ?? null,
        source: source ?? null,
        createdAt: now,
        updatedAt: now,
      },
    });

    // 8) E-Mail-Flows ausführen (Fehler dürfen nicht speichern verhindern)
    try {
      await handleLeadCreatedEmailFlows({ lead, form, tenant });
    } catch (err) {
      console.error("[api/leads] Unerwarteter Fehler in handleLeadCreatedEmailFlows:", err);
    }

    return NextResponse.json(
      { id: lead.id, formId: lead.formId, createdAt: lead.createdAt },
      { status: 201 }
    );
  } catch (err) {
    console.error("[api/leads] Unerwarteter Serverfehler:", err);
    return NextResponse.json(
      { error: "Interner Serverfehler bei der Lead-Erstellung.", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
