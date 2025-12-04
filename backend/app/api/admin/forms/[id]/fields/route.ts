// app/api/admin/forms/[id]/fields/route.ts

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuthContext } from '@/lib/auth';

type RouteContext = {
  params: Promise<{
    id: string | string[];
  }>;
};

function jsonError(
  status: number,
  error: string,
  message: string,
  extra?: Record<string, unknown>,
) {
  return Response.json({ error, message, ...extra }, { status });
}

/**
 * Hilfsfunktion: formId robust aus den Route-Params extrahieren.
 * - Akzeptiert string oder string[]
 * - Nutzt parseInt, damit auch exotische Werte wie "1?foo=bar" noch 1 ergeben.
 */
function parseFormId(rawId: string | string[] | undefined): number | null {
  const raw = typeof rawId === 'string' ? rawId : rawId?.[0];

  if (!raw) return null;

  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;

  return parsed;
}

/**
 * GET /api/admin/forms/:id/fields
 *
 * Liste aller Felder eines Formulars (inkl. inaktive), nach order sortiert.
 */
export async function GET(req: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const formId = parseFormId(id);

  if (!formId) {
    return jsonError(400, 'BAD_REQUEST', 'Invalid form id');
  }

  // Auth + Tenant-Kontext laden
  const { tenant } = await requireAuthContext(req);

  // Formular im Tenant suchen
  const form = await prisma.form.findFirst({
    where: {
      id: formId,
      tenantId: tenant.id,
    },
    select: {
      id: true,
      tenantId: true,
    },
  });

  if (!form) {
    return jsonError(404, 'FORM_NOT_FOUND', 'Form not found');
  }

  // Felder des Formulars laden
  const fields = await prisma.formField.findMany({
    where: {
      formId: form.id,
      tenantId: tenant.id,
    },
    orderBy: [
      { order: 'asc' },
      { id: 'asc' },
    ],
  });

  return Response.json(fields, { status: 200 });
}

/**
 * POST /api/admin/forms/:id/fields
 *
 * Neues Feld für ein Formular anlegen.
 *
 * Minimaler Body:
 * {
 *   "key": "email",
 *   "label": "E-Mail",
 *   "type": "TEXT"
 * }
 *
 * Optional:
 * {
 *   "required": true,
 *   "placeholder": "E-Mail eingeben",
 *   "helpText": "Wir schicken dir eine Bestätigung.",
 *   "isActive": true
 * }
 */
export async function POST(req: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const formId = parseFormId(id);

  if (!formId) {
    return jsonError(400, 'BAD_REQUEST', 'Invalid form id');
  }

  const body = (await req.json().catch(() => null)) as Record<
    string,
    unknown
  > | null;

  if (!body || typeof body !== 'object') {
    return jsonError(400, 'BAD_REQUEST', 'Invalid request body');
  }

  const { key, label, type } = body;

  if (typeof key !== 'string' || key.trim() === '') {
    return jsonError(422, 'VALIDATION_ERROR', 'Field "key" is required', {
      field: 'key',
    });
  }

  if (typeof label !== 'string' || label.trim() === '') {
    return jsonError(422, 'VALIDATION_ERROR', 'Field "label" is required', {
      field: 'label',
    });
  }

  if (typeof type !== 'string' || type.trim() === '') {
    return jsonError(422, 'VALIDATION_ERROR', 'Field "type" is required', {
      field: 'type',
    });
  }

  const requiredRaw = body.required;
  const isActiveRaw = body.isActive;
  const placeholderRaw = body.placeholder;
  const helpTextRaw = body.helpText;

  const requiredBool =
    typeof requiredRaw === 'boolean' ? requiredRaw : false;
  const isActiveBool =
    typeof isActiveRaw === 'boolean' ? isActiveRaw : true;
  const placeholderStr =
    typeof placeholderRaw === 'string' && placeholderRaw.length > 0
      ? placeholderRaw
      : null;
  const helpTextStr =
    typeof helpTextRaw === 'string' && helpTextRaw.length > 0
      ? helpTextRaw
      : null;

  // Auth + Tenant holen
  const { tenant } = await requireAuthContext(req);

  // Formular im Tenant suchen
  const form = await prisma.form.findFirst({
    where: {
      id: formId,
      tenantId: tenant.id,
    },
    select: {
      id: true,
      tenantId: true,
    },
  });

  if (!form) {
    return jsonError(404, 'FORM_NOT_FOUND', 'Form not found');
  }

  // Anzahl bestehender Felder → neues Feld ans Ende anhängen
  const existingCount = await prisma.formField.count({
    where: {
      formId: form.id,
      tenantId: tenant.id,
    },
  });

  try {
    const newField = await prisma.formField.create({
      data: {
        formId: form.id,
        tenantId: tenant.id,
        key: key.trim(),
        label: label.trim(),
        // Typ pragmatisch als any casten, Prisma prüft Enum zur Laufzeit
        type: type.trim() as any,
        required: requiredBool,
        placeholder: placeholderStr,
        helpText: helpTextStr,
        order: existingCount + 1,
        isActive: isActiveBool,
      },
    });

    return Response.json(newField, { status: 201 });
  } catch (err: any) {
    console.error('[POST] /api/admin/forms/:id/fields error', err);

    if (err?.code === 'P2002') {
      return jsonError(
        422,
        'VALIDATION_ERROR',
        'Field "key" must be unique per form',
        { field: 'key' },
      );
    }

    return jsonError(
      500,
      'INTERNAL_SERVER_ERROR',
      'Unexpected error while creating field',
    );
  }
}
