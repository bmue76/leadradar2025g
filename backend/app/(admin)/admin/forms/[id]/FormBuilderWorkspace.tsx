// app/(admin)/admin/forms/[id]/FormBuilderWorkspace.tsx
'use client';

import * as React from 'react';

type FormFieldLite = {
  id: number;
  key: string;
  label: string;
  type: string;
  required: boolean;
  placeholder: string | null;
  helpText: string | null;
};

interface FormBuilderWorkspaceProps {
  formName: string;
  fields: FormFieldLite[];
}

/**
 * Basis-Formbuilder:
 * - links: Feldliste + Details zum aktiven Feld (read-only)
 * - rechts: Formular-Vorschau mit typabhängigen Controls
 *
 * 2.6: Nur Anzeige / Workspace-Gefühl, noch keine neue CRUD-Logik.
 */
export default function FormBuilderWorkspace({
  formName,
  fields,
}: FormBuilderWorkspaceProps) {
  const [activeFieldId, setActiveFieldId] = React.useState<number | null>(
    fields.length > 0 ? fields[0]!.id : null,
  );

  const activeField =
    fields.find((f) => f.id === activeFieldId) ?? (fields[0] ?? null);

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
      {/* Linke Spalte – Feldliste & aktives Feld */}
      <div className="space-y-4 rounded-md border bg-card p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">Felder im Formular</h2>
          <span className="text-xs text-muted-foreground">
            {fields.length} Feld{fields.length === 1 ? '' : 'er'}
          </span>
        </div>

        {fields.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Dieses Formular hat noch keine Felder. Über die Feldtabelle unten
            kannst du neue Felder anlegen. Sie erscheinen dann auch hier im
            Builder.
          </p>
        ) : (
          <>
            <div className="max-h-64 space-y-1 overflow-auto border-b pb-2">
              {fields.map((field) => {
                const isActive = field.id === activeField?.id;
                return (
                  <button
                    key={field.id}
                    type="button"
                    onClick={() => setActiveFieldId(field.id)}
                    className={`flex w-full items-center justify-between rounded px-2 py-1 text-left text-sm ${
                      isActive
                        ? 'bg-primary text-primary-foreground'
                        : 'hover:bg-muted'
                    }`}
                  >
                    <span className="truncate">
                      {field.label || field.key || `Feld #${field.id}`}
                    </span>
                    <span
                      className={`ml-2 shrink-0 rounded px-1.5 py-0.5 text-[10px] uppercase ${
                        isActive
                          ? 'bg-primary-foreground/20'
                          : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {field.type}
                    </span>
                  </button>
                );
              })}
            </div>

            {activeField && (
              <div className="space-y-2 pt-1 text-sm">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium">
                    Aktives Feld:{' '}
                    <span className="font-semibold">
                      {activeField.label || activeField.key}
                    </span>
                  </h3>
                  {activeField.required && (
                    <span className="rounded bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-900">
                      Pflichtfeld
                    </span>
                  )}
                </div>
                <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  <div>
                    <dt className="font-medium text-foreground">Key</dt>
                    <dd className="truncate">
                      {activeField.key || <span className="opacity-60">–</span>}
                    </dd>
                  </div>
                  <div>
                    <dt className="font-medium text-foreground">Typ</dt>
                    <dd>{activeField.type}</dd>
                  </div>
                  <div className="col-span-2">
                    <dt className="font-medium text-foreground">
                      Placeholder
                    </dt>
                    <dd>
                      {activeField.placeholder || (
                        <span className="opacity-60">–</span>
                      )}
                    </dd>
                  </div>
                  <div className="col-span-2">
                    <dt className="font-medium text-foreground">Hilfetext</dt>
                    <dd>
                      {activeField.helpText || (
                        <span className="opacity-60">–</span>
                      )}
                    </dd>
                  </div>
                </dl>
                <p className="mt-2 text-[11px] text-muted-foreground">
                  Hinweis: In 2.6 sind diese Angaben nur lesbar. Die eigentliche
                  Feldbearbeitung findet weiterhin in der Tabelle unten statt
                  und wird in späteren Teilprojekten in den Builder verlegt.
                </p>
              </div>
            )}
          </>
        )}
      </div>

      {/* Rechte Spalte – Formular-Vorschau */}
      <div className="space-y-4 rounded-md border bg-card p-4">
        <div>
          <h2 className="text-base font-semibold">Formular-Vorschau</h2>
          <p className="text-xs text-muted-foreground">
            So könnte das Formular &bdquo;{formName}&ldquo; für die Messe-
            Erfassung aussehen. Diese Vorschau ist aktuell statisch und dient
            als Orientierung.
          </p>
        </div>

        {fields.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Noch keine Felder vorhanden – die Vorschau wird angezeigt, sobald du
            Felder angelegt hast.
          </p>
        ) : (
          <form className="space-y-3">
            {fields.map((field) => {
              const type = String(field.type).toLowerCase();

              const label =
                field.label || field.key || `Feld #${field.id.toString()}`;

              const common = (
                <>
                  <label className="mb-1 block text-xs font-medium text-foreground">
                    {label}
                    {field.required && (
                      <span className="ml-1 text-red-500">*</span>
                    )}
                  </label>
                  {field.helpText && (
                    <p className="mb-1 text-[11px] text-muted-foreground">
                      {field.helpText}
                    </p>
                  )}
                </>
              );

              if (type === 'textarea' || type === 'multiline') {
                return (
                  <div key={field.id} className="space-y-1">
                    {common}
                    <textarea
                      className="w-full rounded border bg-background px-2 py-1 text-sm"
                      placeholder={field.placeholder || ''}
                      rows={4}
                      disabled
                    />
                  </div>
                );
              }

              if (type === 'checkbox') {
                return (
                  <div
                    key={field.id}
                    className="flex items-center gap-2 text-sm"
                  >
                    <input type="checkbox" disabled />
                    <div className="flex flex-col">
                      <span>{label}</span>
                      {field.helpText && (
                        <span className="text-[11px] text-muted-foreground">
                          {field.helpText}
                        </span>
                      )}
                    </div>
                  </div>
                );
              }

              // Default: Text-/E-Mail-/Nummer-/Datum-Feld
              return (
                <div key={field.id} className="space-y-1">
                  {common}
                  <input
                    className="w-full rounded border bg-background px-2 py-1 text-sm"
                    placeholder={field.placeholder || ''}
                    disabled
                  />
                </div>
              );
            })}
          </form>
        )}
      </div>
    </div>
  );
}
