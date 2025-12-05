import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import FormBuilderWorkspace from './FormBuilderWorkspace';
import type { FormDTO, FormFieldDTO } from '@/lib/types/forms';
import { prisma } from '@/lib/prisma';

export const metadata: Metadata = {
  title: 'LeadRadar – Formular-Builder',
};

interface FormDetailResponse {
  form: FormDTO | null;
  fields: FormFieldDTO[];
}

/**
 * Form + Felder direkt via Prisma laden.
 * (Die eigentliche Auth-/Tenant-Prüfung bleibt in den API-Routen.)
 */
async function getAdminFormDetail(formId: string): Promise<FormDetailResponse> {
  const idNum = Number(formId);
  if (!Number.isFinite(idNum)) {
    notFound();
  }

  const form = await prisma.form.findUnique({
    where: {
      id: idNum,
    },
    include: {
      fields: {
        orderBy: [
          { order: 'asc' }, // primär nach order
          { id: 'asc' }, // Fallback, falls order gleich/null
        ],
      },
    },
  });

  if (!form) {
    return { form: null, fields: [] };
  }

  const { fields, ...formData } = form;

  return {
    form: formData as unknown as FormDTO,
    fields: fields as unknown as FormFieldDTO[],
  };
}

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function AdminFormBuilderPage({ params }: PageProps) {
  // Next.js 15/16: params ist ein Promise und muss zuerst aufgelöst werden
  const { id } = await params;

  if (!id) {
    notFound();
  }

  const { form, fields } = await getAdminFormDetail(id);

  if (!form) {
    notFound();
  }

  return (
    <div className="space-y-6">
      {/* Zentraler Formbuilder-Workspace:
          - Header mit Meta
          - Feldliste links (mit Drag & Drop)
          - Vorschau & Properties rechts
      */}
      <FormBuilderWorkspace form={form} fields={fields} />
    </div>
  );
}
