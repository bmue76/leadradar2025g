import Link from "next/link";
import { notFound } from "next/navigation";
import EventMetaEditor from "./EventMetaEditor";
import EventFormsManager from "./EventFormsManager";

type EventStatus = "PLANNED" | "ACTIVE" | "FINISHED"; // ggf. an dein Prisma-Enum anpassen

type AdminEvent = {
  id: number;
  name: string;
  startDate: string | null;
  endDate: string | null;
  status: EventStatus;
  location: string | null;
  description: string | null;
};

type EventFormBinding = {
  id: number;
  formId: number;
  isPrimary: boolean;
  form?: {
    id: number;
    name: string;
    description?: string | null;
  };
};

type AdminFormListItem = {
  id: number;
  name: string;
};

function getBaseUrl() {
  return process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";
}

async function fetchEvent(eventId: number): Promise<AdminEvent | null> {
  const res = await fetch(`${getBaseUrl()}/api/admin/events/${eventId}`, {
    cache: "no-store",
    headers: {
      "x-user-id": "1",
    },
  });

  if (!res.ok) {
    console.error("Failed to load event", eventId, await res.text());
    if (res.status === 404) return null;
    return null;
  }

  const data = await res.json();

  if (data?.event) {
    return data.event as AdminEvent;
  }

  return data as AdminEvent;
}

async function fetchEventForms(eventId: number): Promise<EventFormBinding[]> {
  const res = await fetch(`${getBaseUrl()}/api/admin/events/${eventId}/forms`, {
    cache: "no-store",
    headers: {
      "x-user-id": "1",
    },
  });

  if (!res.ok) {
    console.error("Failed to load event forms", eventId, await res.text());
    return [];
  }

  const data = await res.json();

  if (Array.isArray(data)) {
    return data as EventFormBinding[];
  }
  if (Array.isArray(data.forms)) {
    return data.forms as EventFormBinding[];
  }

  return [];
}

async function fetchAllForms(): Promise<AdminFormListItem[]> {
  const res = await fetch(`${getBaseUrl()}/api/admin/forms`, {
    cache: "no-store",
    headers: {
      "x-user-id": "1",
    },
  });

  if (!res.ok) {
    console.error("Failed to load forms", await res.text());
    return [];
  }

  const data = await res.json();

  if (Array.isArray(data)) {
    return data as AdminFormListItem[];
  }
  if (Array.isArray(data.forms)) {
    return data.forms as AdminFormListItem[];
  }

  return [];
}

export default async function AdminEventDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const eventId = Number(id);

  if (!eventId || Number.isNaN(eventId)) {
    notFound();
  }

  const [event, eventForms, allForms] = await Promise.all([
    fetchEvent(eventId),
    fetchEventForms(eventId),
    fetchAllForms(),
  ]);

  if (!event) {
    notFound();
  }

  const availableForms = allForms.filter(
    (form) => !eventForms.some((binding) => binding.formId === form.id),
  );

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Event-Details</h1>
          <p className="text-sm text-muted-foreground">
            Bearbeite Event-Metadaten und ordne Formulare zu.
          </p>
        </div>

        <Link
          href={`/admin/events/${event.id}/leads`}
          className="inline-flex items-center rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium hover:bg-gray-50"
        >
          Leads ansehen
        </Link>
      </div>

      {/* Inhalt: Meta + Formulare */}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1.1fr)]">
        <EventMetaEditor event={event} />

        <EventFormsManager
          eventId={eventId}
          initialBindings={eventForms}
          allForms={allForms}
          initialAvailableForms={availableForms}
        />
      </div>
    </div>
  );
}
