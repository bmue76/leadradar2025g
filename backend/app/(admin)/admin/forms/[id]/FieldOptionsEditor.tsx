'use client';

// backend/app/(admin)/admin/forms/[id]/FieldOptionsEditor.tsx

import React, { useEffect, useMemo, useState } from 'react';
import { CHOICE_FIELD_TYPES, type SelectOptionConfig } from '@/lib/types/forms';
import { normalizeSelectFieldConfig } from '@/lib/formFieldConfig';

interface FieldWithOptions {
  id: number | string;
  type?: string | null;
  config?: unknown | null;
  label?: string | null;
  key?: string | null;
}

interface FieldOptionsEditorProps {
  formId: number | string;
  field: FieldWithOptions | null;
  onFieldUpdated?: (updatedField: FieldWithOptions) => void;
}

/**
 * Frontend-Helfer: prüft, ob der Feldtyp ein Choice-/Options-Feld ist
 * (SELECT, MULTISELECT, RADIO – gemäss CHOICE_FIELD_TYPES).
 */
function isChoiceFieldTypeFrontend(type?: string | null): boolean {
  if (!type) return false;
  return CHOICE_FIELD_TYPES.includes(type as any);
}

/**
 * Normalisiert die Optionsliste aus einem Feld-Objekt in ein sauberes Array.
 */
function getInitialOptionsFromField(
  field: FieldWithOptions | null,
): SelectOptionConfig[] {
  if (!field || !isChoiceFieldTypeFrontend(field.type ?? undefined)) {
    return [];
  }

  const config = normalizeSelectFieldConfig(field.config ?? undefined);
  return config.options ?? [];
}

/**
 * Komponente für die Bearbeitung von Select-/Choice-Optionen im Properties-Panel.
 */
export const FieldOptionsEditor: React.FC<FieldOptionsEditorProps> = ({
  formId,
  field,
  onFieldUpdated,
}) => {
  const isChoiceField = useMemo(
    () => !!field && isChoiceFieldTypeFrontend(field.type ?? undefined),
    [field],
  );

  const [options, setOptions] = useState<SelectOptionConfig[]>([]);
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Feldwechsel / Initial-Ladung
  useEffect(() => {
    if (!field || !isChoiceField) {
      setOptions([]);
      setIsDirty(false);
      setError(null);
      return;
    }

    const initial = getInitialOptionsFromField(field);
    setOptions(initial);
    setIsDirty(false);
    setError(null);
  }, [field, isChoiceField]);

  if (!field) {
    return (
      <div className="mt-4 rounded-md border border-dashed border-gray-300 p-3 text-sm text-gray-500">
        Kein Feld ausgewählt.
      </div>
    );
  }

  if (!isChoiceField) {
    return (
      <div className="mt-4 rounded-md border border-dashed border-gray-300 p-3 text-sm text-gray-500">
        Dieses Feld unterstützt keine Optionen. Optionen sind nur für
        Auswahlfelder (z.&nbsp;B. Select, Radio, Multiselect) verfügbar.
      </div>
    );
  }

  const handleAddOption = () => {
    const nextIndex = options.length + 1;
    const newOption: SelectOptionConfig = {
      id: `opt-${Date.now()}-${nextIndex}`,
      label: `Option ${nextIndex}`,
      value: `option_${nextIndex}`,
      isDefault: options.length === 0, // erste Option als Default vorschlagen
    };

    setOptions((prev) => [...prev, newOption]);
    setIsDirty(true);
  };

  const handleUpdateOption = (
    id: string,
    patch: Partial<Pick<SelectOptionConfig, 'label' | 'value' | 'isDefault'>>,
  ) => {
    setOptions((prev) =>
      prev.map((opt) =>
        opt.id === id
          ? {
              ...opt,
              ...patch,
            }
          : opt,
      ),
    );
    setIsDirty(true);
  };

  const handleSetDefault = (id: string) => {
    setOptions((prev) =>
      prev.map((opt) => ({
        ...opt,
        isDefault: opt.id === id,
      })),
    );
    setIsDirty(true);
  };

  const handleDeleteOption = (id: string) => {
    setOptions((prev) => prev.filter((opt) => opt.id !== id));
    setIsDirty(true);
  };

  const moveOption = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= options.length) return;

    setOptions((prev) => {
      const next = [...prev];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return next;
    });
    setIsDirty(true);
  };

  const handleMoveUp = (id: string) => {
    const index = options.findIndex((opt) => opt.id === id);
    if (index <= 0) return;
    moveOption(index, index - 1);
  };

  const handleMoveDown = (id: string) => {
    const index = options.findIndex((opt) => opt.id === id);
    if (index === -1 || index >= options.length - 1) return;
    moveOption(index, index + 1);
  };

  const handleSaveOptions = async () => {
    if (!field) return;

    setIsSaving(true);
    setError(null);

    try {
      const payload = {
        config: {
          options: options.map((opt, index) => ({
            id: opt.id || `opt-${index + 1}`,
            label: opt.label ?? '',
            value: opt.value ?? opt.label ?? '',
            isDefault: opt.isDefault === true ? true : undefined,
          })),
        },
      };

      const formIdEncoded = encodeURIComponent(String(formId));
      const fieldIdEncoded = encodeURIComponent(String(field.id));

      const res = await fetch(
        `/api/admin/forms/${formIdEncoded}/fields/${fieldIdEncoded}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            // Dev-Stub falls nötig:
            'x-user-id': '1',
          },
          body: JSON.stringify(payload),
        },
      );

      if (!res.ok) {
        let message = `Fehler beim Speichern der Optionen (Status ${res.status})`;
        try {
          const errJson = await res.json();
          if (errJson?.error) {
            message += `: ${errJson.error}`;
          }
        } catch {
          // ignore json parse error
        }
        throw new Error(message);
      }

      const updatedField = (await res.json()) as FieldWithOptions;
      setOptions(getInitialOptionsFromField(updatedField));
      setIsDirty(false);

      if (onFieldUpdated) {
        onFieldUpdated(updatedField);
      }
    } catch (err: any) {
      console.error('Failed to save field options', err);
      setError(
        err?.message ?? 'Unbekannter Fehler beim Speichern der Optionen.',
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="mt-6 space-y-3 rounded-md border border-gray-200 bg-gray-50 p-3 text-sm">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">Optionen</h3>
          <p className="text-xs text-gray-600">
            Definiere hier die Auswahlwerte für dieses Feld.{' '}
            <span className="font-medium">Label</span> ist der Anzeigetext im
            Formular, <span className="font-medium">Wert</span> ist der
            Schlüssel, der in den Lead-Daten und Exporten gespeichert wird.
          </p>
        </div>
        <button
          type="button"
          onClick={handleAddOption}
          className="rounded border border-gray-300 bg-white px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-100"
        >
          + Option hinzufügen
        </button>
      </div>

      {options.length === 0 && (
        <div className="rounded-md border border-dashed border-gray-300 p-3 text-xs text-gray-500">
          Noch keine Optionen definiert. Füge mit{' '}
          <span className="font-semibold">„Option hinzufügen“</span> die erste
          Option hinzu.
        </div>
      )}

      {options.length > 0 && (
        <div className="space-y-2">
          {options.map((opt, index) => (
            <div
              key={opt.id || `opt-${index}`}
              className="flex flex-col gap-2 rounded-md border border-gray-200 bg-white p-2"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-gray-500">
                  Option {index + 1}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleMoveUp(opt.id)}
                    disabled={index === 0}
                    className="rounded border border-gray-300 bg-white px-1.5 py-0.5 text-[10px] text-gray-600 disabled:opacity-40"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    onClick={() => handleMoveDown(opt.id)}
                    disabled={index === options.length - 1}
                    className="rounded border border-gray-300 bg-white px-1.5 py-0.5 text-[10px] text-gray-600 disabled:opacity-40"
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteOption(opt.id)}
                    className="rounded border border-red-200 bg-red-50 px-1.5 py-0.5 text-[10px] text-red-600 hover:bg-red-100"
                  >
                    Entfernen
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-2 md:flex-row">
                <div className="flex-1">
                  <label className="mb-0.5 block text-[11px] font-medium text-gray-700">
                    Anzeigetext (Label)
                  </label>
                  <input
                    type="text"
                    value={opt.label ?? ''}
                    onChange={(e) =>
                      handleUpdateOption(opt.id, { label: e.target.value })
                    }
                    className="w-full rounded border border-gray-300 px-2 py-1 text-xs"
                    placeholder="z. B. Heiss"
                  />
                </div>
                <div className="flex-1">
                  <label className="mb-0.5 block text-[11px] font-medium text-gray-700">
                    Wert (Value)
                  </label>
                  <input
                    type="text"
                    value={opt.value ?? ''}
                    onChange={(e) =>
                      handleUpdateOption(opt.id, { value: e.target.value })
                    }
                    className="w-full rounded border border-gray-300 px-2 py-1 text-xs"
                    placeholder="z. B. hot"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between gap-2">
                <label className="inline-flex items-center gap-1 text-[11px] text-gray-700">
                  <input
                    type="radio"
                    name={`default-option-${field.id}`}
                    checked={opt.isDefault === true}
                    onChange={() => handleSetDefault(opt.id)}
                    className="h-3 w-3"
                  />
                  <span>Standard-Option</span>
                </label>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between pt-1">
        <div className="text-xs text-gray-500">
          {isDirty
            ? 'Änderungen noch nicht gespeichert.'
            : 'Alle Änderungen gespeichert.'}
        </div>
        <button
          type="button"
          onClick={handleSaveOptions}
          disabled={!isDirty || isSaving || !field}
          className="rounded bg-blue-600 px-3 py-1 text-xs font-semibold text-white disabled:opacity-50"
        >
          {isSaving ? 'Speichern…' : 'Optionen speichern'}
        </button>
      </div>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 p-2 text-xs text-red-700">
          {error}
        </div>
      )}
    </div>
  );
};
