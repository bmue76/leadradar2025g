// app/(admin)/admin/forms/[id]/builder/FormBuilderShell.tsx
'use client';

import * as React from 'react';

export type BuilderFormField = {
  id: number;
  label: string;
  key: string;
  type: string;
  required: boolean;
  isActive: boolean;
  order: number;
};

export type BuilderFormMeta = {
  id?: number; // optional – wir verlassen uns primär auf formId-Prop
  name: string;
  description?: string | null;
  status: string;
};

export type BuilderFormWithFields = BuilderFormMeta & {
  fields: BuilderFormField[];
};

type FormBuilderShellProps = {
  form: BuilderFormWithFields;
  formId: number;
};

// Kleine Helper-Funktion, um eine passende Preview-Control je nach Typ zu rendern
function renderFieldPreviewControl(field: BuilderFormField) {
  const t = field.type.toUpperCase();

  // Standard-Input-Props
  const baseInputProps = {
    className:
      'flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm outline-none focus-visible:ring-1 focus-visible:ring-ring',
    disabled: true,
  } as const;

  if (t === 'TEXT' || t === 'SHORT_TEXT' || t === 'INPUT') {
    return (
      <input
        type="text"
        {...baseInputProps}
        placeholder={field.key || 'Text'}
      />
    );
  }

  if (t === 'EMAIL') {
    return (
      <input
        type="email"
        {...baseInputProps}
        placeholder={field.key || 'email@example.com'}
      />
    );
  }

  if (t === 'PHONE' || t === 'TEL') {
    return (
      <input
        type="tel"
        {...baseInputProps}
        placeholder={field.key || '+41 ...'}
      />
    );
  }

  if (t === 'NUMBER' || t === 'INT' || t === 'FLOAT') {
    return (
      <input
        type="number"
        {...baseInputProps}
        placeholder={field.key || '0'}
      />
    );
  }

  if (t === 'DATE') {
    return <input type="date" {...baseInputProps} />;
  }

  if (t === 'TEXTAREA' || t === 'LONG_TEXT') {
    return (
      <textarea
        rows={3}
        className="w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm outline-none focus-visible:ring-1 focus-visible:ring-ring"
        placeholder={field.key || 'Mehrzeiliger Text'}
        disabled
      />
    );
  }

  if (t === 'CHECKBOX') {
    return (
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          className="h-4 w-4 rounded border-input"
          disabled
        />
        <span className="text-sm text-muted-foreground">
          Beispielflag für {field.label || field.key || 'Option'}
        </span>
      </div>
    );
  }

  if (t === 'SELECT' || t === 'DROPDOWN') {
    return (
      <select
        className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm outline-none focus-visible:ring-1 focus-visible:ring-ring"
        disabled
      >
        <option>Option 1 (Preview)</option>
        <option>Option 2 (Preview)</option>
      </select>
    );
  }

  // Fallback: normales Textfeld
  return (
    <input
      type="text"
      {...baseInputProps}
      placeholder={field.key || 'Eingabe'}
    />
  );
}

export function FormBuilderShell({ form, formId }: FormBuilderShellProps) {
  const sortedFields = React.useMemo(
    () => [...form.fields].sort((a, b) => a.order - b.order),
    [form.fields],
  );

  const [activeFieldId, setActiveFieldId] = React.useState<number | null>(() => {
    const firstActive = sortedFields.find((f) => f.isActive);
    return firstActive ? firstActive.id : null;
  });

  const activeField = React.useMemo(
    () => sortedFields.find((f) => f.id === activeFieldId) ?? null,
    [sortedFields, activeFieldId],
  );

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {/* Linke Spalte: Feldliste / Palette */}
      <div className="space-y-4 lg:col-span-1">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium text-muted-foreground">Felder</h2>
          <span className="text-xs text-muted-foreground">
            {sortedFields.length} Feld
            {sortedFields.length === 1 ? '' : 'er'}
          </span>
        </div>

        <div className="rounded-xl border bg-card p-3 text-sm shadow-sm">
          {sortedFields.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              Für dieses Formular sind noch keine Felder definiert.
              <br />
              Lege Felder im Form-Detail an, sie erscheinen dann hier im
              Builder.
            </p>
          ) : (
            <ul className="space-y-1">
              {sortedFields.map((field) => {
                const isActiveField = field.id === activeFieldId;

                return (
                  <li key={field.id}>
                    <button
                      type="button"
                      onClick={() => setActiveFieldId(field.id)}
                      className={[
                        'flex w-full items-center justify-between rounded-md border px-2 py-1.5 text-left text-xs transition',
                        isActiveField
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:bg-muted',
                        !field.isActive ? 'opacity-60' : '',
                      ]
                        .filter(Boolean)
                        .join(' ')}
                    >
                      <div className="flex flex-col">
                        <span className="font-medium">
                          {field.label || field.key}
                          {field.required && (
                            <span className="ml-0.5 text-red-500">*</span>
                          )}
                        </span>
                        <span className="text-[11px] text-muted-foreground">
                          {field.type.toLowerCase()}
                          {!field.isActive && ' · inaktiv'}
                        </span>
                      </div>
                      <span className="text-[10px] text-muted-foreground">
                        #{field.order}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Placeholder für zukünftiges Properties-Panel */}
        <div className="rounded-xl border bg-card p-3 text-xs shadow-sm">
          <h3 className="mb-2 text-xs font-semibold text-muted-foreground">
            Feld-Details (Preview)
          </h3>
          {activeField ? (
            <div className="space-y-1">
              <div>
                <span className="font-medium">Label:</span>{' '}
                <span>{activeField.label || activeField.key}</span>
              </div>
              <div>
                <span className="font-medium">Typ:</span>{' '}
                <span>{activeField.type}</span>
              </div>
              <div>
                <span className="font-medium">Pflichtfeld:</span>{' '}
                <span>{activeField.required ? 'Ja' : 'Nein'}</span>
              </div>
              <div>
                <span className="font-medium">Status:</span>{' '}
                <span>{activeField.isActive ? 'Aktiv' : 'Inaktiv'}</span>
              </div>
              <div>
                <span className="font-medium">Reihenfolge:</span>{' '}
                <span>{activeField.order}</span>
              </div>
            </div>
          ) : (
            <p className="text-muted-foreground">
              Wähle ein Feld in der Liste aus, um Details zu sehen.
            </p>
          )}
        </div>
      </div>

      {/* Rechte Spalte: Formular-Vorschau */}
      <div className="space-y-4 lg:col-span-2">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium text-muted-foreground">
            Formular-Vorschau (Basis)
          </h2>
          <span className="text-xs text-muted-foreground">
            Formular-ID: #{formId}
          </span>
        </div>

        <div className="rounded-xl border bg-card p-6 shadow-sm">
          {sortedFields.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Noch keine Felder definiert.
              <br />
              Sobald du im Form-Detail Felder anlegst, werden sie hier als
              Vorschau angezeigt.
            </p>
          ) : (
            <div className="space-y-4">
              {/* Simple Header der Vorschau */}
              <div className="border-b pb-3">
                <h3 className="text-base font-semibold">
                  {form.name || `Formular #${formId}`}
                </h3>
                {form.description && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    {form.description}
                  </p>
                )}
              </div>

              {/* Basis-Rendering der Felder (noch ohne echte Validierung/Submit) */}
              <form className="space-y-4">
                {sortedFields
                  .filter((field) => field.isActive)
                  .map((field) => (
                    <div key={field.id} className="space-y-1">
                      <label className="block text-sm font-medium">
                        {field.label || field.key}
                        {field.required && (
                          <span className="ml-0.5 text-red-500">*</span>
                        )}
                      </label>

                      {renderFieldPreviewControl(field)}

                      <p className="text-[11px] text-muted-foreground">
                        Typ: {field.type.toLowerCase()}
                      </p>
                    </div>
                  ))}
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
