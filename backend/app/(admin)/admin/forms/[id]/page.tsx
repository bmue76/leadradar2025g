// app/(admin)/admin/forms/[id]/page.tsx

import Link from 'next/link';
import { notFound } from 'next/navigation';
import { FormFieldsTable, type FormField } from './FormFieldsTable';

type FormDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
};

type FormDto = {
  id: number;
  tenantId: number;
  name: string;
  description: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
};

const BASE_URL =
  process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

async function fetchForm(id: number): Promise<FormDto | null> {
  const res = await fetch(`${BASE_URL}/api/admin/forms/${id}`, {
    headers: {
      'x-user-id': '1',
    },
    cache: 'no-store',
  });

  if (res.status === 404) {
    return null;
  }

  if (!res.ok) {
    console.error(
      'Fehler beim Laden des Formulars',
      res.status,
      await res.text(),
    );
    throw new Error('Fehler beim Laden des Formulars');
  }

  return (await res.json()) as FormDto;
}

async function fetchFormFields(id: number): Promise<FormField[]> {
  const res = await fetch(`${BASE_URL}/api/admin/forms/${id}/fields`, {
    headers: {
      'x-user-id': '1',
    },
    cache: 'no-store',
  });

  if (res.status === 404) {
    // Formular nicht gefunden → leere Liste, tatsächliche Behandlung oben
    return [];
  }

  if (!res.ok) {
    console.error(
      'Fehler beim Laden der Formularfelder',
      res.status,
      await res.text(),
    );
    throw new Error('Fehler beim Laden der Formularfelder');
  }

  return (await res.json()) as FormField[];
}

function formatStatus(status: string) {
  switch (status) {
    case 'DRAFT':
      return 'Entwurf';
    case 'ACTIVE':
      return 'Aktiv';
    case 'ARCHIVED':
      return 'Archiviert';
    default:
      return status;
  }
}

export default async function FormDetailPage({
  params,
}: FormDetailPageProps) {
  const { id: rawId } = await params;
  const id = Number(rawId);

  if (!Number.isInteger(id) || id <= 0) {
    notFound();
  }

  const [form, fields] = await Promise.all([
    fetchForm(id),
    fetchFormFields(id),
  ]);

  if (!form) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">
            Formular: {form.name}
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            ID {form.id} · Status:{' '}
            <span className="font-medium">{formatStatus(form.status)}</span>
          </p>
          {form.description && (
            <p className="mt-1 text-sm text-gray-500">{form.description}</p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`/admin/forms`}
            className="rounded border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
          >
            ← Zurück zur Formularübersicht
          </Link>
          <Link
            href={`/admin/leads?formId=${form.id}`}
            className="rounded bg-gray-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-800"
          >
            Leads anzeigen
          </Link>
        </div>
      </div>

      <section className="space-y-3">
        <FormFieldsTable formId={form.id} fields={fields} />
      </section>
    </div>
  );
}
