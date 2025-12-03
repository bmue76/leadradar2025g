// backend/app/api/leads/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import type { CreateLeadRequest } from '@/lib/types/forms';

export const dynamic = 'force-dynamic';

type ErrorCode =
  | 'VALIDATION_ERROR'
  | 'NOT_FOUND'
  | 'INTERNAL_ERROR';

function jsonError(
  message: string,
  status: number,
  code: ErrorCode,
  details?: unknown,
) {
  return NextResponse.json(
    {
      error: message,
      code,
      ...(details ? { details } : {}),
    },
    { status },
  );
}

/**
 * POST /api/leads
 *
 * Öffentlicher Endpoint zum Anlegen eines Leads.
 *
 * Erwarteter Body (CreateLeadRequest):
 * {
 *   "formId": 1,
 *   "values": {
 *     "firstName": "Beat",
 *     "lastName": "Müller",
 *     "email": "beat@example.com"
 *   }
 * }
 *
 * Validierung:
 * - formId > 0
 * - Form existiert und ist ACTIVE
 * - values ist ein Objekt
 * - alle required Felder des Forms haben einen nicht-leeren Wert
 *
 * Response 201:
 * {
 *   "lead": { ...Lead }
 * }
 */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => null)) as CreateLeadRequest | null;

    if (!body || typeof body !== 'object') {
      return jsonError(
        'Invalid request body: expected JSON object',
        400,
        'VALIDATION_ERROR',
      );
    }

    const { formId, values } = body as any;

    if (
      typeof formId !== 'number' ||
      !Number.isFinite(formId) ||
      formId <= 0
    ) {
      return jsonError(
        'Invalid formId: must be a positive number',
        400,
        'VALIDATION_ERROR',
      );
    }

    if (
      !values ||
      typeof values !== 'object' ||
      Array.isArray(values)
    ) {
      return jsonError(
        'Invalid values: must be an object with key-value pairs',
        400,
        'VALIDATION_ERROR',
      );
    }

    // Nur ACTIVE Forms sind gültige Ziele für Leads
    const form = await prisma.form.findFirst({
      where: {
        id: formId,
        status: 'ACTIVE' as any,
      },
      select: {
        id: true,
        tenantId: true,
      },
    });

    if (!form) {
      return jsonError(
        'Form not found or inactive',
        404,
        'NOT_FOUND',
      );
    }

    const formFields = await prisma.formField.findMany({
      where: {
        formId: form.id,
        isActive: true,
      },
      select: {
        key: true,
        required: true,
      },
      orderBy: {
        order: 'asc',
      },
    });

    // Sanitisierung & Required-Checks
    const sanitizedValues: Record<string, string | null> = {};
    const missingRequired: string[] = [];

    for (const field of formFields) {
      const rawValue = (values as any)[field.key];

      if (
        rawValue === undefined ||
        rawValue === null ||
        (typeof rawValue === 'string' && rawValue.trim().length === 0)
      ) {
        if (field.required) {
          missingRequired.push(field.key);
        }
        sanitizedValues[field.key] = null;
        continue;
      }

      // Alles nach string normalisieren
      if (typeof rawValue === 'string') {
        sanitizedValues[field.key] = rawValue;
      } else {
        sanitizedValues[field.key] = String(rawValue);
      }
    }

    if (missingRequired.length > 0) {
      return jsonError(
        'Missing required fields',
        422,
        'VALIDATION_ERROR',
        { missingFields: missingRequired },
      );
    }

    // Option: zusätzliche Keys in values, die es im Form nicht gibt, werden ignoriert.
    // (Könnte man später loggen.)

    const lead = await prisma.lead.create({
      data: {
        tenantId: form.tenantId,
        formId: form.id,
        values: sanitizedValues,
      },
    });

    return NextResponse.json(
      { lead },
      { status: 201 },
    );
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error in POST /api/leads', error);
    return jsonError('Internal server error', 500, 'INTERNAL_ERROR');
  }
}
