'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';

type EventForEdit = {
  id: number;
  name: string;
  startDate: string | null;
  endDate: string | null;
  status: string;
};

type EventEditFormProps = {
  event: EventForEdit;
};

const EVENT_STATUSES = ['PLANNED', 'ACTIVE', 'FINISHED'] as const;

function toDateInputValue(dateString: string | null): string {
  if (!dateString) return '';
  try {
    const d = new Date(dateString);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  } catch {
    return '';
  }
}

export default function EventEditForm({ event }: EventEditFormProps) {
  const router = useRouter();

  const [name, setName] = useState(event.name);
  const [startDate, setStartDate] = useState(
    toDateInputValue(event.startDate),
  );
  const [endDate, setEndDate] = useState(toDateInputValue(event.endDate));
  const [status, setStatus] = useState(event.status || 'PLANNED');

  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setIsSaving(true);

    try {
      const res = await fetch(`/api/admin/events/${event.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': '1',
        },
        body: JSON.stringify({
          name: name.trim(),
          startDate: startDate || null,
          endDate: endDate || null,
          status,
        }),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(
          `Update fehlgeschlagen (${res.status})${
            text ? `: ${text}` : ''
          }`,
        );
      }

      setSuccess('Event erfolgreich gespeichert.');
      // Daten neu laden
      router.refresh();
    } catch (err: any) {
      console.error('Failed to update event', err);
      setError(err?.message ?? 'Unbekannter Fehler beim Speichern.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-4 md:grid-cols-3">
        {/* Name */}
        <div className="md:col-span-3">
          <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
            Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
            placeholder="Event-Name"
          />
        </div>

        {/* Startdatum */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
            Startdatum
          </label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
          />
        </div>

        {/* Enddatum */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
            Enddatum
          </label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
          />
        </div>

        {/* Status */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
            Status
          </label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
          >
            {EVENT_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Feedback */}
      {(error || success) && (
        <div className="space-y-1 text-xs">
          {error && (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-red-700">
              {error}
            </div>
          )}
          {success && (
            <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-emerald-700">
              {success}
            </div>
          )}
        </div>
      )}

      <div className="flex items-center justify-end gap-2">
        <button
          type="submit"
          disabled={isSaving}
          className="inline-flex items-center rounded-md border border-slate-300 bg-slate-900 px-3 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSaving ? 'Speichern…' : 'Event speichern'}
        </button>
      </div>
    </form>
  );
}
