'use client';

// backend/app/(admin)/admin/forms/[id]/FormPreviewTabletLayout.tsx

import * as React from 'react';
import {
  CHOICE_FIELD_TYPES,
  type FormFieldType,
  type SelectOptionConfig,
  type ContactSlotKey,
  type ContactSlotsConfig,
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

  /**
   * Teilprojekt 2.17 – Kontaktblock Slot-Mapping (pro Formular)
   * - undefined / kein key: Slot bleibt sichtbar und fällt auf Heuristik zurück
   * - number: gemappt auf Field.id
   * - null: Slot deaktiviert (wird nicht gerendert)
   */
  contactSlots?: ContactSlotsConfig | null;
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
function getDefaultOption(
  options: SelectOptionConfig[],
): SelectOptionConfig | null {
  if (!options.length) return null;
  const explicit = options.find((opt) => opt.isDefault);
  return explicit ?? options[0];
}

type SlotResolveMode = 'MAPPED' | 'AUTO' | 'PLACEHOLDER' | 'DISABLED';

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss');
}

function matchesAny(haystack: string, needles: string[]): boolean {
  const h = normalizeText(haystack);
  return needles.some((n) => h.includes(normalizeText(n)));
}

function resolveAutoField(
  slot: ContactSlotKey,
  fields: PreviewField[],
): PreviewField | null {
  const patterns: Record<ContactSlotKey, string[]> = {
    company: ['company', 'firma', 'unternehmen', 'organisation', 'organization', 'org'],
    firstName: ['firstname', 'first_name', 'vorname', 'given', 'name first'],
    lastName: ['lastname', 'last_name', 'nachname', 'surname', 'family', 'name last'],
    phone: ['phone', 'telefon', 'mobile', 'handy', 'tel', 'nummer', 'number'],
    email: ['email', 'e-mail', 'mail'],
    notes: ['notes', 'notiz', 'notizen', 'bemerkung', 'bemerkungen', 'kommentar', 'comment'],
  };

  const candidates = fields.filter((f) => f.isActive !== false);
  const best =
    candidates.find((f) => matchesAny(f.key ?? '', patterns[slot])) ??
    candidates.find((f) => matchesAny(f.label ?? '', patterns[slot])) ??
    null;

  return best;
}

function findFieldById(fields: PreviewField[], id: number): PreviewField | null {
  const sid = String(id);
  return fields.find((f) => String(f.id) === sid) ?? null;
}

const SLOT_DEFS: Array<{ key: ContactSlotKey; title: string; variant: 'single' | 'notes' }> =
  [
    { key: 'company', title: 'Firma', variant: 'single' },
    { key: 'firstName', title: 'Vorname', variant: 'single' },
    { key: 'lastName', title: 'Nachname', variant: 'single' },
    { key: 'phone', title: 'Telefon', variant: 'single' },
    { key: 'email', title: 'E-Mail', variant: 'single' },
    { key: 'notes', title: 'Notizen', variant: 'notes' },
  ];

const FormPreviewTabletLayout: React.FC<FormPreviewTabletLayoutProps> = ({
  fields,
  activeFieldId,
  onFieldClick,
  contactSlots,
}) => {
  const handleFieldClick = (id: FieldId) => {
    if (onFieldClick) onFieldClick(id);
  };

  const dynamicFields = fields.filter((f) => f.isActive !== false);

  function resolveSlot(slotKey: ContactSlotKey): {
    mode: SlotResolveMode;
    field: PreviewField | null;
    isDisabled: boolean;
  } {
    const cfg = contactSlots ?? undefined;

    // Wenn contactSlots existiert und der Slot explizit null ist -> disabled
    if (cfg && Object.prototype.hasOwnProperty.call(cfg, slotKey)) {
      const v = (cfg as any)[slotKey] as number | null | undefined;
      if (v === null) {
        return { mode: 'DISABLED', field: null, isDisabled: true };
      }
      if (typeof v === 'number' && Number.isFinite(v)) {
        const mapped = findFieldById(fields, v);
        if (mapped) return { mode: 'MAPPED', field: mapped, isDisabled: false };
        // gemappt, aber Feld existiert nicht mehr -> placeholder
        return { mode: 'PLACEHOLDER', field: null, isDisabled: false };
      }
      // undefined => Slot sichtbar, aber nicht gemappt (Auto)
    }

    const auto = resolveAutoField(slotKey, fields);
    if (auto) return { mode: 'AUTO', field: auto, isDisabled: false };
    return { mode: 'PLACEHOLDER', field: null, isDisabled: false };
  }

  function renderContactCell(title: string, resolved: ReturnType<typeof resolveSlot>) {
    const hint =
      resolved.mode === 'MAPPED'
        ? `↳ ${resolved.field?.label ?? resolved.field?.key ?? 'Feld'}`
        : resolved.mode === 'AUTO'
        ? `Auto ↳ ${resolved.field?.label ?? resolved.field?.key ?? 'Feld'}`
        : resolved.mode === 'PLACEHOLDER'
        ? '—'
        : '';

    return (
      <div className="rounded-md border border-slate-200 bg-white px-2 py-1.5">
        <div className="flex items-center justify-between gap-2">
          <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
            {title}
          </div>
          {resolved.mode !== 'PLACEHOLDER' && resolved.mode !== 'DISABLED' && (
            <span className="text-[10px] text-slate-400">{hint}</span>
          )}
        </div>
        <div className="mt-1 h-4 rounded bg-slate-100" />
      </div>
    );
  }

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

        {/* Rechte Spalte – Kontakt/OCR Block (konfigurierbar via contactSlots) */}
        <div className="w-[260px] border-l border-slate-200 bg-slate-100 px-4 py-4">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Kontaktblock &amp; Notizen
          </h3>

          <div className="space-y-2 text-xs">
            {(() => {
              const company = resolveSlot('company');
              if (company.isDisabled) return null;
              return renderContactCell('Firma', company);
            })()}

            <div className="grid grid-cols-2 gap-2">
              {(() => {
                const firstName = resolveSlot('firstName');
                if (firstName.isDisabled) return <div />;
                return renderContactCell('Vorname', firstName);
              })()}
              {(() => {
                const lastName = resolveSlot('lastName');
                if (lastName.isDisabled) return <div />;
                return renderContactCell('Nachname', lastName);
              })()}
            </div>

            {(() => {
              const phone = resolveSlot('phone');
              if (phone.isDisabled) return null;
              return renderContactCell('Telefon', phone);
            })()}

            {(() => {
              const email = resolveSlot('email');
              if (email.isDisabled) return null;
              return renderContactCell('E-Mail', email);
            })()}

            {(() => {
              const notes = resolveSlot('notes');
              if (notes.isDisabled) return null;

              const hint =
                notes.mode === 'MAPPED'
                  ? `↳ ${notes.field?.label ?? notes.field?.key ?? 'Feld'}`
                  : notes.mode === 'AUTO'
                  ? `Auto ↳ ${notes.field?.label ?? notes.field?.key ?? 'Feld'}`
                  : '—';

              return (
                <div className="mt-3 rounded-md border border-slate-200 bg-white px-2 py-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                      Notizen
                    </div>
                    {notes.mode !== 'PLACEHOLDER' && (
                      <span className="text-[10px] text-slate-400">{hint}</span>
                    )}
                  </div>
                  <div className="mt-1 h-20 rounded bg-slate-100" />
                </div>
              );
            })()}
          </div>

          <div className="mt-4 rounded-md border border-dashed border-slate-300 bg-slate-50 px-3 py-2 text-[11px] text-slate-500">
            Kontaktblock ist jetzt konfigurierbar (Slot-Mapping). Falls kein Mapping
            gesetzt ist, greift Fallback via Heuristik.
          </div>
        </div>
      </div>
    </div>
  );
};

export default FormPreviewTabletLayout;
