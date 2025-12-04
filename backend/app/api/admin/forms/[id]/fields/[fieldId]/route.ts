// app/api/admin/forms/[id]/fields/[fieldId]/route.ts

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuthContext } from '@/lib/auth';

type RouteContext = {
  params: Promise<{
    id: string | string[];
    fieldId: string | string[];
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
 * Hilfsfunktion: ID robust aus den Route-Params extrahieren.
 */
function parseId(raw: string | string[] | undefined): number | null {
  const val = typeof raw === 'string' ? raw : raw?.[0];
  if (!val) return null;

  const parsed = Number.parseInt(val, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;

  return parsed;
}

/**
 * PATCH /api/admin/forms/:id/fields/:fieldId
 *
 * Teilweises Update eines Feldes:
 * - label, key, type, required, placeholder, helpText, isActive
 * - order (Reihenfolge, 1-basiert)
 */
export async function PATCH(req: NextRequest, context: RouteContext) {
  const { id, fieldId } = await context.params;
  const formId = parseId(id);
  const fieldIdNum = parseId(fieldId);

  if (!formId || !fieldIdNum) {
    return jsonError(400, 'BAD_REQUEST', 'Invalid form or field id');
  }

  const body = (await req.json().catch(() => null)) as
    | Record<string, unknown>
    | null;

  if (!body || typeof body !== 'object') {
    return jsonError(400, 'BAD_REQUEST', 'Invalid request body');
  }

  const {
    label,
    key,
    type,
    required,
    placeholder,
    helpText,
    isActive,
    order,
  } = body as {
    label?: unknown;
    key?: unknown;
    type?: unknown;
    required?: unknown;
    placeholder?: unknown;
    helpText?: unknown;
    isActive?: unknown;
    order?: unknown;
  };

  const updateData: Record<string, unknown> = {};
  let newOrder: number | undefined;

  if (typeof label === 'string' && label.trim() !== '') {
    updateData.label = label.trim();
  }

  if (typeof key === 'string' && key.trim() !== '') {
    updateData.key = key.trim();
  }

  if (typeof type === 'string' && type.trim() !== '') {
    updateData.type = type.trim() as any;
  }

  if (typeof required === 'boolean') {
    updateData.required = required;
  }

  if (typeof placeholder === 'string') {
    updateData.placeholder =
      placeholder.length > 0 ? placeholder : null;
  }

  if (typeof helpText === 'string') {
    updateData.helpText = helpText.length > 0 ? helpText : null;
  }

  if (typeof isActive === 'boolean') {
    updateData.isActive = isActive;
  }

  if ('order' in body) {
    if (
      typeof order === 'number' &&
      Number.isInteger(order) &&
      order > 0
    ) {
      newOrder = order;
    } else if (order !== undefined) {
      return jsonError(
        422,
        'VALIDATION_ERROR',
        'Field "order" must be a positive integer',
        { field: 'order' },
      );
    }
  }

  // Wenn weder Daten noch neue Reihenfolge gesetzt sind → nichts zu tun
  if (
    Object.keys(updateData).length === 0 &&
    typeof newOrder === 'undefined'
  ) {
    return jsonError(
      400,
      'BAD_REQUEST',
      'No valid fields to update in request body',
    );
  }

  // Auth + Tenant-Kontext
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

  // Feld im Formular/Tenant suchen
  const existingField = await prisma.formField.findFirst({
    where: {
      id: fieldIdNum,
      formId: form.id,
      tenantId: tenant.id,
    },
  });

  if (!existingField) {
    return jsonError(404, 'FIELD_NOT_FOUND', 'Field not found');
  }

  // Fall 1: keine neue order → normales Update
  if (typeof newOrder === 'undefined') {
    try {
      const updated = await prisma.formField.update({
        where: {
          id: existingField.id,
        },
        data: updateData,
      });

      return Response.json(updated, { status: 200 });
    } catch (err: any) {
      console.error(
        '[PATCH] /api/admin/forms/:id/fields/:fieldId error',
        err,
      );

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
        'Unexpected error while updating field',
      );
    }
  }

  // Fall 2: Reihenfolge ändern (ggf. Kombination mit anderen Updates)
  try {
    const updatedField = await prisma.$transaction(async (tx) => {
      const fields = await tx.formField.findMany({
        where: {
          formId: form.id,
          tenantId: tenant.id,
        },
        orderBy: [
          { order: 'asc' },
          { id: 'asc' },
        ],
      });

      const currentIndex = fields.findIndex(
        (f) => f.id === existingField.id,
      );
      if (currentIndex === -1) {
        throw new Error('Field not found in ordering list');
      }

      const movingField = fields[currentIndex];
      const remaining = fields.filter((f) => f.id !== movingField.id);

      const maxOrder = fields.length;
      let targetOrder = newOrder!;
      if (targetOrder > maxOrder) {
        targetOrder = maxOrder;
      }
      const targetIndex = targetOrder - 1;

      const reordered = [
        ...remaining.slice(0, targetIndex),
        movingField,
        ...remaining.slice(targetIndex),
      ];

      // Reihenfolge + eventuelles Update auf das bewegte Feld anwenden
      const updatePromises = reordered.map((field, index) => {
        const data: Record<string, unknown> = {
          order: index + 1,
        };

        if (field.id === movingField.id) {
          Object.assign(data, updateData);
        }

        return tx.formField.update({
          where: { id: field.id },
          data,
        });
      });

      await Promise.all(updatePromises);

      return tx.formField.findFirst({
        where: {
          id: movingField.id,
          formId: form.id,
          tenantId: tenant.id,
        },
      });
    });

    return Response.json(updatedField, { status: 200 });
  } catch (err: any) {
    console.error(
      '[PATCH-reorder] /api/admin/forms/:id/fields/:fieldId error',
      err,
    );

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
      'Unexpected error while reordering field',
    );
  }
}

/**
 * DELETE /api/admin/forms/:id/fields/:fieldId
 *
 * Feld endgültig löschen und Reihenfolge der übrigen Felder neu packen.
 */
export async function DELETE(req: NextRequest, context: RouteContext) {
  const { id, fieldId } = await context.params;
  const formId = parseId(id);
  const fieldIdNum = parseId(fieldId);

  if (!formId || !fieldIdNum) {
    return jsonError(400, 'BAD_REQUEST', 'Invalid form or field id');
  }

  const { tenant } = await requireAuthContext(req);

  // Formular und Feld prüfen
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

  const existingField = await prisma.formField.findFirst({
    where: {
      id: fieldIdNum,
      formId: form.id,
      tenantId: tenant.id,
    },
  });

  if (!existingField) {
    return jsonError(404, 'FIELD_NOT_FOUND', 'Field not found');
  }

  try {
    await prisma.$transaction(async (tx) => {
      // Feld löschen
      await tx.formField.delete({
        where: {
          id: existingField.id,
        },
      });

      // Übrige Felder neu packen (order: 1..n)
      const remaining = await tx.formField.findMany({
        where: {
          formId: form.id,
          tenantId: tenant.id,
        },
        orderBy: [
          { order: 'asc' },
          { id: 'asc' },
        ],
      });

      const reorderPromises = remaining.map((field, index) =>
        tx.formField.update({
          where: { id: field.id },
          data: {
            order: index + 1,
          },
        }),
      );

      await Promise.all(reorderPromises);
    });

    return new Response(null, { status: 204 });
  } catch (err) {
    console.error(
      '[DELETE] /api/admin/forms/:id/fields/:fieldId error',
      err,
    );
    return jsonError(
      500,
      'INTERNAL_SERVER_ERROR',
      'Unexpected error while deleting field',
    );
  }
}
