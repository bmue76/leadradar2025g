"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

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

type Props = {
  eventId: number;
  initialBindings: EventFormBinding[];
  allForms: AdminFormListItem[];
  initialAvailableForms: AdminFormListItem[];
};

export default function EventFormsManager({
  eventId,
  initialBindings,
  allForms,
  initialAvailableForms,
}: Props) {
  const [bindings, setBindings] = useState<EventFormBinding[]>(initialBindings);
  const [availableForms, setAvailableForms] =
    useState<AdminFormListItem[]>(initialAvailableForms);
  const [selectedFormId, setSelectedFormId] = useState<number | "">(
    initialAvailableForms[0]?.id ?? "",
  );

  const [isAdding, setIsAdding] = useState(false);
  const [isUpdatingPrimary, setIsUpdatingPrimary] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const hasPrimary = useMemo(() => bindings.some((b) => b.isPrimary), [bindings]);

  function resolveFormName(formId: number) {
    const fromBinding = bindings.find((b) => b.formId === formId)?.form;
    if (fromBinding?.name) return fromBinding.name;

    const fromAll = allForms.find((f) => f.id === formId);
    return fromAll?.name ?? `Formular #${formId}`;
  }

  function computeAvailableForms(nextBindings: EventFormBinding[]) {
    return allForms.filter((form) => !nextBindings.some((b) => b.formId === form.id));
  }

  async function handleAddForm(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);

    if (!selectedFormId || typeof selectedFormId !== "number") {
      setError("Bitte ein Formular auswählen.");
      return;
    }

    try {
      setIsAdding(true);

      const res = await fetch(`/api/admin/events/${eventId}/forms`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": "1",
        },
        body: JSON.stringify({
          formId: selectedFormId,
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        console.error("Failed to attach form to event", text);
        setError("Formular konnte nicht hinzugefügt werden.");
        return;
      }

      const data = await res.json();
      let nextBindings: EventFormBinding[] = [];

      if (Array.isArray(data)) {
        nextBindings = data as EventFormBinding[];
      } else if (Array.isArray(data.forms)) {
        nextBindings = data.forms as EventFormBinding[];
      } else {
        console.warn("Unexpected response shape for event forms", data);
        setMessage("Formular hinzugefügt (Antwort konnte nicht vollständig ausgewertet werden).");
        return;
      }

      setBindings(nextBindings);
      const nextAvailable = computeAvailableForms(nextBindings);
      setAvailableForms(nextAvailable);
      if (nextAvailable.length > 0) {
        setSelectedFormId(nextAvailable[0].id);
      } else {
        setSelectedFormId("");
      }

      setMessage("Formular zum Event hinzugefügt.");
    } catch (err) {
      console.error(err);
      setError("Unerwarteter Fehler beim Hinzufügen.");
    } finally {
      setIsAdding(false);
    }
  }

  async function handleSetPrimary(formId: number) {
    setError(null);
    setMessage(null);

    try {
      setIsUpdatingPrimary(true);

      const res = await fetch(`/api/admin/events/${eventId}/forms`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": "1",
        },
        body: JSON.stringify({
          primaryFormId: formId,
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        console.error("Failed to update primary form", text);
        setError("Primäres Formular konnte nicht gesetzt werden.");
        return;
      }

      const data = await res.json();
      let nextBindings: EventFormBinding[] = [];

      if (Array.isArray(data)) {
        nextBindings = data as EventFormBinding[];
      } else if (Array.isArray(data.forms)) {
        nextBindings = data.forms as EventFormBinding[];
      } else {
        console.warn("Unexpected response shape for event forms (primary update)", data);
        setMessage("Primäres Formular aktualisiert (Antwort nicht vollständig auswertbar).");
        return;
      }

      setBindings(nextBindings);
      setMessage("Primäres Formular aktualisiert.");
    } catch (err) {
      console.error(err);
      setError("Unerwarteter Fehler beim Aktualisieren des primären Formulars.");
    } finally {
      setIsUpdatingPrimary(false);
    }
  }

  return (
    <div className="space-y-4 rounded-lg border bg-card p-6 shadow-sm">
      <h2 className="text-lg font-semibold">Formular-Zuordnung</h2>
      <p className="text-sm text-muted-foreground">
        Ordne dem Event ein oder mehrere Formulare zu und bestimme das primäre Formular für die
        Leaderfassung.
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

      {/* Zugeordnete Formulare */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium">Zugeordnete Formulare</h3>
          {!hasPrimary && bindings.length > 0 && (
            <span className="text-xs font-medium text-amber-700">
              Kein primäres Formular gesetzt – bitte auswählen.
            </span>
          )}
        </div>

        {bindings.length === 0 ? (
          <div className="rounded-md border border-dashed px-3 py-3 text-sm text-muted-foreground">
            Es sind noch keine Formulare zugeordnet. Wähle unten ein Formular aus und klicke auf{" "}
            <strong>„Formular hinzufügen“</strong>.
          </div>
        ) : (
          <div className="space-y-2">
            {bindings.map((binding) => (
              <div
                key={binding.id ?? binding.formId}
                className="flex items-start justify-between rounded-md border bg-background px-3 py-2 text-sm"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">
                      {resolveFormName(binding.formId)}
                    </span>
                    {binding.isPrimary && (
                      <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                        Primär
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    <Link
                      href={`/admin/forms/${binding.formId}`}
                      className="text-xs font-medium text-primary hover:underline"
                    >
                      Formular öffnen
                    </Link>
                  </div>
                </div>

                <div className="flex items-center gap-2 pl-4">
                  <label className="inline-flex items-center gap-1.5 text-xs">
                    <input
                      type="radio"
                      name="primaryForm"
                      className="h-3 w-3"
                      checked={binding.isPrimary}
                      onChange={() => handleSetPrimary(binding.formId)}
                      disabled={isUpdatingPrimary}
                    />
                    <span>Primär</span>
                  </label>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Formular hinzufügen */}
      <form onSubmit={handleAddForm} className="space-y-3">
        <h3 className="text-sm font-medium">Weiteres Formular zuordnen</h3>

        {availableForms.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Es sind keine weiteren Formulare verfügbar, die diesem Event noch nicht zugeordnet sind.
            Lege bei Bedarf zuerst ein neues Formular an.
          </p>
        ) : (
          <>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <select
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:max-w-xs"
                value={selectedFormId === "" ? "" : String(selectedFormId)}
                onChange={(e) =>
                  setSelectedFormId(e.target.value ? Number(e.target.value) : "")
                }
              >
                {availableForms.map((form) => (
                  <option key={form.id} value={form.id}>
                    {form.name}
                  </option>
                ))}
              </select>

              <button
                type="submit"
                disabled={isAdding}
                className="inline-flex items-center justify-center rounded-md border border-transparent bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isAdding ? "Füge hinzu …" : "Formular hinzufügen"}
              </button>
            </div>
          </>
        )}
      </form>
    </div>
  );
}
