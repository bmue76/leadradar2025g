import Link from "next/link";

type EventStatus = "PLANNED" | "ACTIVE" | "FINISHED"; // ggf. an dein Prisma-Enum anpassen

type AdminEventListItem = {
  id: number;
  name: string;
  startDate: string | null;
  endDate: string | null;
  status: EventStatus;
  location: string | null;
};

async function fetchEvents(): Promise<AdminEventListItem[]> {
  // Server-Komponenten brauchen eine absolute URL für fetch
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";

  const res = await fetch(`${baseUrl}/api/admin/events`, {
    cache: "no-store",
    headers: {
      // Dev/Stub-User für Admin-API – muss zu deinem Seed-User passen
      "x-user-id": "1",
    },
  });

  if (!res.ok) {
    console.error("Failed to load events", await res.text());
    return [];
  }

  const data = await res.json();

  // Flexibel auf unterschiedliche API-Shapes reagieren
  if (Array.isArray(data)) {
    return data as AdminEventListItem[];
  }
  if (Array.isArray(data.events)) {
    return data.events as AdminEventListItem[];
  }

  return [];
}

function formatDate(date: string | null) {
  if (!date) return "–";
  try {
    const d = new Date(date);
    if (Number.isNaN(d.getTime())) return date;
    return d.toLocaleDateString("de-CH");
  } catch {
    return date;
  }
}

export default async function AdminEventsPage() {
  const events = await fetchEvents();

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Events</h1>
          <p className="text-sm text-muted-foreground">
            Verwalte deine Messen und ordne Formulare zu.
          </p>
        </div>

        <Link
          href="/admin/events/new"
          className="inline-flex items-center rounded-md border border-transparent bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90"
        >
          + Event erstellen
        </Link>
      </div>

      {/* Liste */}
      <div className="overflow-x-auto rounded-lg border bg-card">
        <table className="min-w-full text-sm">
          <thead className="border-b bg-muted/50">
            <tr>
              <th className="px-4 py-2 text-left font-medium text-muted-foreground">Name</th>
              <th className="px-4 py-2 text-left font-medium text-muted-foreground">Zeitraum</th>
              <th className="px-4 py-2 text-left font-medium text-muted-foreground">Status</th>
              <th className="px-4 py-2 text-left font-medium text-muted-foreground">Ort</th>
              <th className="px-4 py-2 text-right font-medium text-muted-foreground">Aktionen</th>
            </tr>
          </thead>
          <tbody>
            {events.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-sm text-muted-foreground">
                  Noch keine Events erfasst. Klicke auf <strong>„Event erstellen“</strong>, um die
                  erste Messe anzulegen.
                </td>
              </tr>
            ) : (
              events.map((event) => (
                <tr key={event.id} className="border-b last:border-b-0">
                  <td className="px-4 py-2 align-top">
                    <div className="font-medium">{event.name}</div>
                  </td>
                  <td className="px-4 py-2 align-top">
                    {formatDate(event.startDate)} – {formatDate(event.endDate)}
                  </td>
                  <td className="px-4 py-2 align-top">
                    <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs font-medium">
                      {event.status}
                    </span>
                  </td>
                  <td className="px-4 py-2 align-top">
                    {event.location ?? <span className="text-muted-foreground">–</span>}
                  </td>
                  <td className="px-4 py-2 align-top text-right">
                    <Link
                      href={`/admin/events/${event.id}`}
                      className="text-sm font-medium text-primary hover:underline"
                    >
                      Details
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
