// backend/app/api/admin/forms/[id]/leads/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuthContext, AuthError } from '@/lib/auth';

export const dynamic = 'force-dynamic';

type ErrorCode =
  | 'UNAUTHORIZED'
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
 * GET /api/admin/forms/[id]/leads
 *
 * Liefert eine paginierte Liste von Leads zu einem Formular
 * für den Tenant des authentifizierten Users.
 *
 * Query-Parameter:
 * - page?: number (>=1, default 1)
 * - limit?: number (1–100, default 20)
 *
 * Response 200 OK:
 * {
 *   "items": [ ...Lead[] ],
 *   "page": 1,
 *   "limit": 20,
 *   "total": 5
 * }
 */
export async function GET(req: NextRequest, context: any) {
  try {
    const { tenant } = await requireAuthContext(req);

    // Next 15: params ist ein Promise
    const { id: rawId } = await context.params;
    const formId = Number.parseInt(rawId, 10);

    if (!Number.isFinite(formId) || formId <= 0) {
      return jsonError('Invalid form id', 400, 'VALIDATION_ERROR');
    }

    const url = new URL(req.url);
    const searchParams = url.searchParams;

    const pageParam = searchParams.get('page') ?? '1';
    const limitParam = searchParams.get('limit') ?? '20';

    const page = Number.parseInt(pageParam, 10);
    const limit = Number.parseInt(limitParam, 10);

    if (!Number.isFinite(page) || page < 1) {
      return jsonError(
        'Invalid query parameters: page must be >= 1',
        400,
        'VALIDATION_ERROR',
      );
    }

    if (!Number.isFinite(limit) || limit < 1 || limit > 100) {
      return jsonError(
        'Invalid query parameters: limit must be between 1 and 100',
        400,
        'VALIDATION_ERROR',
      );
    }

    // Sicherstellen, dass das Form zum Tenant gehört
    const form = await prisma.form.findFirst({
      where: {
        id: formId,
        tenantId: tenant.id,
      },
      select: {
        id: true,
      },
    });

    if (!form) {
      return jsonError('Form not found', 404, 'NOT_FOUND');
    }

    const where = {
      formId: form.id,
      tenantId: tenant.id,
    };

    const skip = (page - 1) * limit;

    const [items, total] = await prisma.$transaction([
      prisma.lead.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.lead.count({ where }),
    ]);

    return NextResponse.json(
      {
        items,
        page,
        limit,
        total,
      },
      { status: 200 },
    );
  } catch (error) {
    if (error instanceof AuthError) {
      return jsonError('Authentication required', 401, 'UNAUTHORIZED');
    }

     
    console.error('Error in GET /api/admin/forms/[id]/leads', error);
    return jsonError('Internal server error', 500, 'INTERNAL_ERROR');
  }
}
