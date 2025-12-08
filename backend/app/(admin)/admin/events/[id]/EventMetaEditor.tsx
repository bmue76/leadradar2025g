"use client";

import { useState } from "react";

type EventStatus = "PLANNED" | "ACTIVE" | "FINISHED";

type AdminEvent = {
  id: number;
  name: string;
  startDate: string | null;
  endDate: string | null;
  status: EventStatus;
  location: string | null;
  description: string | null;
};

type Props = {
  event: AdminEvent;
};

export default function EventMetaEditor({ event }: Props) {
  const [name, setName] = useState(event.name ?? "");
  const [startDate, setStartDate] = useState(event.startDate?.slice(0, 10) ?? "");
  const [endDate, setEndDate] = useState(event.endDate?.slice(0, 10) ?? "");
  const [status, setStatus] = useState<EventStatus>(event.status ?? "PLANNED");
  const [location, setLocation] = useState(event.location ?? "");
  const [description, setDescription] = useState(event.description ?? "");

  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);

    if (!name.trim()) {
      setError("Bitte einen Eventnamen eingeben.");
      return;
    }

    if (!startDate || !endDate) {
      setError("Bitte Start- und Enddatum setzen.");
      return;
    }

    try {
      setIsSaving(true);

      const res = await fetch(`/api/admin/events/${event.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": "1",
        },
        body: JSON.stringify({
          name: name.trim(),
          startDate,
          endDate,
          status,
          location: location.trim() || null,
          description: description.trim() || null,
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        console.error("Failed to update event", text);
        setError("Event konnte nicht gespeichert werden.");
        return;
      }

      setMessage("Event gespeichert.");
    } catch (err) {
      console.error(err);
      setError("Unerwarteter Fehler beim Speichern.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="space-y-4 rounded-lg border bg-card p-6 shadow-sm">
      <h2 className="text-lg font-semibold">Event-Metadaten</h2>
      <p className="text-sm text-muted-foreground">
        Passe Name, Zeitraum, Status und weitere Angaben des Events an.
      </p>

      {error && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}
      {message && (
        <div className="rounded-md border border-emerald-500/50 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700">
          {message}
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-sm font-medium" htmlFor="event-name">
            Eventname
          </label>
          <input
            id="event-name"
            type="text"
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1.5">
            <label className="text-sm font-medium" htmlFor="event-start">
              Startdatum
            </label>
            <input
              id="event-start"
              type="date"
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium" htmlFor="event-end">
              Enddatum
            </label>
            <input
              id="event-end"
              type="date"
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1.5">
            <label className="text-sm font-medium" htmlFor="event-status">
              Status
            </label>
            <select
              id="event-status"
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              value={status}
              onChange={(e) => setStatus(e.target.value as EventStatus)}
            >
              <option value="PLANNED">Geplant</option>
              <option value="ACTIVE">Laufend</option>
              <option value="FINISHED">Abgeschlossen</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium" htmlFor="event-location">
              Location / Ort
            </label>
            <input
              id="event-location"
              type="text"
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium" htmlFor="event-description">
            Beschreibung
          </label>
          <textarea
            id="event-description"
            className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isSaving}
            className="inline-flex items-center rounded-md border border-transparent bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isSaving ? "Speichere …" : "Speichern"}
          </button>
        </div>
      </form>
    </div>
  );
}
