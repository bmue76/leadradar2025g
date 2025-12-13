// backend/app/api/admin/forms/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuthContext, AuthError } from '@/lib/auth';
import type { Prisma } from '@prisma/client';
import { createFormRequestSchema } from '@/lib/validation/forms';
import type { ZodError } from 'zod';

export const dynamic = 'force-dynamic';

type ErrorCode =
  | 'UNAUTHORIZED'
  | 'VALIDATION_ERROR'
  | 'NOT_FOUND'
  | 'CONFLICT'
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

function slugify(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * GET /api/admin/forms
 *
 * Liste aller Forms des Tenants mit optionalen Filtern.
 *
 * Query-Parameter:
 * - status?: "DRAFT" | "ACTIVE" | "ARCHIVED"
 * - search?: string (aktuell via name, sobald vorhanden)
 * - page?: number (>=1, default 1)
 * - limit?: number (1–100, default 20)
 */
export async function GET(req: NextRequest) {
  try {
    const { tenant } = await requireAuthContext(req);

    const url = new URL(req.url);
    const searchParams = url.searchParams;

    const statusParam = searchParams.get('status');
    const search = searchParams.get('search') ?? undefined;
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

    const where: Prisma.FormWhereInput = {
      tenantId: tenant.id,
    };

    if (statusParam) {
      const allowedStatuses = ['DRAFT', 'ACTIVE', 'ARCHIVED'] as const;
      type StatusValue = (typeof allowedStatuses)[number];

      if (!allowedStatuses.includes(statusParam as StatusValue)) {
        return jsonError(
          'Invalid query parameters: status must be DRAFT, ACTIVE or ARCHIVED',
          400,
          'VALIDATION_ERROR',
        );
      }

      // Prisma-Enum, aber wir casten hier bewusst auf any, um TS-Noise zu vermeiden.
      (where as any).status = statusParam;
    }

    if (search) {
      // Suche über das Feld "name" im Form-Modell
      where.name = {
        contains: search,
        mode: 'insensitive',
      };
    }

    const skip = (page - 1) * limit;

    const [items, total] = await prisma.$transaction([
      prisma.form.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.form.count({ where }),
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

     
    console.error('Error in GET /api/admin/forms', error);
    return jsonError('Internal server error', 500, 'INTERNAL_ERROR');
  }
}

/**
 * POST /api/admin/forms
 *
 * CreateFormRequest:
 * {
 *   "title": "Kontaktformular Messe XY",   // wird intern als "name" gespeichert
 *   "slug": "optional",                    // optional, überschreibt auto-Generierung
 *   "status": "DRAFT" | "ACTIVE",          // optional, default "DRAFT"
 *   "description": "optional",             // optional
 *   "fields": [ { ... } ]                  // optional, aktuell noch ungenutzt
 * }
 *
 * Response: 201 Created
 * {
 *   "form": { ...Form }
 * }
 */
export async function POST(req: NextRequest) {
  try {
    const { tenant } = await requireAuthContext(req);

    const rawJson = await req.json().catch(() => null);

    if (!rawJson || typeof rawJson !== 'object') {
      return jsonError(
        'Invalid request body: expected JSON object',
        400,
        'VALIDATION_ERROR',
      );
    }

    const body = rawJson as {
      title?: unknown;
      slug?: unknown;
      status?: unknown;
      description?: unknown;
      fields?: unknown;
    };

    // Mapping des eingehenden Bodys (title/slug/status/...) auf das Zod-Schema (name/...)
    const mappedForValidation = {
      name: body.title,
      description: body.description,
      status: body.status,
      slug: body.slug,
      fields: body.fields,
    };

    const parseResult = createFormRequestSchema.safeParse(mappedForValidation);

    if (!parseResult.success) {
      const zodError = parseResult.error as ZodError;

      return jsonError(
        'Validation failed',
        400,
        'VALIDATION_ERROR',
        {
          issues: zodError.issues,
        },
      );
    }

    const { name, description, status, slug: providedSlug } = parseResult.data;

    const title = name.trim();
    const finalName = title;

    // Status-Handling: nur DRAFT oder ACTIVE erlaubt, default DRAFT
    const finalStatus: 'DRAFT' | 'ACTIVE' = (status ?? 'DRAFT');

    // Slug-Handling:
    // - Wenn explizit angegeben -> prüfen auf Kollision (409).
    // - Wenn nicht angegeben -> aus Titel generieren und bei Bedarf mit -1, -2 ... erweitern.
    let slug: string;

    if (providedSlug && providedSlug.trim().length > 0) {
      const candidate = providedSlug.trim();

      const existing = await prisma.form.findFirst({
        where: {
          tenantId: tenant.id,
          slug: candidate,
        },
        select: { id: true },
      });

      if (existing) {
        return jsonError('Slug already in use', 409, 'CONFLICT');
      }

      slug = candidate;
    } else {
      const base = slugify(title) || 'form';
      let candidate = base;
      let counter = 1;

      // Einfache Schleife, um einen freien Slug zu finden.
      // Begrenzung auf 50 Versuche, um Endlosschleifen zu vermeiden.
       
      while (true) {
        const existing = await prisma.form.findFirst({
          where: {
            tenantId: tenant.id,
            slug: candidate,
          },
          select: { id: true },
        });

        if (!existing) {
          slug = candidate;
          break;
        }

        counter += 1;
        if (counter > 50) {
          // Fallback – sehr unwahrscheinlich, aber wir brechen sauber ab.
          return jsonError(
            'Could not generate unique slug',
            500,
            'INTERNAL_ERROR',
          );
        }

        candidate = `${base}-${counter}`;
      }
    }

    const form = await prisma.form.create({
      data: {
        tenantId: tenant.id,
        name: finalName, // Pflichtfeld im Prisma-Modell
        description: description ?? null,
        status: finalStatus as any, // Prisma-Enum, aber String passt
        slug,
        // Version-Handling: default 1 in Prisma-Schema angenommen.
        // createdBy/updatedBy hängen von deinem Schema ab – Beispiel:
        // createdById: user.id,
        // updatedById: user.id,
      },
    });

    return NextResponse.json({ form }, { status: 201 });
  } catch (error) {
    if (error instanceof AuthError) {
      return jsonError('Authentication required', 401, 'UNAUTHORIZED');
    }

     
    console.error('Error in POST /api/admin/forms', error);
    return jsonError('Internal server error', 500, 'INTERNAL_ERROR');
  }
}
