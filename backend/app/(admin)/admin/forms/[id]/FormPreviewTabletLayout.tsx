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
import { normalizeTheme } from '@/lib/formTheme';

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

  /**
   * Teilprojekt 2.18 – Theme / Branding (Roh oder normalisiert; wird defensiv normalisiert)
   */
  theme?: unknown | null;
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

function resolveAutoField(slot: ContactSlotKey, fields: PreviewField[]): PreviewField | null {
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

function resolveFontStack(name: string): string {
  const sys = 'system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif';
  const n = (name ?? '').trim();

  if (!n || n.toLowerCase() === 'system') return sys;

  // Für späteres echtes Laden ok – jetzt ist es nur ein "Name".
  return `"${n}", ${sys}`;
}

function hexToRgba(hex: string, alpha: number): string {
  let h = (hex ?? '').trim();
  if (!h) return `rgba(0,0,0,${alpha})`;
  if (!h.startsWith('#')) h = `#${h}`;
  h = h.toLowerCase();

  // #rgb
  if (h.length === 4) {
    const r = parseInt(h[1] + h[1], 16);
    const g = parseInt(h[2] + h[2], 16);
    const b = parseInt(h[3] + h[3], 16);
    return `rgba(${r},${g},${b},${alpha})`;
  }

  // #rrggbb or #rrggbbaa
  if (h.length === 7 || h.length === 9) {
    const r = parseInt(h.slice(1, 3), 16);
    const g = parseInt(h.slice(3, 5), 16);
    const b = parseInt(h.slice(5, 7), 16);
    return `rgba(${r},${g},${b},${alpha})`;
  }

  return `rgba(0,0,0,${alpha})`;
}

const FormPreviewTabletLayout: React.FC<FormPreviewTabletLayoutProps> = ({
  fields,
  activeFieldId,
  onFieldClick,
  contactSlots,
  theme: themeRaw,
}) => {
  const theme = React.useMemo(() => normalizeTheme(themeRaw ?? undefined), [themeRaw]);

  const fontFamily = React.useMemo(
    () => resolveFontStack(theme.fontFamily),
    [theme.fontFamily],
  );

  const ui = React.useMemo(() => {
    return {
      panelMutedBg: hexToRgba(theme.muted, 0.06),
      inputBg: hexToRgba(theme.muted, 0.08),
      placeholderBg: hexToRgba(theme.muted, 0.12),
      activeBg: hexToRgba(theme.primary, 0.10),
    };
  }, [theme.muted, theme.primary]);

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
      <div
        className="rounded-md border px-2 py-1.5"
        style={{
          borderColor: theme.border,
          backgroundColor: theme.surface,
        }}
      >
        <div className="flex items-center justify-between gap-2">
          <div
            className="text-[10px] font-semibold uppercase tracking-wide"
            style={{ color: theme.muted }}
          >
            {title}
          </div>
          {resolved.mode !== 'PLACEHOLDER' && resolved.mode !== 'DISABLED' && (
            <span className="text-[10px]" style={{ color: theme.muted }}>
              {hint}
            </span>
          )}
        </div>
        <div
          className="mt-1 h-4 rounded"
          style={{ backgroundColor: ui.placeholderBg }}
        />
      </div>
    );
  }

  return (
    <div className="flex justify-center">
      <div
        className="flex h-[530px] w-full max-w-4xl overflow-hidden rounded-2xl border shadow-inner"
        style={{
          borderColor: theme.border,
          backgroundColor: theme.background,
          color: theme.text,
          fontFamily,
        }}
      >
        {/* Linke Spalte – dynamische Formularfelder */}
        <div
          className="flex-1 border-r px-4 py-4"
          style={{
            borderColor: theme.border,
            backgroundColor: theme.surface,
          }}
        >
          <div className="mb-3 flex items-center justify-between">
            <h3
              className="text-xs font-semibold uppercase tracking-wide"
              style={{ color: theme.muted }}
            >
              Formularfelder
            </h3>
            <span className="text-[10px]" style={{ color: theme.muted }}>
              Vorschau – nicht interaktiv
            </span>
          </div>

          <div className="flex h-full flex-col gap-3 overflow-auto pr-1 text-sm">
            {dynamicFields.length === 0 && (
              <div
                className="mt-4 rounded-md border border-dashed p-3 text-xs"
                style={{
                  borderColor: theme.border,
                  backgroundColor: ui.panelMutedBg,
                  color: theme.muted,
                }}
              >
                Noch keine Felder definiert. Lege links im Formbuilder Felder an,
                um hier die Vorschau zu sehen.
              </div>
            )}

            {dynamicFields.map((field) => {
              const isActive = activeFieldId === field.id;
              const label = field.label ?? field.key ?? 'Unbenanntes Feld';
              const type = (field.type ?? 'TEXT').toString().toUpperCase();

              const baseWrapperClasses =
                'rounded-md border px-3 py-2 transition-colors cursor-pointer';

              const wrapperStyle: React.CSSProperties = isActive
                ? {
                    borderColor: theme.primary,
                    backgroundColor: ui.activeBg,
                  }
                : {
                    borderColor: theme.border,
                    backgroundColor: theme.surface,
                  };

              // Choice-Felder → Options aus config lesen
              const isChoice = isChoiceFieldTypeFrontend(field.type ?? undefined);
              const options = isChoice ? getOptionsForField(field) : [];
              const defaultOption = isChoice ? getDefaultOption(options) : null;

              return (
                <div
                  key={String(field.id)}
                  className={baseWrapperClasses + (isActive ? '' : ' hover:opacity-95')}
                  style={wrapperStyle}
                  onClick={() => handleFieldClick(field.id)}
                >
                  <div className="flex items-center justify-between gap-2">
                    <label className="text-xs font-medium" style={{ color: theme.text }}>
                      {label}{' '}
                      {field.required && (
                        <span style={{ color: '#e11d48' }}>*</span>
                      )}
                    </label>
                    <span
                      className="text-[10px] uppercase tracking-wide"
                      style={{ color: theme.muted }}
                    >
                      {type}
                    </span>
                  </div>

                  {/* Feldkörper */}
                  <div className="mt-1">
                    {isChoice ? (
                      options.length === 0 ? (
                        <div
                          className="rounded border border-dashed px-2 py-1 text-[11px]"
                          style={{
                            borderColor: hexToRgba(theme.primary, 0.35),
                            backgroundColor: hexToRgba(theme.primary, 0.08),
                            color: theme.muted,
                          }}
                        >
                          [Keine Optionen definiert]
                        </div>
                      ) : (
                        <select
                          disabled
                          className="mt-1 w-full cursor-default rounded-md border px-2 py-1.5 text-xs"
                          style={{
                            borderColor: theme.border,
                            backgroundColor: ui.inputBg,
                            color: theme.text,
                          }}
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
                        className="mt-1 w-full cursor-default rounded-md border px-2 py-1.5 text-xs"
                        style={{
                          borderColor: theme.border,
                          backgroundColor: ui.inputBg,
                          color: theme.text,
                        }}
                        placeholder={field.placeholder ?? ''}
                      />
                    )}
                  </div>

                  {field.helpText && (
                    <p className="mt-1 text-[11px]" style={{ color: theme.muted }}>
                      {field.helpText}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Rechte Spalte – Kontakt/OCR Block (konfigurierbar via contactSlots) */}
        <div
          className="w-[260px] border-l px-4 py-4"
          style={{
            borderColor: theme.border,
            backgroundColor: ui.panelMutedBg,
          }}
        >
          <h3
            className="mb-3 text-xs font-semibold uppercase tracking-wide"
            style={{ color: theme.muted }}
          >
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
                <div
                  className="mt-3 rounded-md border px-2 py-1.5"
                  style={{
                    borderColor: theme.border,
                    backgroundColor: theme.surface,
                  }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div
                      className="text-[10px] font-semibold uppercase tracking-wide"
                      style={{ color: theme.muted }}
                    >
                      Notizen
                    </div>
                    {notes.mode !== 'PLACEHOLDER' && (
                      <span className="text-[10px]" style={{ color: theme.muted }}>
                        {hint}
                      </span>
                    )}
                  </div>
                  <div
                    className="mt-1 h-20 rounded"
                    style={{ backgroundColor: ui.placeholderBg }}
                  />
                </div>
              );
            })()}
          </div>

          <div
            className="mt-4 rounded-md border border-dashed px-3 py-2 text-[11px]"
            style={{
              borderColor: theme.border,
              backgroundColor: theme.background,
              color: theme.muted,
            }}
          >
            Kontaktblock ist konfigurierbar (Slot-Mapping). Falls kein Mapping gesetzt ist,
            greift Fallback via Heuristik.
          </div>
        </div>
      </div>
    </div>
  );
};

export default FormPreviewTabletLayout;
