'use client';

// backend/app/(admin)/admin/forms/[id]/FormPreviewTabletLayout.tsx

import * as React from 'react';
import {
  CHOICE_FIELD_TYPES,
  type FormFieldType,
  type SelectOptionConfig,
} from '@/lib/types/forms';
import { normalizeSelectFieldConfig } from '@/lib/formFieldConfig';

type FieldId = string | number;

interface PreviewField {
  id: FieldId;
  key?: string;
  label?: string | null;
  type?: FormFieldType | string | null;
  placeholder?: string | null;
  helpText?: string | null;
  required?: boolean | null;
  config?: unknown | null;
  isActive?: boolean;
}

interface FormPreviewTabletLayoutProps {
  fields: PreviewField[];
  activeFieldId?: FieldId | null;
  onFieldClick?: (id: FieldId) => void;
}

/**
 * Ermittelt, ob der Feldtyp ein Choice-Typ ist (SELECT, MULTISELECT, RADIO).
 */
function isChoiceFieldTypeFrontend(type?: string | null): boolean {
  if (!type) return false;
  return CHOICE_FIELD_TYPES.includes(type as any);
}

/**
 * Holt die Select-Optionen aus der Feld-Config.
 */
function getOptionsForField(field: PreviewField): SelectOptionConfig[] {
  if (!isChoiceFieldTypeFrontend(field.type ?? undefined)) return [];
  const config = normalizeSelectFieldConfig(field.config ?? undefined);
  return config.options ?? [];
}

/**
 * Ermittelt die Default-Option für ein Feld.
 */
function getDefaultOption(options: SelectOptionConfig[]): SelectOptionConfig | null {
  if (!options.length) return null;
  const explicit = options.find((opt) => opt.isDefault);
  return explicit ?? options[0];
}

const FormPreviewTabletLayout: React.FC<FormPreviewTabletLayoutProps> = ({
  fields,
  activeFieldId,
  onFieldClick,
}) => {
  const handleFieldClick = (id: FieldId) => {
    if (onFieldClick) onFieldClick(id);
  };

  const dynamicFields = fields.filter((f) => f.isActive !== false);

  return (
    <div className="flex justify-center">
      <div className="flex h-[530px] w-full max-w-4xl overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 shadow-inner">
        {/* Linke Spalte – dynamische Formularfelder */}
        <div className="flex-1 border-r border-slate-200 bg-white px-4 py-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Formularfelder
            </h3>
            <span className="text-[10px] text-slate-400">
              Vorschau – nicht interaktiv
            </span>
          </div>

          <div className="flex h-full flex-col gap-3 overflow-auto pr-1 text-sm">
            {dynamicFields.length === 0 && (
              <div className="mt-4 rounded-md border border-dashed border-slate-200 bg-slate-50 p-3 text-xs text-slate-500">
                Noch keine Felder definiert. Lege links im Formbuilder Felder
                an, um hier die Vorschau zu sehen.
              </div>
            )}

            {dynamicFields.map((field) => {
              const isActive = activeFieldId === field.id;
              const label = field.label ?? field.key ?? 'Unbenanntes Feld';
              const type = (field.type ?? 'TEXT').toString().toUpperCase();

              const baseWrapperClasses =
                'rounded-md border px-3 py-2 transition-colors cursor-pointer';
              const wrapperClasses = isActive
                ? `${baseWrapperClasses} border-sky-500 bg-sky-50`
                : `${baseWrapperClasses} border-slate-200 bg-white hover:border-sky-300`;

              // Choice-Felder → Options aus config lesen
              const isChoice = isChoiceFieldTypeFrontend(field.type ?? undefined);
              const options = isChoice ? getOptionsForField(field) : [];
              const defaultOption = isChoice ? getDefaultOption(options) : null;

              return (
                <div
                  key={String(field.id)}
                  className={wrapperClasses}
                  onClick={() => handleFieldClick(field.id)}
                >
                  <div className="flex items-center justify-between gap-2">
                    <label className="text-xs font-medium text-slate-800">
                      {label}{' '}
                      {field.required && (
                        <span className="text-rose-600">*</span>
                      )}
                    </label>
                    <span className="text-[10px] uppercase tracking-wide text-slate-400">
                      {type}
                    </span>
                  </div>

                  {/* Feldkörper */}
                  <div className="mt-1">
                    {isChoice ? (
                      options.length === 0 ? (
                        <div className="rounded border border-dashed border-amber-200 bg-amber-50 px-2 py-1 text-[11px] text-amber-700">
                          [Keine Optionen definiert]
                        </div>
                      ) : (
                        <select
                          disabled
                          className="mt-1 w-full cursor-default rounded-md border border-slate-300 bg-slate-50 px-2 py-1.5 text-xs text-slate-700"
                          value={defaultOption?.value ?? ''}
                        >
                          {options.map((opt) => (
                            <option key={opt.id ?? opt.value} value={opt.value}>
                              {opt.label ?? opt.value}
                              {opt.isDefault ? ' (Standard)' : ''}
                            </option>
                          ))}
                        </select>
                      )
                    ) : (
                      <input
                        disabled
                        className="mt-1 w-full cursor-default rounded-md border border-slate-300 bg-slate-50 px-2 py-1.5 text-xs text-slate-700"
                        placeholder={field.placeholder ?? ''}
                      />
                    )}
                  </div>

                  {field.helpText && (
                    <p className="mt-1 text-[11px] text-slate-500">
                      {field.helpText}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Rechte Spalte – statischer Kontakt-/OCR-Block */}
        <div className="w-[260px] border-l border-slate-200 bg-slate-100 px-4 py-4">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Kontaktblock &amp; Notizen
          </h3>

          <div className="space-y-2 text-xs">
            <div className="rounded-md border border-slate-200 bg-white px-2 py-1.5">
              <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                Firma
              </div>
              <div className="mt-1 h-4 rounded bg-slate-100" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-md border border-slate-200 bg-white px-2 py-1.5">
                <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                  Vorname
                </div>
                <div className="mt-1 h-4 rounded bg-slate-100" />
              </div>
              <div className="rounded-md border border-slate-200 bg-white px-2 py-1.5">
                <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                  Nachname
                </div>
                <div className="mt-1 h-4 rounded bg-slate-100" />
              </div>
            </div>
            <div className="rounded-md border border-slate-200 bg-white px-2 py-1.5">
              <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                Telefon
              </div>
              <div className="mt-1 h-4 rounded bg-slate-100" />
            </div>
            <div className="rounded-md border border-slate-200 bg-white px-2 py-1.5">
              <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                E-Mail
              </div>
              <div className="mt-1 h-4 rounded bg-slate-100" />
            </div>
            <div className="mt-3 rounded-md border border-slate-200 bg-white px-2 py-1.5">
              <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                Notizen
              </div>
              <div className="mt-1 h-20 rounded bg-slate-100" />
            </div>
          </div>

          <div className="mt-4 rounded-md border border-dashed border-slate-300 bg-slate-50 px-3 py-2 text-[11px] text-slate-500">
            Dieser Bereich symbolisiert OCR-/Kontakt-Daten, die aus Visitenkarte
            oder manueller Eingabe stammen. Die Logik wird später für die
            Tablet-App implementiert.
          </div>
        </div>
      </div>
    </div>
  );
};

export default FormPreviewTabletLayout;
