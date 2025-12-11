// backend/app/api/leads/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { handleLeadCreatedEmailFlows } from '@/lib/lead-email-flows';
import { getClientIp, checkRateLimit } from '@/lib/rate-limit';
import { createLeadRequestSchema } from '@/lib/validation/leads';
import type { ZodError } from 'zod';

/**
 * Hilfsfunktion: Prüft, ob ein Wert als "gefüllt" gilt.
 * Für Strings: nicht leer nach Trim
 * Für Arrays: mindestens ein "gefülltes" Element
 * Für andere Typen: nicht null/undefined
 */
function isNonEmptyValue(value: unknown): boolean {
  if (value == null) return false;

  if (typeof value === 'string') {
    return value.trim().length > 0;
  }

  if (Array.isArray(value)) {
    return value.some((item) => isNonEmptyValue(item));
  }

  // Für einfache Cases (Zahlen, Booleans, Objekte) genügt "nicht null"
  return true;
}

/**
 * POST /api/leads
 *
 * Öffentlicher Endpoint zum Anlegen eines Leads.
 *
 * Erwarteter Body:
 * {
 *   "formId": 1,
 *   "values": {
 *     "firstName": "Beat",
 *     "lastName": "Müller",
 *     "email": "beat@example.com"
 *   },
 *   "eventId": 123,         // optional
 *   "source": "mobile-app"  // optional
 * }
 *
 * - Validiert Body-Struktur mit Zod.
 * - Prüft Pflichtfelder des Formulars.
 * - Legt den Lead an.
 * - Triggert danach die E-Mail-Flows (Danke-Mail & Innendienst).
 */
export async function POST(req: NextRequest) {
  // 0) Rate Limiting: 30 Requests pro Minute pro Client (API-Key oder IP)
  const clientId = req.headers.get('x-api-key') ?? getClientIp(req);

  const rlResult = checkRateLimit({
    key: `${clientId}:POST:/api/leads`,
    windowMs: 60_000, // 1 Minute
    maxRequests: 30,
  });

  if (!rlResult.allowed) {
    const retryAfterSeconds = Math.ceil((rlResult.retryAfterMs ?? 0) / 1000);

    return NextResponse.json(
      {
        error: 'Too many requests',
        code: 'RATE_LIMITED',
        details: {
          retryAfterMs: rlResult.retryAfterMs ?? 0,
          retryAfterSeconds,
        },
      },
      {
        status: 429,
        headers: {
          'Retry-After': retryAfterSeconds.toString(),
        },
      },
    );
  }

  // 1) Body einlesen & mit Zod validieren
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json(
      {
        error: 'Ungültiger JSON-Body.',
        code: 'INVALID_JSON',
      },
      { status: 400 },
    );
  }

  const parseResult = createLeadRequestSchema.safeParse(json);

  if (!parseResult.success) {
    const zodError = parseResult.error as ZodError;

    return NextResponse.json(
      {
        error: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: {
          issues: zodError.issues,
        },
      },
      { status: 400 },
    );
  }

  const { formId, values, eventId, source } = parseResult.data;

  try {
    // 2) Formular laden
    const form = await prisma.form.findUnique({
      where: { id: formId },
    });

    if (!form) {
      return NextResponse.json(
        {
          error: 'Formular nicht gefunden.',
          code: 'FORM_NOT_FOUND',
        },
        { status: 404 },
      );
    }

    // 3) Tenant laden (für spätere E-Mail-Templates)
    const tenant = await prisma.tenant.findUnique({
      where: { id: form.tenantId },
    });

    if (!tenant) {
      return NextResponse.json(
        {
          error: 'Tenant für dieses Formular wurde nicht gefunden.',
          code: 'TENANT_NOT_FOUND',
        },
        { status: 500 },
      );
    }

    // 4) Formularfelder laden und Pflichtfelder prüfen
    const formFields = await prisma.formField.findMany({
      where: {
        formId: form.id,
        // isActive: true,  // optional, falls Flag existiert
      },
      orderBy: {
        order: 'asc',
      },
    });

    const missingRequiredKeys: string[] = [];

    for (const field of formFields) {
      if (!field.required) continue;

      const rawValue = (values as Record<string, unknown>)[field.key];

      if (!isNonEmptyValue(rawValue)) {
        missingRequiredKeys.push(field.key);
      }
    }

    if (missingRequiredKeys.length > 0) {
      return NextResponse.json(
        {
          error: 'Pflichtfelder fehlen oder sind leer.',
          code: 'MISSING_REQUIRED_FIELDS',
          missingFields: missingRequiredKeys,
        },
        { status: 400 },
      );
    }

    // 5) Lead anlegen
    const now = new Date();

    const lead = await prisma.lead.create({
      data: {
        tenantId: form.tenantId,
        formId: form.id,
        values: values as any,
        eventId: eventId ?? null,
        source: source ?? null,
        // createdByUserId etc. können später ergänzt werden
        createdAt: now,
        updatedAt: now,
      },
    });

    // 6) E-Mail-Flows ausführen (Danke-Mail & Innendienst)
    //    WICHTIG: Fehler in den E-Mail-Flows dürfen NICHT den Lead-Speicherprozess zerschießen.
    try {
      await handleLeadCreatedEmailFlows({
        lead,
        form,
        tenant,
      });
    } catch (err) {
      console.error('[api/leads] Unerwarteter Fehler in handleLeadCreatedEmailFlows:', err);
    }

    // 7) Response
    return NextResponse.json(
      {
        id: lead.id,
        formId: lead.formId,
        createdAt: lead.createdAt,
      },
      { status: 201 },
    );
  } catch (err) {
    console.error('[api/leads] Unerwarteter Serverfehler:', err);

    return NextResponse.json(
      {
        error: 'Interner Serverfehler bei der Lead-Erstellung.',
        code: 'INTERNAL_ERROR',
      },
      { status: 500 },
    );
  }
}
