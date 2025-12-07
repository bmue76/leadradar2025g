import Link from 'next/link';

export const dynamic = 'force-dynamic';

type AdminEventDTO = {
  id: number;
  name: string;
  startDate: string | null;
  endDate: string | null;
  status: string;
  location?: string | null;
  description?: string | null;
  formsCount?: number; // optional – falls die API das liefert
};

async function fetchEvents(): Promise<AdminEventDTO[]> {
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

  const res = await fetch(`${baseUrl}/api/admin/events`, {
    method: 'GET',
    headers: {
      'x-user-id': '1', // Demo-Tenant, analog zu Forms/Leads
    },
    cache: 'no-store',
  });

  if (!res.ok) {
    throw new Error(`Failed to load events (${res.status})`);
  }

  const json = (await res.json()) as any;

  let events: AdminEventDTO[] = [];

  if (Array.isArray(json)) {
    events = json as AdminEventDTO[];
  } else if (json && Array.isArray(json.events)) {
    events = json.events as AdminEventDTO[];
  } else if (json && json.data && Array.isArray(json.data.events)) {
    events = json.data.events as AdminEventDTO[];
  }

  return events ?? [];
}

function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return '–';
  try {
    return new Intl.DateTimeFormat('de-CH', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date(dateString));
  } catch {
    return dateString ?? '–';
  }
}

export default async function EventsPage() {
  const events = await fetchEvents();
  const hasEvents = events.length > 0;

  return (
    <div className="p-6 space-y-6">
      <header className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Events</h1>
          <p className="text-sm text-slate-500">
            Übersicht über alle Messen / Events dieses Tenants.
          </p>
        </div>

        {/* Optionaler Button – Funktionalität (Create-Form) kommt in einem späteren Teilprojekt */}
        <button
          type="button"
          className="inline-flex items-center rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
        >
          + Event erstellen (TODO)
        </button>
      </header>

      <section className="rounded-lg border border-slate-200 bg-white p-6">
        {!hasEvents ? (
          <div className="flex flex-col items-start gap-3">
            <h2 className="text-sm font-semibold text-slate-800">
              Noch keine Events vorhanden
            </h2>
            <p className="text-sm text-slate-600">
              Es wurden noch keine Events für diesen Tenant angelegt. Über die
              Admin-API{' '}
              <code className="font-mono text-xs">/api/admin/events</code> (POST)
              kannst du Events erstellen. Später wird es hier auch einen
              UI-gestützten „Event erstellen“-Flow geben.
            </p>
            <p className="text-xs text-slate-500">
              Seed-Daten aus Teilprojekt 1.6 (z.&nbsp;B. „Demo-Messe 2026“)
              sollten hier erscheinen, sobald die Admin-API Events zurückliefert.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-800">
                Events-Liste
              </h2>
              <p className="text-xs text-slate-500">
                {events.length} Event{events.length !== 1 ? 's' : ''} gefunden
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Name
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Zeitraum
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Status
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Ort
                    </th>
                    <th className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Formulare
                    </th>
                    <th className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Aktionen
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {events.map((event) => {
                    const timeRange =
                      formatDate(event.startDate) +
                      ' – ' +
                      formatDate(event.endDate);

                    const formsLabel =
                      typeof event.formsCount === 'number'
                        ? `${event.formsCount} Formular${
                            event.formsCount === 1 ? '' : 'e'
                          }`
                        : '–';

                    const statusLabel = event.status ?? '–';

                    return (
                      <tr key={event.id}>
                        <td className="whitespace-nowrap px-3 py-2">
                          <div className="flex flex-col">
                            <span className="font-medium text-slate-900">
                              {event.name}
                            </span>
                            <span className="text-xs text-slate-500">
                              ID: {event.id}
                            </span>
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 text-slate-700">
                          {timeRange}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2">
                          <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-medium uppercase tracking-wide text-slate-700">
                            {statusLabel}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 text-slate-700">
                          {event.location ?? '–'}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 text-right text-slate-700">
                          {formsLabel}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 text-right">
                          <Link
                            href={`/admin/events/${event.id}`}
                            className="text-xs font-medium text-blue-600 hover:underline"
                          >
                            Details anzeigen
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
