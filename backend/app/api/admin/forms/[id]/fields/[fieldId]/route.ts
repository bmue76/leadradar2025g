// backend/app/api/admin/forms/[id]/fields/[fieldId]/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { prisma } from '@/lib/prisma';
import { FormFieldDTO } from '@/lib/types/forms';
import {
  isChoiceFieldType,
  normalizeSelectFieldConfig,
  serializeSelectFieldConfig,
} from '@/lib/formFieldConfig';
import {
  selectFieldConfigSchema,
  updateFormFieldRequestSchema,
} from '@/lib/validation/forms';
import { requireAuthContext } from '@/lib/auth-context';

/**
 * Mapping eines Prisma-FormField auf das API-/UI-DTO.
 */
function toFormFieldDTO(field: any): FormFieldDTO {
  return {
    id: field.id,
    formId: field.formId,
    key: field.key,
    label: field.label,
    type: field.type,
    placeholder: field.placeholder,
    helpText: field.helpText,
    required: field.required,
    order: field.order,
    config: field.config ?? null,
    isActive: field.isActive,
  };
}

/**
 * Hilfsfunktion, um tenantId aus dem AuthContext robust zu lesen.
 * Unterstützt sowohl auth.tenantId als auch auth.tenant.id.
 */
async function getTenantIdFromRequest(req: NextRequest): Promise<number> {
  const auth = await requireAuthContext(req);
  const tenantId =
    (auth as any).tenantId ??
    (auth as any).tenant?.id ??
    (auth as any).tenantID;

  if (!tenantId || typeof tenantId !== 'number') {
    throw new Error('No tenantId found in auth context');
  }

  return tenantId;
}

/**
 * PATCH /api/admin/forms/[id]/fields/[fieldId]
 *
 * Aktualisiert ein einzelnes Feld eines Formulars, inkl. Feld-Config (z. B. Select-Optionen).
 */
export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string; fieldId: string }> },
) {
  try {
    const tenantId = await getTenantIdFromRequest(req);
    const { id, fieldId: fieldIdParam } = await context.params;

    const formId = Number(id);
    const fieldId = Number(fieldIdParam);

    if (Number.isNaN(formId) || Number.isNaN(fieldId)) {
      return NextResponse.json(
        { error: 'Invalid formId or fieldId' },
        { status: 400 },
      );
    }

    // Sicherstellen, dass das Feld zum Formular & Tenant gehört.
    const existingField = await prisma.formField.findFirst({
      where: {
        id: fieldId,
        formId,
        form: {
          tenantId,
        },
      },
    });

    if (!existingField) {
      return NextResponse.json({ error: 'Field not found' }, { status: 404 });
    }

    const body = await req.json();
    const parsed = updateFormFieldRequestSchema.parse(body);

    const updateData: Record<string, unknown> = {};

    if (typeof parsed.label === 'string') {
      updateData.label = parsed.label;
    }
    if ('placeholder' in parsed) {
      updateData.placeholder = parsed.placeholder ?? null;
    }
    if ('helpText' in parsed) {
      updateData.helpText = parsed.helpText ?? null;
    }
    if (typeof parsed.required === 'boolean') {
      updateData.required = parsed.required;
    }
    if (typeof parsed.isActive === 'boolean') {
      updateData.isActive = parsed.isActive;
    }
    if (typeof parsed.order === 'number') {
      updateData.order = parsed.order;
    }

    // Config-Behandlung:
    if ('config' in parsed) {
      const incomingConfig = parsed.config;

      if (isChoiceFieldType(existingField.type)) {
        // Für Choice-Typen (SELECT, MULTISELECT, RADIO) validieren wir die Options-Struktur
        // und normalisieren sie anschliessend für die Speicherung.
        if (incomingConfig === null) {
          // explizit config entfernen
          updateData.config = null;
        } else if (incomingConfig !== undefined) {
          const validatedConfig = selectFieldConfigSchema.parse(incomingConfig);
          const normalized = normalizeSelectFieldConfig(validatedConfig);
          updateData.config = serializeSelectFieldConfig(normalized);
        }
      } else {
        // Nicht-Choice-Feldtypen:
        // Optional können wir config einfach übernehmen oder bewusst auf null setzen.
        // Hier: wir übernehmen nur, wenn es ein generisches Objekt ist, ansonsten null.
        if (incomingConfig === null) {
          updateData.config = null;
        } else if (
          incomingConfig &&
          typeof incomingConfig === 'object' &&
          !Array.isArray(incomingConfig)
        ) {
          updateData.config = incomingConfig;
        } else if (incomingConfig !== undefined) {
          // Dinge wie Arrays/primitive Werte wollen wir nicht als config speichern
          updateData.config = null;
        }
      }
    }

    const updatedField = await prisma.formField.update({
      where: { id: existingField.id },
      data: updateData,
    });

    const dto = toFormFieldDTO(updatedField);

    return NextResponse.json(dto, { status: 200 });
  } catch (err) {
    console.error('Failed to update form field', err);

    if (err instanceof ZodError) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: err.issues,
        },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/admin/forms/[id]/fields/[fieldId]
 *
 * Entfernt ein einzelnes Feld aus einem Formular.
 */
export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string; fieldId: string }> },
) {
  try {
    const tenantId = await getTenantIdFromRequest(req);
    const { id, fieldId: fieldIdParam } = await context.params;

    const formId = Number(id);
    const fieldId = Number(fieldIdParam);

    if (Number.isNaN(formId) || Number.isNaN(fieldId)) {
      return NextResponse.json(
        { error: 'Invalid formId or fieldId' },
        { status: 400 },
      );
    }

    const existingField = await prisma.formField.findFirst({
      where: {
        id: fieldId,
        formId,
        form: {
          tenantId,
        },
      },
    });

    if (!existingField) {
      return NextResponse.json({ error: 'Field not found' }, { status: 404 });
    }

    await prisma.formField.delete({
      where: { id: existingField.id },
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err) {
    console.error('Failed to delete form field', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
