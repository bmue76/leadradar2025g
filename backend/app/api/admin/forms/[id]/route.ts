// backend/app/api/admin/forms/[id]/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuthContext, AuthError } from '@/lib/auth';
import type { Prisma } from '@prisma/client';
import { formConfigSchema } from '@/lib/validation/forms';

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

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value)
  );
}

/**
 * GET /api/admin/forms/[id]
 *
 * Liefert ein einzelnes Form inkl. Feldern für den Tenant des Users.
 *
 * Response:
 * {
 *   "form": { ...Form },
 *   "fields": [ ...FormField[] ]
 * }
 */
export async function GET(req: NextRequest, context: any) {
  try {
    const { tenant } = await requireAuthContext(req);

    // In Next 15 ist context.params ein Promise -> wir müssen es awaiten
    const { id: rawId } = await context.params;
    const id = Number.parseInt(rawId, 10);

    if (!Number.isFinite(id) || id <= 0) {
      return jsonError('Invalid form id', 400, 'VALIDATION_ERROR');
    }

    const form = await prisma.form.findFirst({
      where: {
        id,
        tenantId: tenant.id,
      },
    });

    if (!form) {
      return jsonError('Form not found', 404, 'NOT_FOUND');
    }

    const fields = await prisma.formField.findMany({
      where: {
        formId: form.id,
      },
      orderBy: {
        id: 'asc',
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
    if (error instanceof AuthError) {
      return jsonError('Authentication required', 401, 'UNAUTHORIZED');
    }

    // eslint-disable-next-line no-console
    console.error('Error in GET /api/admin/forms/[id]', error);
    return jsonError('Internal server error', 500, 'INTERNAL_ERROR');
  }
}

/**
 * PATCH /api/admin/forms/[id]
 *
 * UpdateFormRequest (Teil-Update, alle Felder optional):
 * {
 *   "title": "Neuer Name",          // -> Form.name
 *   "description": "Beschreibung",  // -> Form.description
 *   "status": "DRAFT" | "ACTIVE" | "ARCHIVED",
 *   "slug": "neuer-slug",
 *   "config": { ... }              // -> Form.config (Teilprojekt 2.17)
 * }
 *
 * Mindestens ein gültiges Feld muss enthalten sein.
 *
 * Response: 200 OK
 * {
 *   "form": { ...Form }
 * }
 */
export async function PATCH(req: NextRequest, context: any) {
  try {
    const { tenant } = await requireAuthContext(req);

    // context.params ist ein Promise -> await
    const { id: rawId } = await context.params;
    const id = Number.parseInt(rawId, 10);

    if (!Number.isFinite(id) || id <= 0) {
      return jsonError('Invalid form id', 400, 'VALIDATION_ERROR');
    }

    const existingForm = await prisma.form.findFirst({
      where: {
        id,
        tenantId: tenant.id,
      },
    });

    if (!existingForm) {
      return jsonError('Form not found', 404, 'NOT_FOUND');
    }

    const body = (await req.json().catch(() => null)) as
      | {
          title?: unknown;
          description?: unknown;
          status?: unknown;
          slug?: unknown;
          config?: unknown;
        }
      | null;

    if (!body || typeof body !== 'object') {
      return jsonError(
        'Invalid request body: expected JSON object',
        400,
        'VALIDATION_ERROR',
      );
    }

    const rawTitle = body.title;
    const rawDescription = body.description;
    const rawStatus = body.status;
    const rawSlug = body.slug;

    const data: Prisma.FormUpdateInput = {};
    let hasChanges = false;

    // title -> name
    if (typeof rawTitle === 'string') {
      const trimmed = rawTitle.trim();
      if (trimmed.length === 0) {
        return jsonError(
          'Title, if provided, must not be empty',
          400,
          'VALIDATION_ERROR',
        );
      }
      data.name = trimmed;
      hasChanges = true;
    }

    // description
    if (typeof rawDescription === 'string') {
      const trimmed = rawDescription.trim();
      data.description = trimmed.length > 0 ? trimmed : null;
      hasChanges = true;
    }

    // status
    if (typeof rawStatus !== 'undefined') {
      if (typeof rawStatus !== 'string') {
        return jsonError(
          'Status, if provided, must be a string',
          400,
          'VALIDATION_ERROR',
        );
      }

      const allowed = ['DRAFT', 'ACTIVE', 'ARCHIVED'] as const;
      type Allowed = (typeof allowed)[number];

      if (!allowed.includes(rawStatus as Allowed)) {
        return jsonError(
          'Invalid status: must be DRAFT, ACTIVE or ARCHIVED',
          400,
          'VALIDATION_ERROR',
        );
      }

      (data as any).status = rawStatus;
      hasChanges = true;
    }

    // slug
    if (typeof rawSlug === 'string') {
      const trimmed = rawSlug.trim();
      if (trimmed.length === 0) {
        return jsonError(
          'Slug, if provided, must not be empty',
          400,
          'VALIDATION_ERROR',
        );
      }

      // Nur prüfen, wenn sich der Slug wirklich ändert
      if (trimmed !== existingForm.slug) {
        const conflict = await prisma.form.findFirst({
          where: {
            tenantId: tenant.id,
            slug: trimmed,
            NOT: { id: existingForm.id },
          },
          select: { id: true },
        });

        if (conflict) {
          return jsonError('Slug already in use', 409, 'CONFLICT');
        }
      }

      data.slug = trimmed;
      hasChanges = true;
    }

    // config (Teilprojekt 2.17)
    if (Object.prototype.hasOwnProperty.call(body, 'config')) {
      const rawConfig = body.config;

      if (rawConfig === null) {
        // kompletter Reset
        (data as any).config = null;
        hasChanges = true;
      } else if (isPlainObject(rawConfig)) {
        const parsed = formConfigSchema.safeParse(rawConfig);

        if (!parsed.success) {
          return jsonError(
            'Invalid config',
            400,
            'VALIDATION_ERROR',
            parsed.error.format(),
          );
        }

        const existingConfig = (existingForm as any).config;
        const base =
          isPlainObject(existingConfig) ? (existingConfig as Record<string, unknown>) : {};

        const incoming = parsed.data as Record<string, unknown>;

        // shallow merge
        const merged: Record<string, unknown> = { ...base, ...incoming };

        // deep-ish merge für contactSlots, damit partielle Updates möglich sind
        if (Object.prototype.hasOwnProperty.call(incoming, 'contactSlots')) {
          const incomingSlots = (incoming as any).contactSlots;

          if (incomingSlots === null) {
            delete (merged as any).contactSlots;
          } else if (isPlainObject(incomingSlots)) {
            const prevSlots =
              isPlainObject((base as any).contactSlots) ? (base as any).contactSlots : {};
            (merged as any).contactSlots = { ...prevSlots, ...incomingSlots };
          } else if (typeof incomingSlots === 'undefined') {
            // nichts
          } else {
            return jsonError(
              'Invalid config.contactSlots',
              400,
              'VALIDATION_ERROR',
            );
          }
        }

        (data as any).config = merged;
        hasChanges = true;
      } else {
        return jsonError(
          'Config, if provided, must be an object or null',
          400,
          'VALIDATION_ERROR',
        );
      }
    }

    if (!hasChanges) {
      return jsonError(
        'No valid fields to update',
        400,
        'VALIDATION_ERROR',
      );
    }

    const updatedForm = await prisma.form.update({
      where: { id: existingForm.id },
      data,
    });

    return NextResponse.json({ form: updatedForm }, { status: 200 });
  } catch (error) {
    if (error instanceof AuthError) {
      return jsonError('Authentication required', 401, 'UNAUTHORIZED');
    }

    // eslint-disable-next-line no-console
    console.error('Error in PATCH /api/admin/forms/[id]', error);
    return jsonError('Internal server error', 500, 'INTERNAL_ERROR');
  }
}
