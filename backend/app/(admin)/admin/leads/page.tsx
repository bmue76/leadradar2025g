// app/(admin)/admin/leads/page.tsx
import Link from "next/link";

type LeadListItemDTO = {
  id: string;
  createdAt: string;
  eventId: number | null;
  eventName: string | null;
  formId: number | null;
  formName: string | null;
  source: string | null;
  name: string | null;
  company: string | null;
  email: string | null;
  valuesPreview: string;
};

type LeadsResponseDTO = {
  items: LeadListItemDTO[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

type SimpleEventDTO = {
  id: number;
  name: string;
};

type SimpleFormDTO = {
  id: number;
  name: string;
};

type RawSearchParams = {
  [key: string]: string | string[] | undefined;
};

type Filters = {
  page: number;
  limit: number;
  eventId?: number;
  formId?: number;
  from?: string;
  to?: string;
};

// DEV-Stub – später durch echte Auth ersetzen
const DEV_USER_ID = "1";

// Basis-URL für interne API-Calls
// Nutzt NEXT_PUBLIC_BASE_URL, falls gesetzt, sonst lokal http://localhost:3000
const BASE_URL =
  process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

function getSingleParam(
  params: RawSearchParams,
  key: string
): string | undefined {
  const value = params[key];
  if (Array.isArray(value)) return value[0];
  return value ?? undefined;
}

function parseIntOrUndefined(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const n = parseInt(value, 10);
  return Number.isNaN(n) ? undefined : n;
}

function parseFilters(params: RawSearchParams): Filters {
  const page = parseInt(getSingleParam(params, "page") || "1", 10);
  const limit = parseInt(getSingleParam(params, "limit") || "25", 10);

  const eventId = parseIntOrUndefined(getSingleParam(params, "eventId"));
  const formId = parseIntOrUndefined(getSingleParam(params, "formId"));
  const from = getSingleParam(params, "from");
  const to = getSingleParam(params, "to");

  return {
    page: page > 0 ? page : 1,
    limit: limit > 0 ? Math.min(limit, 200) : 25,
    eventId,
    formId,
    from: from || undefined,
    to: to || undefined,
  };
}

function buildApiQuery(filters: Filters): string {
  const params = new URLSearchParams();
  params.set("page", String(filters.page));
  params.set("limit", String(filters.limit));
  if (filters.eventId) params.set("eventId", String(filters.eventId));
  if (filters.formId) params.set("formId", String(filters.formId));
  if (filters.from) params.set("from", filters.from);
  if (filters.to) params.set("to", filters.to);
  return params.toString();
}

function buildPageLink(page: number, filters: Filters): string {
  const params = new URLSearchParams();
  params.set("page", String(page));
  params.set("limit", String(filters.limit));
  if (filters.eventId) params.set("eventId", String(filters.eventId));
  if (filters.formId) params.set("formId", String(filters.formId));
  if (filters.from) params.set("from", filters.from);
  if (filters.to) params.set("to", filters.to);
  const query = params.toString();
  return query ? `/admin/leads?${query}` : "/admin/leads";
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return new Intl.DateTimeFormat("de-CH", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(d);
}

async function fetchLeads(filters: Filters): Promise<LeadsResponseDTO> {
  const query = buildApiQuery(filters);
  const url = `${BASE_URL}/api/admin/leads?${query}`;

  const res = await fetch(url, {
    method: "GET",
    headers: {
      "x-user-id": DEV_USER_ID,
    },
    cache: "no-store",
  });

  if (!res.ok) {
    console.error("Failed to fetch admin leads", res.status, await res.text());
    return {
      items: [],
      page: filters.page,
      limit: filters.limit,
      total: 0,
      totalPages: 1,
    };
  }

  const data = (await res.json()) as LeadsResponseDTO;
  return data;
}

async function fetchEvents(): Promise<SimpleEventDTO[]> {
  const url = `${BASE_URL}/api/admin/events`;

  const res = await fetch(url, {
    method: "GET",
    headers: {
      "x-user-id": DEV_USER_ID,
    },
    cache: "no-store",
  });

  if (!res.ok) {
    console.error("Failed to fetch events for filters", res.status);
    return [];
  }

  const data = await res.json();

  // robust gegen verschiedene Response-Shapes
  if (Array.isArray(data)) {
    return (data as any[]).map((e) => ({
      id: Number((e as any).id),
      name: String((e as any).name ?? (e as any).title ?? "Event"),
    }));
  }

  if (Array.isArray((data as any).items)) {
    return (data as any).items.map((e: any) => ({
      id: Number(e.id),
      name: String(e.name ?? e.title ?? "Event"),
    }));
  }

  return [];
}

async function fetchForms(): Promise<SimpleFormDTO[]> {
  const url = `${BASE_URL}/api/admin/forms`;

  const res = await fetch(url, {
    method: "GET",
    headers: {
      "x-user-id": DEV_USER_ID,
    },
    cache: "no-store",
  });

  if (!res.ok) {
    console.error("Failed to fetch forms for filters", res.status);
    return [];
  }

  const data = await res.json();

  if (Array.isArray(data)) {
    return (data as any[]).map((f) => ({
      id: Number((f as any).id),
      name: String((f as any).name ?? (f as any).title ?? "Formular"),
    }));
  }

  if (Array.isArray((data as any).items)) {
    return (data as any).items.map((f: any) => ({
      id: Number(f.id),
      name: String(f.name ?? f.title ?? "Formular"),
    }));
  }

  return [];
}

type PageProps = {
  searchParams: Promise<RawSearchParams>;
};

export default async function AdminLeadsPage(props: PageProps) {
  const searchParams = await props.searchParams;
  const filters = parseFilters(searchParams);

  const [leadData, events, forms] = await Promise.all([
    fetchLeads(filters),
    fetchEvents(),
    fetchForms(),
  ]);

  const { items, page, totalPages, total } = leadData;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Leads (gesamt)
          </h1>
          <p className="text-sm text-muted-foreground">
            Globale Übersicht aller erfassten Leads in deinem Tenant.
          </p>
        </div>
      </div>

      {/* Filter-Bereich */}
      <div className="rounded-lg border bg-card p-4 shadow-sm">
        <form className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="flex flex-col gap-3 md:flex-row md:items-end">
            {/* Event-Filter */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-muted-foreground">
                Event
              </label>
              <select
                name="eventId"
                defaultValue={filters.eventId ? String(filters.eventId) : ""}
                className="h-9 rounded-md border px-2 text-sm"
              >
                <option value="">Alle Events</option>
                {events.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Form-Filter */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-muted-foreground">
                Formular
              </label>
              <select
                name="formId"
                defaultValue={filters.formId ? String(filters.formId) : ""}
                className="h-9 rounded-md border px-2 text-sm"
              >
                <option value="">Alle Formulare</option>
                {forms.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Zeitraum (für später) */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-muted-foreground">
                Von
              </label>
              <input
                type="date"
                name="from"
                defaultValue={filters.from}
                className="h-9 rounded-md border px-2 text-sm"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-muted-foreground">
                Bis
              </label>
              <input
                type="date"
                name="to"
                defaultValue={filters.to}
                className="h-9 rounded-md border px-2 text-sm"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Limit mitschicken */}
            <input type="hidden" name="limit" value={filters.limit} />
            <button
              type="submit"
              className="inline-flex h-9 items-center rounded-md border bg-primary px-3 text-xs font-medium text-primary-foreground shadow-sm hover:opacity-90"
            >
              Filtern
            </button>
            {/* Optional: Reset */}
            <Link
              href="/admin/leads"
              className="inline-flex h-9 items-center rounded-md border px-3 text-xs font-medium hover:bg-muted"
            >
              Filter zurücksetzen
            </Link>
          </div>
        </form>
      </div>

      {/* Tabelle oder Empty-State */}
      <div className="rounded-lg border bg-card shadow-sm">
        {items.length === 0 ? (
          <div className="p-6 text-center text-sm text-muted-foreground">
            {total === 0
              ? "Noch keine Leads erfasst."
              : "Keine Leads für den aktuellen Filter gefunden."}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="border-b bg-muted/60 text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2">Datum</th>
                    <th className="px-3 py-2">Event</th>
                    <th className="px-3 py-2">Formular</th>
                    <th className="px-3 py-2">Name</th>
                    <th className="px-3 py-2">Firma</th>
                    <th className="px-3 py-2">E-Mail</th>
                    <th className="px-3 py-2">Quelle</th>
                    <th className="px-3 py-2">Values</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((lead) => (
                    <tr
                      key={lead.id}
                      className="border-b last:border-b-0 hover:bg-muted/40"
                    >
                      <td className="px-3 py-2 align-top whitespace-nowrap">
                        {formatDateTime(lead.createdAt)}
                      </td>
                      <td className="px-3 py-2 align-top">
                        {lead.eventId ? (
                          <Link
                            href={`/admin/events/${lead.eventId}`}
                            className="text-sm text-primary hover:underline"
                          >
                            {lead.eventName ?? `Event #${lead.eventId}`}
                          </Link>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            Kein Event
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2 align-top">
                        {lead.formId ? (
                          <Link
                            href={`/admin/forms/${lead.formId}`}
                            className="text-sm text-primary hover:underline"
                          >
                            {lead.formName ?? `Formular #${lead.formId}`}
                          </Link>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            Kein Formular
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2 align-top">
                        {lead.name || (
                          <span className="text-xs text-muted-foreground">
                            –
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2 align-top">
                        {lead.company || (
                          <span className="text-xs text-muted-foreground">
                            –
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2 align-top">
                        {lead.email || (
                          <span className="text-xs text-muted-foreground">
                            –
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2 align-top">
                        {lead.source || (
                          <span className="text-xs text-muted-foreground">
                            –
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2 align-top max-w-xs">
                        <span className="line-clamp-2 text-xs text-muted-foreground">
                          {lead.valuesPreview || "–"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex flex-col items-center justify-between gap-2 border-t px-4 py-3 text-xs text-muted-foreground sm:flex-row">
              <div>
                Seite {page} von {totalPages} – insgesamt {total} Leads
              </div>
              <div className="flex items-center gap-2">
                {page > 1 ? (
                  <Link
                    href={buildPageLink(page - 1, filters)}
                    className="inline-flex h-8 items-center rounded-md border px-2 hover:bg-muted"
                  >
                    Zurück
                  </Link>
                ) : (
                  <button
                    className="inline-flex h-8 cursor-not-allowed items-center rounded-md border px-2 opacity-50"
                    disabled
                  >
                    Zurück
                  </button>
                )}
                {page < totalPages ? (
                  <Link
                    href={buildPageLink(page + 1, filters)}
                    className="inline-flex h-8 items-center rounded-md border px-2 hover:bg-muted"
                  >
                    Weiter
                  </Link>
                ) : (
                  <button
                    className="inline-flex h-8 cursor-not-allowed items-center rounded-md border px-2 opacity-50"
                    disabled
                  >
                    Weiter
                  </button>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Hinweis zu Export (Block 3 – vorbereitend) */}
      <div className="text-xs text-muted-foreground">
        Exporte sind aktuell pro Formular und pro Event verfügbar (über die
        jeweiligen Detailseiten). Ein globaler CSV-Export kann später hier
        ergänzt werden.
      </div>
    </div>
  );
}
