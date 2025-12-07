import Link from 'next/link';
import EventEditForm from './EventEditForm';

export const dynamic = 'force-dynamic';

interface EventDetailPageProps {
  params: Promise<{ id: string }>;
}

type AdminEventDTO = {
  id: number;
  name: string;
  startDate: string | null;
  endDate: string | null;
  status: string;
  location?: string | null;
  description?: string | null;
};

type EventFormDTO = {
  eventId: number;
  formId: number;
  primary: boolean;
  form?: {
    id: number;
    name: string;
  } | null;
};

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

async function fetchEvent(eventId: string): Promise<AdminEventDTO | null> {
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

  const res = await fetch(`${baseUrl}/api/admin/events`, {
    method: 'GET',
    headers: {
      'x-user-id': '1',
    },
    cache: 'no-store',
  });

  if (!res.ok) {
    throw new Error(`Failed to load events for detail view (${res.status})`);
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

  const idNum = Number(eventId);
  if (Number.isNaN(idNum)) return null;

  return events.find((e) => e.id === idNum) ?? null;
}

async function fetchEventForms(eventId: string): Promise<EventFormDTO[]> {
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

  try {
    const res = await fetch(`${baseUrl}/api/admin/events/${eventId}/forms`, {
      method: 'GET',
      headers: {
        'x-user-id': '1',
      },
      cache: 'no-store',
    });

    if (res.status === 404 || res.status === 400) {
      // Keine Zuordnung oder Route (noch) nicht sauber migriert → UI zeigt einfach "keine Formulare"
      return [];
    }

    if (!res.ok) {
      console.error(
        `Failed to load event forms for event ${eventId} (${res.status})`,
      );
      return [];
    }

    const data = (await res.json()) as EventFormDTO[] | null;
    return data ?? [];
  } catch (error) {
    console.error('Error fetching event forms for event', eventId, error);
    return [];
  }
}

export default async function EventDetailPage(props: EventDetailPageProps) {
  const { id } = await props.params;

  const [event, eventForms] = await Promise.all([
    fetchEvent(id),
    fetchEventForms(id),
  ]);

  if (!event) {
    return (
      <div className="p-6 space-y-6">
        <header className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">
              Event nicht gefunden
            </h1>
            <p className="text-sm text-slate-500">
              Für die ID <code>{id}</code> wurde kein Event gefunden oder du
              hast keinen Zugriff darauf.
            </p>
          </div>

          <Link
            href="/admin/events"
            className="text-sm font-medium text-blue-600 hover:underline"
          >
            Zurück zur Event-Liste
          </Link>
        </header>

        <section className="rounded-lg border border-slate-200 bg-white p-6 text-sm text-slate-600">
          <p>
            Prüfe, ob die Seed-Daten aus Teilprojekt 1.6 korrekt angelegt sind
            (z.&nbsp;B. „Demo-Messe 2026“) und ob du mit dem richtigen Tenant /
            der richtigen User-ID arbeitest.
          </p>
        </section>
      </div>
    );
  }

  const timeRange =
    formatDate(event.startDate) + ' – ' + formatDate(event.endDate);
  const statusLabel = event.status ?? '–';
  const hasForms = eventForms.length > 0;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <header className="flex items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold text-slate-900">
              {event.name}
            </h1>
            <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-medium uppercase tracking-wide text-slate-700">
              {statusLabel}
            </span>
          </div>
          <p className="text-xs text-slate-500">Event-ID: {event.id}</p>
        </div>

        <Link
          href="/admin/events"
          className="text-sm font-medium text-blue-600 hover:underline"
        >
          Zurück zur Event-Liste
        </Link>
      </header>

      {/* Meta-Infos (Read-only) */}
      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Zeitraum
          </h2>
          <p className="mt-1 text-sm text-slate-800">{timeRange}</p>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Ort
          </h2>
          <p className="mt-1 text-sm text-slate-800">
            {event.location ?? '–'}
          </p>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Beschreibung
          </h2>
          <p className="mt-1 text-sm text-slate-800">
            {event.description ?? (
              <span className="text-slate-500">
                Keine Beschreibung hinterlegt.
              </span>
            )}
          </p>
        </div>
      </section>

      {/* Edit-Form */}
      <section className="rounded-lg border border-slate-200 bg-white p-6 space-y-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-800">
            Event bearbeiten
          </h2>
          <p className="text-xs text-slate-500">
            Passe Name, Zeitraum und Status dieses Events an. Änderungen werden
            direkt über die Admin-API gespeichert.
          </p>
        </div>

        <EventEditForm
          event={{
            id: event.id,
            name: event.name,
            startDate: event.startDate,
            endDate: event.endDate,
            status: event.status,
          }}
        />
      </section>

      {/* Formular-Zuordnung */}
      <section className="rounded-lg border border-slate-200 bg-white p-6 space-y-3">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-sm font-semibold text-slate-800">
              Zugeordnete Formulare
            </h2>
            <p className="text-xs text-slate-500">
              Diese Formulare stehen in der App für dieses Event zur Verfügung.
            </p>
          </div>
        </div>

        {!hasForms ? (
          <div className="rounded-md border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">
            <p>Diesem Event sind aktuell noch keine Formulare zugeordnet.</p>
            <p className="mt-1 text-xs text-slate-500">
              Über die Admin-API{' '}
              <code className="font-mono text-[11px]">
                /api/admin/events/{'{id}'}/forms
              </code>{' '}
              kannst du Formulare verknüpfen. In einem späteren Teilprojekt
              ergänzen wir hier eine UI für die Formular-Bindung.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Formular
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Primary
                  </th>
                  <th className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Aktionen
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {eventForms.map((ef) => {
                  const formName =
                    ef.form?.name ?? `Formular #${ef.formId}`;

                  return (
                    <tr key={`${ef.eventId}-${ef.formId}`}>
                      <td className="whitespace-nowrap px-3 py-2">
                        <div className="flex flex-col">
                          <span className="font-medium text-slate-900">
                            {formName}
                          </span>
                          <span className="text-xs text-slate-500">
                            Form-ID: {ef.formId}
                          </span>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-3 py-2">
                        {ef.primary ? (
                          <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                            Primär
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-full bg-slate-50 px-2 py-0.5 text-xs font-medium text-slate-600">
                            Sekundär
                          </span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 text-right">
                        {ef.form?.id ? (
                          <Link
                            href={`/admin/forms/${ef.form.id}`}
                            className="text-xs font-medium text-blue-600 hover:underline"
                          >
                            Formbuilder öffnen
                          </Link>
                        ) : (
                          <span className="text-xs text-slate-400">
                            Kein Formbuilder-Link verfügbar
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
