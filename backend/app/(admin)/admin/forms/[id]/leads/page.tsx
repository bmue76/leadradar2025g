// app/(admin)/admin/forms/[id]/leads/page.tsx

import Link from 'next/link';
import type { FormDTO, LeadDTO } from '@/lib/types/forms';
import LeadsCsvExportButton from './LeadsCsvExportButton';

interface GetAdminFormLeadsResponse {
  items: LeadDTO[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface FormLeadsPageProps {
  params: Promise<{ id: string }>;
  searchParams?: {
    page?: string;
    limit?: string;
  };
}

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 25;

function getBaseUrl() {
  return process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
}

async function fetchForm(id: number): Promise<FormDTO | null> {
  const baseUrl = getBaseUrl();

  const res = await fetch(`${baseUrl}/api/admin/forms/${id}`, {
    headers: {
      'x-user-id': '1',
    },
    cache: 'no-store',
  });

  if (res.status === 404 || res.status === 403) {
    return null;
  }

  if (!res.ok) {
    throw new Error(`Fehler beim Laden des Formulars ${id}`);
  }

  const data = (await res.json()) as FormDTO;
  return data;
}

async function fetchFormLeads(
  id: number,
  page: number,
  limit: number,
): Promise<GetAdminFormLeadsResponse> {
  const baseUrl = getBaseUrl();

  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });

  const res = await fetch(`${baseUrl}/api/admin/forms/${id}/leads?${params.toString()}`, {
    headers: {
      'x-user-id': '1',
    },
    cache: 'no-store',
  });

  if (!res.ok) {
    throw new Error(`Fehler beim Laden der Leads für Formular ${id}`);
  }

  const data = (await res.json()) as GetAdminFormLeadsResponse;
  return data;
}

function formatDateTime(iso: string) {
  if (!iso) return '-';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString('de-CH', {
    dateStyle: 'short',
    timeStyle: 'short',
  });
}

function getStringValue(values: Record<string, unknown> | null | undefined, key: string) {
  if (!values) return '';
  const raw = values[key];
  if (raw === null || raw === undefined) return '';
  if (typeof raw === 'string' || typeof raw === 'number' || typeof raw === 'boolean') {
    return String(raw);
  }
  try {
    return JSON.stringify(raw);
  } catch {
    return '';
  }
}

function buildValuesPreview(values: Record<string, unknown> | null | undefined) {
  if (!values) return '';
  const entries = Object.entries(values);
  if (entries.length === 0) return '';
  return entries
    .slice(0, 5)
    .map(([key, value]) => {
      if (value === null || value === undefined) return `${key}=`;
      if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
        return `${key}=${value}`;
      }
      try {
        return `${key}=${JSON.stringify(value)}`;
      } catch {
        return `${key}=[Objekt]`;
      }
    })
    .join('; ');
}

export default async function FormLeadsPage(props: FormLeadsPageProps) {
  const { params, searchParams } = props;
  const { id: idParam } = await params;
  const id = Number(idParam);

  if (!Number.isInteger(id) || id <= 0) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-semibold mb-4">Ungültige Formular-ID</h1>
        <p className="mb-4">
          Die angeforderte Formular-ID ist ungültig. Bitte wähle ein Formular aus der Übersicht.
        </p>
        <Link href="/admin/forms" className="text-blue-600 underline">
          Zur Formularübersicht
        </Link>
      </div>
    );
  }

  const pageParam = searchParams?.page ? Number(searchParams.page) : DEFAULT_PAGE;
  const limitParam = searchParams?.limit ? Number(searchParams.limit) : DEFAULT_LIMIT;

  const page =
    Number.isFinite(pageParam) && pageParam > 0 ? pageParam : DEFAULT_PAGE;
  const limit =
    Number.isFinite(limitParam) && limitParam > 0 ? limitParam : DEFAULT_LIMIT;

  const [form, leadsResponse] = await Promise.all([
    fetchForm(id),
    fetchFormLeads(id, page, limit),
  ]);

  if (!form) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-semibold mb-4">Formular nicht gefunden</h1>
        <p className="mb-4">
          Das angeforderte Formular existiert nicht oder du hast keine Berechtigung,
          es zu sehen.
        </p>
        <Link href="/admin/forms" className="text-blue-600 underline">
          Zur Formularübersicht
        </Link>
      </div>
    );
  }

  const { items, total, totalPages, limit: responseLimit } = leadsResponse;
  const effectiveLimit = responseLimit || limit;
  const safeTotalPages = totalPages && totalPages > 0 ? totalPages : 1;

  const hasPrev = page > 1;
  const hasNext = page < safeTotalPages;

  const baseLeadsPath = `/admin/forms/${form.id}/leads`;

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">
            Leads für Formular:{' '}
            <span className="font-normal">{form.name}</span>
          </h1>
          <p className="text-sm text-gray-600">
            Formular-ID {form.id} · {total} Lead{total === 1 ? '' : 's'} insgesamt · Seite {page}{' '}
            von {safeTotalPages}
          </p>
        </div>

        <div className="flex gap-3">
          <Link
            href={`/admin/forms/${form.id}`}
            className="text-sm text-blue-600 underline"
          >
            Zurück zum Formular
          </Link>
        </div>
      </div>

      <div className="border rounded-lg p-4 bg-white space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Erfasste Leads</h2>
            <p className="text-xs text-gray-500">
              Anzeige von bis zu {effectiveLimit} Leads pro Seite.
            </p>
          </div>
          <LeadsCsvExportButton formId={form.id} leads={items} />
        </div>

        {items.length === 0 ? (
          <p className="text-sm text-gray-600">
            Für dieses Formular wurden bisher noch keine Leads erfasst.
          </p>
        ) : (
          <div className="overflow-auto">
            <table className="min-w-full text-sm border-collapse">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="px-3 py-2 text-left font-semibold text-xs text-gray-700">
                    ID
                  </th>
                  <th className="px-3 py-2 text-left font-semibold text-xs text-gray-700">
                    Datum / Zeit
                  </th>
                  <th className="px-3 py-2 text-left font-semibold text-xs text-gray-700">
                    Quelle
                  </th>
                  <th className="px-3 py-2 text-left font-semibold text-xs text-gray-700">
                    Name
                  </th>
                  <th className="px-3 py-2 text-left font-semibold text-xs text-gray-700">
                    E-Mail
                  </th>
                  <th className="px-3 py-2 text-left font-semibold text-xs text-gray-700">
                    Firma
                  </th>
                  <th className="px-3 py-2 text-left font-semibold text-xs text-gray-700">
                    Werte (Preview)
                  </th>
                </tr>
              </thead>
              <tbody>
                {items.map((lead) => {
                  const values = (lead.values ?? {}) as Record<string, unknown>;
                  const firstName =
                    getStringValue(values, 'firstName') ||
                    getStringValue(values, 'vorname');
                  const lastName =
                    getStringValue(values, 'lastName') ||
                    getStringValue(values, 'nachname');
                  const email = getStringValue(values, 'email');
                  const company =
                    getStringValue(values, 'company') ||
                    getStringValue(values, 'firma');

                  const name =
                    [firstName, lastName].filter(Boolean).join(' ') ||
                    getStringValue(values, 'name');

                  const preview = buildValuesPreview(values);

                  return (
                    <tr key={lead.id} className="border-b last:border-b-0">
                      <td className="px-3 py-2 align-top text-xs text-gray-800">
                        {lead.id}
                      </td>
                      <td className="px-3 py-2 align-top text-xs text-gray-800 whitespace-nowrap">
                        {formatDateTime(lead.createdAt)}
                      </td>
                      <td className="px-3 py-2 align-top text-xs text-gray-800">
                        {lead.source || '-'}
                      </td>
                      <td className="px-3 py-2 align-top text-xs text-gray-800">
                        {name || <span className="text-gray-400">–</span>}
                      </td>
                      <td className="px-3 py-2 align-top text-xs text-gray-800">
                        {email || <span className="text-gray-400">–</span>}
                      </td>
                      <td className="px-3 py-2 align-top text-xs text-gray-800">
                        {company || <span className="text-gray-400">–</span>}
                      </td>
                      <td className="px-3 py-2 align-top text-xs text-gray-800">
                        {preview || <span className="text-gray-400">–</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {items.length > 0 && (
          <div className="mt-3 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-xs text-gray-600">
              <span>
                Seite {page} von {safeTotalPages}
              </span>
              <span className="hidden sm:inline">
                · Insgesamt {total} Lead{total === 1 ? '' : 's'}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Link
                href={{
                  pathname: baseLeadsPath,
                  query: {
                    page: page > 1 ? page - 1 : page,
                    limit: effectiveLimit,
                  },
                }}
                className={`px-3 py-1 rounded border text-xs ${
                  page > 1
                    ? 'bg-white text-gray-800 hover:bg-gray-50'
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                }`}
                aria-disabled={page <= 1}
              >
                Zurück
              </Link>
              <Link
                href={{
                  pathname: baseLeadsPath,
                  query: {
                    page: hasNext ? page + 1 : page,
                    limit: effectiveLimit,
                  },
                }}
                className={`px-3 py-1 rounded border text-xs ${
                  hasNext
                    ? 'bg-white text-gray-800 hover:bg-gray-50'
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                }`}
                aria-disabled={!hasNext}
              >
                Weiter
              </Link>
            </div>
          </div>
        )}

        {items.length > 0 && (
          <p className="mt-2 text-xs text-gray-500">
            Hinweis: Der CSV-Export umfasst die aktuell angezeigten Leads (inkl. aller Value-Felder).
          </p>
        )}
      </div>
    </div>
  );
}
