'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import type { FormDTO, FormFieldDTO } from '@/lib/types/forms';

/**
 * Leichter Feld-Typ für den Builder:
 * - passt zu dem, was page.tsx aktuell übergibt
 * - erlaubt zusätzlich optionale Properties aus FormFieldDTO
 */
type FormFieldLike = {
  id: number;
  key: string;
  label: string | null;
  type: string;
  required: boolean;
  placeholder: string | null;
  helpText: string | null;
  formId?: number;
  order?: number | null;
  isActive?: boolean | null;
};

type FieldDraft = {
  label: string;
  placeholder: string;
  helpText: string;
  required: boolean;
  isActive: boolean;
};

type FormBuilderWorkspaceProps = {
  /** Optional: kompletter Form-Datensatz (neu, für mehr Kontext) */
  form?: FormDTO;
  /** Optional: Formularname direkt (für Backwards-Kompatibilität) */
  formName?: string;
  /**
   * Für Rückwärtskompatibilität:
   * - ältere Versionen haben evtl. `fields` benutzt (leichter Typ)
   * - neuere `initialFields` (voller DTO-Typ)
   */
  fields?: FormFieldLike[];
  initialFields?: FormFieldDTO[];
};

function FormBuilderWorkspaceInner({
  form,
  formName,
  fields,
  initialFields,
}: FormBuilderWorkspaceProps) {
  const params = useParams<{ id: string }>();
  const formIdFromRoute = params?.id;

  // Anzeigename des Formulars bestimmen
  const formDisplayName =
    form?.name ?? formName ?? (form ? `#${form.id}` : 'Unbenanntes Formular');

  // Basis-Feldliste bestimmen (egal ob Prop `fields` oder `initialFields`)
  const baseFields: FormFieldLike[] = useMemo(
    () => [
      ...((fields ?? (initialFields as unknown as FormFieldLike[]) ?? []) ||
        []),
    ],
    [fields, initialFields],
  );

  // Nach `order` sortieren, falls vorhanden
  const sortedFields = useMemo(
    () =>
      [...baseFields].sort((a, b) => {
        const ao = a.order ?? 0;
        const bo = b.order ?? 0;
        return ao - bo;
      }),
    [baseFields],
  );

  const [fieldList, setFieldList] = useState<FormFieldLike[]>(sortedFields);
  const [activeFieldId, setActiveFieldId] = useState<number | null>(
    sortedFields.length > 0 ? sortedFields[0].id : null,
  );

  const activeField =
    fieldList.find((field) => field.id === activeFieldId) ?? null;

  // Lokaler Draft-State für die Properties des aktiven Feldes
  const [draft, setDraft] = useState<FieldDraft | null>(null);

  // Save-Status
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Immer wenn sich das aktive Feld ändert, Draft aus dessen Werten neu aufbauen
  useEffect(() => {
    if (!activeField) {
      setDraft(null);
      return;
    }

    setDraft({
      label: activeField.label ?? '',
      placeholder: activeField.placeholder ?? '',
      helpText: activeField.helpText ?? '',
      required: !!activeField.required,
      // Standard: wenn isActive nicht gesetzt -> true
      isActive: activeField.isActive !== false,
    });
    setSaveError(null);
    setSaveSuccess(false);
  }, [activeField]);

  // Dirty-Flag: gibt es Unterschiede zwischen Draft & aktuellem Feld?
  const isDirty =
    !!activeField &&
    !!draft &&
    (
      (activeField.label ?? '') !== draft.label ||
      (activeField.placeholder ?? '') !== draft.placeholder ||
      (activeField.helpText ?? '') !== draft.helpText ||
      !!activeField.required !== draft.required ||
      (activeField.isActive !== false) !== draft.isActive
    );

  async function handleSave() {
    if (!activeField || !draft) return;
    if (!isDirty) return; // nichts zu tun

    if (!formIdFromRoute) {
      setSaveError('Formular-ID konnte nicht aus der URL gelesen werden.');
      return;
    }

    setIsSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    try {
      const payload = {
        label: draft.label.trim() === '' ? null : draft.label.trim(),
        placeholder:
          draft.placeholder.trim() === ''
            ? null
            : draft.placeholder.trim(),
        helpText:
          draft.helpText.trim() === '' ? null : draft.helpText.trim(),
        required: draft.required,
        isActive: draft.isActive,
      };

      const res = await fetch(
        `/api/admin/forms/${formIdFromRoute}/fields/${activeField.id}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'x-user-id': '1', // Admin-Context (siehe requireAuthContext)
          },
          body: JSON.stringify(payload),
        },
      );

      if (!res.ok) {
        let message = 'Speichern fehlgeschlagen.';
        try {
          const data = await res.json();
          if (data?.error) {
            message =
              typeof data.error === 'string'
                ? data.error
                : JSON.stringify(data.error);
          }
        } catch {
          // ignore JSON-Parsing-Fehler
        }
        setSaveError(message);
        return;
      }

      // Lokale Feldliste auf Basis des Drafts aktualisieren
      setFieldList((prev) =>
        prev.map((field) =>
          field.id === activeField.id
            ? {
                ...field,
                label: payload.label ?? '',
                placeholder: payload.placeholder ?? '',
                helpText: payload.helpText ?? '',
                required: payload.required,
                isActive: payload.isActive,
              }
            : field,
        ),
      );

      setSaveSuccess(true);
      // kleinen Auto-Reset für den "Gespeichert"-Hint
      setTimeout(() => setSaveSuccess(false), 2000);
    } catch (error) {
      console.error(error);
      setSaveError('Unerwarteter Fehler beim Speichern.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="space-y-4">
      {/* kleiner Hinweis, in welchem Formular wir uns befinden */}
      <header>
        <p className="text-xs text-muted-foreground">
          Formbuilder-Workspace für Formular{' '}
          <span className="font-medium">{formDisplayName}</span>
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        {/* LINKE SPALTE: aktuell nur Feldliste (später globale Settings möglich) */}
        <div className="space-y-4">
          {/* Feldliste */}
          <div className="rounded-lg border bg-card p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-muted-foreground">
                Felder ({fieldList.length})
              </h2>
            </div>

            {fieldList.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Für dieses Formular sind derzeit noch keine Felder definiert.
              </p>
            ) : (
              <ul className="flex flex-col gap-1">
                {fieldList.map((field) => {
                  const isSelected = field.id === activeFieldId;

                  return (
                    <li key={field.id}>
                      <button
                        type="button"
                        onClick={() => setActiveFieldId(field.id)}
                        className={[
                          'flex w-full items-center justify-between rounded-md border px-3 py-2 text-left text-sm transition',
                          isSelected
                            ? 'border-primary bg-primary/5'
                            : 'border-border hover:bg-muted',
                          field.isActive === false ? 'opacity-60' : '',
                        ]
                          .filter(Boolean)
                          .join(' ')}
                      >
                        <div className="flex flex-col">
                          <span className="font-medium">
                            {field.label || field.key}
                          </span>
                          <span className="text-[11px] uppercase tracking-wide text-muted-foreground">
                            {field.type}
                            {field.required ? ' · Pflichtfeld' : ''}
                            {field.isActive === false ? ' · inaktiv' : ''}
                          </span>
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {/* Platzhalter für spätere globale Einstellungen (Form-/CD-Config) */}
        </div>

        {/* RECHTE SPALTE: Preview + Properties-Panel */}
        <div className="space-y-4">
          {/* Vorschau */}
          <div className="rounded-lg border bg-card p-4 shadow-sm">
            <h2 className="mb-3 text-sm font-semibold text-muted-foreground">
              Vorschau (Tablet – vereinfachte Darstellung)
            </h2>

            {fieldList.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Noch keine Felder vorhanden – bitte zuerst Felder anlegen.
              </p>
            ) : (
              <div className="space-y-3">
                {fieldList
                  .filter((field) => field.isActive !== false)
                  .map((field) => {
                    const isSelected = field.id === activeFieldId;
                    return (
                      <button
                        key={field.id}
                        type="button"
                        onClick={() => setActiveFieldId(field.id)}
                        className={[
                          'block w-full rounded-md border px-3 py-2 text-left transition',
                          isSelected
                            ? 'border-primary bg-primary/5'
                            : 'border-border hover:bg-muted/80',
                        ]
                          .filter(Boolean)
                          .join(' ')}
                      >
                        <div className="space-y-1">
                          <div className="text-xs font-medium text-muted-foreground">
                            {field.label || field.key}
                            {field.required && (
                              <span className="text-destructive"> *</span>
                            )}
                          </div>
                          <div className="h-9 rounded-md border bg-muted/40" />
                        </div>
                      </button>
                    );
                  })}
              </div>
            )}
          </div>

          {/* Properties-Panel – an die Vorschau angedockt */}
          <div className="rounded-lg border bg-card p-4 shadow-sm">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-muted-foreground">
                Feld-Eigenschaften
              </h2>
            </div>

            {!activeField || !draft ? (
              <p className="mt-2 text-sm text-muted-foreground">
                Kein Feld ausgewählt – bitte in der Vorschau oder links in der
                Liste ein Feld anklicken.
              </p>
            ) : (
              <div className="mt-3 space-y-4 text-sm">
                {/* Read-only Basisinfos */}
                <div className="grid gap-3 md:grid-cols-2">
                  <div>
                    <div className="text-xs uppercase tracking-wide text-muted-foreground">
                      Feld-Typ
                    </div>
                    <div className="mt-1 rounded-md border bg-muted px-2 py-1 text-xs">
                      {activeField.type ?? '–'}
                    </div>
                  </div>

                  <div>
                    <div className="text-xs uppercase tracking-wide text-muted-foreground">
                      Key
                    </div>
                    <div className="mt-1 rounded-md border bg-muted px-2 py-1 font-mono text-xs">
                      {activeField.key ?? '–'}
                    </div>
                  </div>
                </div>

                {/* Label */}
                <div>
                  <label className="text-xs uppercase tracking-wide text-muted-foreground">
                    Label
                  </label>
                  <input
                    type="text"
                    className="mt-1 w-full rounded-md border bg-background px-2 py-1 text-sm"
                    value={draft.label}
                    onChange={(e) =>
                      setDraft((prev) =>
                        prev ? { ...prev, label: e.target.value } : prev,
                      )
                    }
                    placeholder="z.B. Vorname"
                  />
                </div>

                {/* Placeholder */}
                <div>
                  <label className="text-xs uppercase tracking-wide text-muted-foreground">
                    Placeholder
                  </label>
                  <input
                    type="text"
                    className="mt-1 w-full rounded-md border bg-background px-2 py-1 text-sm"
                    value={draft.placeholder}
                    onChange={(e) =>
                      setDraft((prev) =>
                        prev ? { ...prev, placeholder: e.target.value } : prev,
                      )
                    }
                    placeholder="Optionaler Platzhalter-Text"
                  />
                </div>

                {/* Help-Text */}
                <div>
                  <label className="text-xs uppercase tracking-wide text-muted-foreground">
                    Help-Text
                  </label>
                  <textarea
                    className="mt-1 w-full rounded-md border bg-background px-2 py-1 text-sm"
                    rows={3}
                    value={draft.helpText}
                    onChange={(e) =>
                      setDraft((prev) =>
                        prev ? { ...prev, helpText: e.target.value } : prev,
                      )
                    }
                    placeholder="Kurze Erklärung oder Hinweis zum Feld (optional)"
                  />
                </div>

                {/* Toggles: Required & Aktiv */}
                <div className="grid gap-2 md:grid-cols-2">
                  <label className="flex items-center gap-2 text-xs text-muted-foreground">
                    <input
                      type="checkbox"
                      className="h-4 w-4"
                      checked={draft.required}
                      onChange={(e) =>
                        setDraft((prev) =>
                          prev
                            ? { ...prev, required: e.target.checked }
                            : prev,
                        )
                      }
                    />
                    <span className="select-none">Pflichtfeld</span>
                  </label>

                  <label className="flex items-center gap-2 text-xs text-muted-foreground">
                    <input
                      type="checkbox"
                      className="h-4 w-4"
                      checked={draft.isActive}
                      onChange={(e) =>
                        setDraft((prev) =>
                          prev
                            ? { ...prev, isActive: e.target.checked }
                            : prev,
                        )
                      }
                    />
                    <span className="select-none">Feld ist aktiv</span>
                  </label>
                </div>

                {/* Save-Button & Status */}
                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={isSaving || !isDirty}
                    className="inline-flex items-center rounded-md border border-primary bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground shadow-sm disabled:opacity-60"
                  >
                    {isSaving
                      ? 'Speichern…'
                      : isDirty
                        ? 'Änderungen speichern'
                        : 'Keine Änderungen'}
                  </button>
                  {saveSuccess && (
                    <span className="text-xs text-emerald-600">
                      Gespeichert.
                    </span>
                  )}
                </div>

                {/* Hinweis zu unsaved/clean */}
                <p className="text-xs text-muted-foreground">
                  {isDirty
                    ? 'Es gibt ungespeicherte Änderungen an diesem Feld.'
                    : 'Keine ungespeicherten Änderungen.'}
                </p>

                {saveError && (
                  <p className="pt-1 text-xs text-destructive">
                    {saveError}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

// Named Export (falls irgendwo so importiert wird)
export { FormBuilderWorkspaceInner as FormBuilderWorkspace };
// Default Export (für vorhandenen `import FormBuilderWorkspace'`)
export default FormBuilderWorkspaceInner;
