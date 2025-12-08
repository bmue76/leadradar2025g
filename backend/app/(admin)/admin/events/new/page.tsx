"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type EventStatus = "PLANNED" | "ACTIVE" | "FINISHED"; // ggf. an dein Prisma-Enum anpassen

export default function AdminEventCreatePage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [location, setLocation] = useState("");
  const [status, setStatus] = useState<EventStatus>("PLANNED");
  const [description, setDescription] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError("Bitte einen Eventnamen eingeben.");
      return;
    }

    if (!startDate || !endDate) {
      setError("Bitte Start- und Enddatum setzen.");
      return;
    }

    try {
      setIsSubmitting(true);

      const res = await fetch("/api/admin/events", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          // Dev/Stub-User für Admin-API – muss zu deinem Seed-User passen
          "x-user-id": "1",
        },
        body: JSON.stringify({
          name: name.trim(),
          startDate,
          endDate,
          location: location.trim() || null,
          status,
          description: description.trim() || null,
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        console.error("Failed to create event:", text);
        setError("Event konnte nicht erstellt werden. Bitte später erneut versuchen.");
        return;
      }

      const created = await res.json();
      const id = created?.id ?? created?.event?.id;

      if (!id) {
        setError("Unerwartete Antwort vom Server – Event-ID fehlt.");
        return;
      }

      router.push(`/admin/events/${id}`);
    } catch (err) {
      console.error(err);
      setError("Unerwarteter Fehler beim Erstellen des Events.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Event erstellen</h1>
          <p className="text-sm text-muted-foreground">
            Lege eine neue Messe an und ordne später Formulare zu.
          </p>
        </div>

        <Link
          href="/admin/events"
          className="text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          ← Zurück zur Eventliste
        </Link>
      </div>

      {/* Formular */}
      <form
        onSubmit={handleSubmit}
        className="space-y-6 rounded-lg border bg-card p-6 shadow-sm"
      >
        {error && (
          <div className="rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1.5 md:col-span-2">
            <label className="text-sm font-medium" htmlFor="name">
              Eventname
            </label>
            <input
              id="name"
              type="text"
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              placeholder="z. B. Demo-Messe 2026"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium" htmlFor="startDate">
              Startdatum
            </label>
            <input
              id="startDate"
              type="date"
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium" htmlFor="endDate">
              Enddatum
            </label>
            <input
              id="endDate"
              type="date"
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium" htmlFor="location">
              Location / Ort
            </label>
            <input
              id="location"
              type="text"
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              placeholder="z. B. Messe Zürich, Halle 3"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium" htmlFor="status">
              Status
            </label>
            <select
              id="status"
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              value={status}
              onChange={(e) => setStatus(e.target.value as EventStatus)}
            >
              <option value="PLANNED">Geplant</option>
              <option value="ACTIVE">Laufend</option>
              <option value="FINISHED">Abgeschlossen</option>
            </select>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium" htmlFor="description">
            Beschreibung
          </label>
          <textarea
            id="description"
            className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            placeholder="Interne Notizen, Standnummer, Team, Öffnungszeiten …"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <div className="flex items-center justify-end gap-3">
          <Link
            href="/admin/events"
            className="inline-flex items-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground shadow-sm hover:bg-muted"
          >
            Abbrechen
          </Link>
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center rounded-md border border-transparent bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isSubmitting ? "Speichere …" : "Event erstellen"}
          </button>
        </div>
      </form>
    </div>
  );
}
