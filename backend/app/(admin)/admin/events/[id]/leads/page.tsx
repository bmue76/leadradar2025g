import Link from "next/link";
import { EventLeadsExportButton } from "./EventLeadsExportButton";

type LeadItem = {
  id: number;
  createdAt: string;
  source: string | null;
  formId: number | null;
  eventId: number | null;
  values: Record<string, unknown>;
};

type EventLeadsResponse = {
  items: LeadItem[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

type EventDetail = {
  id: number;
  name: string;
  slug: string;
  startDate?: string;
  endDate?: string | null;
  location?: string | null;
};

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams?: { [key: string]: string | string[] | undefined };
};

const baseUrl =
  process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";

function parseNumberParam(
  value: string | string[] | undefined,
  defaultValue: number
): number {
  if (!value) return defaultValue;
  const v = Array.isArray(value) ? value[0] : value;
  const parsed = parseInt(v, 10);
  return Number.isNaN(parsed) ? defaultValue : parsed;
}

function extractValue(
  values: Record<string, unknown>,
  keys: string[]
): string {
  for (const key of keys) {
    const raw = values[key];
    if (typeof raw === "string" && raw.trim().length > 0) {
      return raw;
    }
  }
  return "";
}

async function fetchEvent(eventId: string): Promise<EventDetail | null> {
  const res = await fetch(`${baseUrl}/api/admin/events/${eventId}`, {
    headers: {
      "x-user-id": "1",
    },
    cache: "no-store",
  });

  if (res.status === 404) {
    return null;
  }

  if (!res.ok) {
    throw new Error(
      `Failed to load event ${eventId}: ${res.status} ${res.statusText}`
    );
  }

  const data = (await res.json()) as EventDetail;
  return data;
}

async function fetchEventLeads(
  eventId: string,
  page: number,
  limit: number
): Promise<EventLeadsResponse> {
  const searchParams = new URLSearchParams();
  searchParams.set("page", page.toString());
  searchParams.set("limit", limit.toString());

  const res = await fetch(
    `${baseUrl}/api/admin/events/${eventId}/leads?${searchParams.toString()}`,
    {
      headers: {
        "x-user-id": "1",
      },
      cache: "no-store",
    }
  );

  if (!res.ok) {
    throw new Error(
      `Failed to load leads for event ${eventId}: ${res.status} ${res.statusText}`
    );
  }

  const data = (await res.json()) as EventLeadsResponse;
  return data;
}

export default async function AdminEventLeadsPage({
  params,
  searchParams,
}: PageProps) {
  const { id } = await params; // id aus der Route

  const page = Math.max(parseNumberParam(searchParams?.page, 1), 1);
  const limit = parseNumberParam(searchParams?.limit, 25);

  const [event, leadsData] = await Promise.all([
    fetchEvent(id),
    fetchEventLeads(id, page, limit),
  ]);

  if (!event) {
    return (
      <div className="p-6 space-y-4">
        <h1 className="text-2xl font-semibold">Event nicht gefunden</h1>
        <p className="text-sm text-gray-600">
          Das angeforderte Event existiert nicht oder du hast keine
          Berechtigung darauf zuzugreifen.
        </p>
        <Link
          href="/admin/events"
          className="inline-flex items-center rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium hover:bg-gray-50"
        >
          Zurück zur Eventliste
        </Link>
      </div>
    );
  }

  const { items, total, totalPages } = leadsData;

  const hasLeads = items.length > 0;

  const prevPage = page > 1 ? page - 1 : null;
  const nextPage = page < totalPages ? page + 1 : null;

  const buildPageHref = (targetPage: number) => {
    const sp = new URLSearchParams();
    sp.set("page", targetPage.toString());
    sp.set("limit", limit.toString());
    return `/admin/events/${id}/leads?${sp.toString()}`;
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">
            Leads für Event: {event.name}
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            Übersicht über alle Leads, die diesem Event zugeordnet sind.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            href={`/admin/events/${id}`}
            className="inline-flex items-center rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium hover:bg-gray-50"
          >
            Zurück zum Event
          </Link>

          <EventLeadsExportButton eventId={id} disabled={!hasLeads} />
        </div>
      </div>

      {/* Info-Zeile */}
      <div className="text-sm text-gray-600">
        {hasLeads ? (
          <>
            Seite {page} von {totalPages} – insgesamt {total} Lead
            {total === 1 ? "" : "s"}
          </>
        ) : (
          <>Aktuell sind keine Leads für dieses Event erfasst.</>
        )}
      </div>

      {/* Tabelle / Empty-State */}
      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
        {hasLeads ? (
          <table className="min-w-full text-left text-sm">
            <thead className="border-b bg-gray-50 text-xs font-semibold uppercase text-gray-500">
              <tr>
                <th className="px-4 py-2">ID</th>
                <th className="px-4 py-2">Datum/Zeit</th>
                <th className="px-4 py-2">Quelle</th>
                <th className="px-4 py-2">Name</th>
                <th className="px-4 py-2">E-Mail</th>
                <th className="px-4 py-2">Firma</th>
                <th className="px-4 py-2">Werte (Preview)</th>
              </tr>
            </thead>
            <tbody>
              {items.map((lead) => {
                const values = lead.values ?? {};
                const firstName = extractValue(values, [
                  "vorname",
                  "firstName",
                  "firstname",
                ]);
                const lastName = extractValue(values, [
                  "nachname",
                  "lastName",
                  "lastname",
                ]);
                const email = extractValue(values, [
                  "email",
                  "e-mail",
                  "eMail",
                ]);
                const company = extractValue(values, [
                  "firma",
                  "company",
                  "unternehmen",
                ]);

                const previewEntries = Object.entries(values)
                  .slice(0, 6)
                  .map(([key, val]) => `${key}=${String(val)}`)
                  .join(", ");

                const createdAt = new Date(
                  lead.createdAt
                ).toLocaleString("de-CH");

                return (
                  <tr
                    key={lead.id}
                    className="border-b last:border-b-0 hover:bg-gray-50"
                  >
                    <td className="whitespace-nowrap px-4 py-2 text-xs text-gray-500">
                      {lead.id}
                    </td>
                    <td className="whitespace-nowrap px-4 py-2 text-xs text-gray-700">
                      {createdAt}
                    </td>
                    <td className="whitespace-nowrap px-4 py-2 text-xs text-gray-700">
                      {lead.source ?? "–"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-2 text-xs text-gray-700">
                      {firstName || lastName ? (
                        <>
                          {firstName} {lastName}
                        </>
                      ) : (
                        "–"
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-2 text-xs text-gray-700">
                      {email || "–"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-2 text-xs text-gray-700">
                      {company || "–"}
                    </td>
                    <td className="px-4 py-2 text-xs text-gray-700">
                      {previewEntries || "–"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <div className="p-6 text-sm text-gray-600">
            Für dieses Event wurden bisher noch keine Leads erfasst.
            Sobald erste Leads eingehen, erscheinen sie hier in der
            Übersicht.
          </div>
        )}
      </div>

      {/* Pagination */}
      {hasLeads && totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-gray-600">
          <div>
            Seite {page} von {totalPages}
          </div>
          <div className="flex gap-2">
            <Link
              href={prevPage ? buildPageHref(prevPage) : "#"}
              aria-disabled={!prevPage}
              className={`inline-flex items-center rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium ${
                prevPage
                  ? "hover:bg-gray-50"
                  : "cursor-not-allowed text-gray-400"
              }`}
            >
              Zurück
            </Link>
            <Link
              href={nextPage ? buildPageHref(nextPage) : "#"}
              aria-disabled={!nextPage}
              className={`inline-flex items-center rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium ${
                nextPage
                  ? "hover:bg-gray-50"
                  : "cursor-not-allowed text-gray-400"
              }`}
            >
              Weiter
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
