// backend/app/api/forms/[id]/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

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
 * GET /api/forms/[id]
 *
 * Öffentlicher Endpoint, um ein aktives Formular für Mobile/Öffentlich zu laden.
 * - Keine Authentifizierung.
 * - Liefert nur Forms mit Status "ACTIVE".
 * - Liefert nur aktive Felder (isActive = true), nach "order" sortiert.
 *
 * Response 200 OK:
 * {
 *   "form": { ...Form },
 *   "fields": [ ...FormField[] ]
 * }
 */
export async function GET(req: NextRequest, context: any) {
  try {
    // In Next 15 ist context.params ein Promise -> wir müssen es awaiten
    const { id: rawId } = await context.params;
    const id = Number.parseInt(rawId, 10);

    if (!Number.isFinite(id) || id <= 0) {
      return jsonError('Invalid form id', 400, 'VALIDATION_ERROR');
    }

    const form = await prisma.form.findFirst({
      where: {
        id,
        // Nur aktive Forms öffentlich exponieren
        status: 'ACTIVE' as any,
      },
    });

    if (!form) {
      // Aktives Form existiert nicht -> 404 (kein Hinweis auf Status/Dasein)
      return jsonError('Form not found', 404, 'NOT_FOUND');
    }

    const fields = await prisma.formField.findMany({
      where: {
        formId: form.id,
        isActive: true,
      },
      orderBy: {
        order: 'asc',
      },
    });

    return NextResponse.json(
      {
        form,
        fields,
      },
      { status: 200 },
    );
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error in GET /api/forms/[id]', error);
    return jsonError('Internal server error', 500, 'INTERNAL_ERROR');
  }
}
