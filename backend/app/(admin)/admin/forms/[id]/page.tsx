// app/(admin)/admin/forms/[id]/page.tsx

import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Form, FormField } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import FormBuilderWorkspace from './FormBuilderWorkspace';
import { FormFieldsTable } from './FormFieldsTable';

type FormWithFields = Form & { fields: FormField[] };

// Hinweis: In Next 15/16 ist params ein Promise -> wir behandeln es entsprechend
interface FormDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

async function getFormWithFields(formId: number): Promise<FormWithFields | null> {
  // Annahme: Relation "fields" existiert im Prisma-Schema
  return prisma.form.findUnique({
    where: { id: formId },
    include: {
      fields: {
        orderBy: {
          order: 'asc',
        },
      },
    },
  }) as Promise<FormWithFields | null>;
}

export default async function FormDetailPage({ params }: FormDetailPageProps) {
  // params ist ein Promise -> erst entpacken
  const resolvedParams = await params;
  const formId = Number(resolvedParams.id);

  if (!formId || Number.isNaN(formId)) {
    notFound();
  }

  const form = await getFormWithFields(formId);

  if (!form) {
    notFound();
  }

  const fields = form.fields ?? [];

  const builderFields = fields.map((f) => ({
    id: f.id,
    key: f.key,
    label: f.label,
    type: String(f.type),
    required: f.required,
    placeholder: f.placeholder,
    helpText: f.helpText,
  }));

  return (
    <div className="space-y-10">
      {/* Header: Form-Metadaten + Navigation */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            Formbuilder-Workspace
          </p>
          <h1 className="text-2xl font-semibold tracking-tight">
            {form.name}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Diese Seite ist der zentrale Workspace für dieses Formular:
            oben Meta-Infos, in der Mitte der Formbuilder (Feldliste +
            Vorschau) und darunter die technische Feldtabelle.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/admin/forms"
            className="inline-flex items-center rounded-md border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted"
          >
            Zur Formularliste
          </Link>
          <Link
            href={`/admin/forms/${form.id}/leads`}
            className="inline-flex items-center rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90"
          >
            Leads anzeigen
          </Link>
        </div>
      </header>

      {/* Kompakte Meta-Infos */}
      <section className="rounded-md border bg-card p-4 text-sm text-muted-foreground">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <span className="font-medium text-foreground">Formular-ID:</span>{' '}
            {form.id}
          </div>
          <div>
            <span className="font-medium text-foreground">Status:</span>{' '}
            <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs font-medium capitalize">
              {String((form as any).status ?? 'draft')}
            </span>
          </div>
        </div>
        {form.description && (
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
            {form.description}
          </p>
        )}
      </section>

      {/* Zentraler Bereich: Formbuilder-Workspace */}
      <section className="space-y-4">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-lg font-semibold">Visueller Formbuilder</h2>
          <span className="max-w-xl text-xs text-muted-foreground">
            Fokusbereich: Links siehst du alle Felder dieses Formulars,
            rechts eine einfache Vorschau. Die Feldverwaltung (Anlegen,
            Löschen, Reihenfolge) läuft in 2.6 noch über die Tabelle unten
            und wird in kommenden Teilprojekten schrittweise in den Builder
            verlegt.
          </span>
        </div>

        <FormBuilderWorkspace formName={form.name} fields={builderFields} />
      </section>

      {/* Legacy-/Detailbereich: Technische Feldtabelle */}
      <section className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-semibold">
              Technische Feldtabelle (Legacy)
            </h2>
            <p className="max-w-xl text-xs text-muted-foreground">
              Diese Tabelle bleibt in 2.6 vollständig zuständig für CRUD &
              Reihenfolge der Felder. Änderungen wirken sich direkt auf den
              Formbuilder oben aus.
            </p>
          </div>
        </div>

        {/* TypeScript-Typkonflikt (Date vs. string) bewusst einkapseln */}
        <FormFieldsTable formId={form.id} fields={fields as any} />
      </section>
    </div>
  );
}
