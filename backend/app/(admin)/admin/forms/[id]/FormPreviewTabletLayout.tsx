'use client';

import * as React from 'react';

export type TabletPreviewField = {
  id: string | number;
  label?: string | null;
  key?: string;
  required?: boolean | null;
  type?: string | null;
  placeholder?: string | null;
  isActive?: boolean | null;
};

type ContactSlotId =
  | 'company'
  | 'firstName'
  | 'lastName'
  | 'phone'
  | 'email'
  | 'notes';

type ContactFieldMap = Partial<Record<ContactSlotId, TabletPreviewField>>;

interface ContactSlotConfig {
  id: ContactSlotId;
  label: string;
  patterns: string[];
}

/**
 * Konfiguration der Kontaktfelder:
 * - label: Anzeige im UI
 * - patterns: Begriffe, die in key oder label vorkommen können
 */
const CONTACT_SLOTS: ContactSlotConfig[] = [
  {
    id: 'company',
    label: 'Firma / Company',
    patterns: [
      'firma',
      'company',
      'unternehmen',
      'organisation',
      'societe',
      'société',
      'company_name',
    ],
  },
  {
    id: 'firstName',
    label: 'Vorname / First Name',
    patterns: [
      'vorname',
      'firstname',
      'first_name',
      'first name',
      'prenom',
      'prénom',
      'givenname',
      'given_name',
    ],
  },
  {
    id: 'lastName',
    label: 'Nachname / Last Name',
    patterns: [
      'nachname',
      'lastname',
      'last_name',
      'surname',
      'familyname',
      'family_name',
    ],
  },
  {
    id: 'phone',
    label: 'Telefon / Phone',
    patterns: [
      'telefon',
      'phone',
      'tel',
      'mobile',
      'handy',
      'phone_number',
      'telefonnummer',
    ],
  },
  {
    id: 'email',
    label: 'E-Mail',
    patterns: ['email', 'e-mail', 'mail', 'mailadresse', 'mail_address'],
  },
  {
    id: 'notes',
    label: 'Notizen / Comments',
    patterns: [
      'notizen',
      'notes',
      'bemerkungen',
      'comments',
      'comment',
      'kommentar',
    ],
  },
];

function normalizeText(value?: string | null): string {
  if (!value) return '';
  return value.toString().trim().toLowerCase();
}

/**
 * Versucht, ein Feld einem Kontakt-Slot zuzuordnen:
 * - nutzt key und label
 * - pattern-Match: wenn ein pattern in key oder label vorkommt
 */
function findContactSlotForField(field: TabletPreviewField): ContactSlotId | null {
  const keyNorm = normalizeText(field.key);
  const labelNorm = normalizeText(field.label);

  if (!keyNorm && !labelNorm) return null;

  for (const slot of CONTACT_SLOTS) {
    const matchInKey = slot.patterns.some((p) => keyNorm.includes(p));
    const matchInLabel = slot.patterns.some((p) => labelNorm.includes(p));
    if (matchInKey || matchInLabel) {
      return slot.id;
    }
  }

  return null;
}

interface FormPreviewTabletLayoutProps {
  fields: TabletPreviewField[];
  activeFieldId: string | number | null;
  onFieldClick: (fieldId: string | number) => void;
}

/**
 * Tablet-Vorschau:
 * - Links: dynamische Formularfelder (alle, die nicht als Kontaktfeld erkannt werden)
 * - Rechts: Kontakt-/OCR-Block mit erkannten Feldern in fester Slot-Reihenfolge
 */
export default function FormPreviewTabletLayout({
  fields,
  activeFieldId,
  onFieldClick,
}: FormPreviewTabletLayoutProps) {
  const { mainFields, contactFields, hasAnyField } = React.useMemo(() => {
    const main: TabletPreviewField[] = [];
    const contact: ContactFieldMap = {};

    if (Array.isArray(fields) && fields.length > 0) {
      for (const field of fields) {
        const slot = findContactSlotForField(field);
        if (slot && !contact[slot]) {
          // Erstes passende Feld pro Slot gewinnt
          contact[slot] = field;
        } else {
          main.push(field);
        }
      }
    }

    return {
      mainFields: main,
      contactFields: contact,
      hasAnyField: Array.isArray(fields) && fields.length > 0,
    };
  }, [fields]);

  const hasMainFields = mainFields.length > 0;
  const hasContactFields = Object.values(contactFields).some(Boolean);

  return (
    <div className="flex justify-center">
      <div className="w-full max-w-3xl rounded-[32px] bg-slate-900/90 p-3 shadow-2xl">
        {/* Tablet-Notch / Kamera */}
        <div className="mb-2 flex justify-center">
          <div className="h-1.5 w-16 rounded-full bg-slate-700" />
        </div>

        {/* "Screen" */}
        <div className="rounded-2xl bg-slate-100 p-3 md:p-4">
          {/* Top-Bar im Tablet */}
          <div className="mb-3 flex items-center justify-between gap-2 text-[11px] text-slate-500">
            <span className="rounded-full bg-slate-900 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-100">
              Tablet
            </span>
            <span className="truncate">
              Lead-Erfassung – Vorschau (nicht final)
            </span>
          </div>

          {/* Zweispaltiges Layout */}
          <div className="grid gap-3 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] md:gap-4">
            {/* Linke Spalte – dynamische Felder */}
            <div className="space-y-2">
              <div className="rounded-xl bg-white/80 p-2.5 md:p-3 shadow-sm">
                <h3 className="text-xs font-semibold text-slate-700">
                  Dynamische Felder
                </h3>

                {!hasAnyField && (
                  <p className="mt-2 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-3 py-4 text-xs text-slate-500">
                    Für dieses Formular sind noch keine Felder definiert. Lege
                    links Felder an, um sie hier in der Tablet-Vorschau zu
                    sehen.
                  </p>
                )}

                {hasAnyField && !hasMainFields && (
                  <p className="mt-2 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-3 py-4 text-xs text-slate-500">
                    Alle erkannten Felder sind aktuell Teil des Kontakt-/OCR-Blocks
                    rechts. Du kannst weitere Felder anlegen, um sie hier zu
                    sehen.
                  </p>
                )}

                {hasMainFields && (
                  <div className="mt-2 space-y-2">
                    {mainFields.map((field) => {
                      const isActive =
                        activeFieldId != null &&
                        String(activeFieldId) === String(field.id);
                      const muted = field.isActive === false;

                      const base =
                        'rounded-xl border px-3 py-2 md:px-3.5 md:py-2.5 text-xs md:text-sm cursor-pointer transition-colors';
                      const palette = isActive
                        ? 'border-sky-500 bg-sky-50 ring-1 ring-sky-200'
                        : 'border-slate-200 bg-white hover:border-sky-300 hover:bg-slate-50';
                      const opacity = muted ? ' opacity-60' : '';

                      return (
                        <button
                          key={String(field.id)}
                          type="button"
                          onClick={() => onFieldClick(field.id)}
                          className={base + ' ' + palette + opacity}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex flex-col text-left">
                              <span className="truncate text-[13px] font-medium text-slate-900">
                                {field.label ??
                                  field.key ??
                                  'Unbenanntes Feld'}
                              </span>
                              <span className="mt-0.5 text-[11px] text-slate-500">
                                {field.placeholder ||
                                  (field.type
                                    ? `(${String(field.type).toLowerCase()})`
                                    : '(Textfeld)')}
                              </span>
                            </div>
                            {field.required && (
                              <span className="ml-2 text-xs font-semibold text-rose-600">
                                *
                              </span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Rechte Spalte – Kontakt-/OCR-Block */}
            <div className="space-y-2">
              <div className="rounded-xl bg-white/80 p-2.5 md:p-3 shadow-sm">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-xs font-semibold text-slate-700">
                    Kontakt / OCR-Block
                  </h3>
                  {!hasContactFields && hasAnyField && (
                    <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-800">
                      Kein Kontaktfeld erkannt
                    </span>
                  )}
                </div>

                <p className="mt-1 text-[11px] text-slate-500">
                  Erkannte Kontaktfelder aus deinem Formular. Zuordnung erfolgt
                  über Feld-Keys/-Labels (z. B. &quot;firma&quot;,
                  &quot;vorname&quot;, &quot;email&quot;).
                </p>

                {!hasAnyField && (
                  <p className="mt-2 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-3 py-3 text-xs text-slate-500">
                    Lege zuerst Felder im Formular an, um Kontaktfelder erkennen
                    zu können.
                  </p>
                )}

                {hasAnyField && !hasContactFields && (
                  <p className="mt-2 rounded-xl border border-dashed border-amber-200 bg-amber-50 px-3 py-3 text-[11px] text-amber-800">
                    Aktuell wurden keine typischen Kontaktfelder gefunden. Prüfe
                    die Feld-Keys/-Labels (z. B. &quot;firma&quot;,
                    &quot;vorname&quot;, &quot;nachname&quot;, &quot;email&quot;,
                    &quot;telefon&quot;, &quot;notizen&quot;), damit sie hier
                    erscheinen.
                  </p>
                )}

                <div className="mt-2 space-y-2">
                  {CONTACT_SLOTS.map((slot) => {
                    const field = contactFields[slot.id];
                    const isActive =
                      field &&
                      activeFieldId != null &&
                      String(activeFieldId) === String(field.id);
                    const muted = field && field.isActive === false;

                    const base =
                      'rounded-xl border px-3 py-2.5 md:px-3.5 md:py-3 text-xs md:text-sm';
                    const clickable = field
                      ? 'cursor-pointer'
                      : 'cursor-default';
                    const palette = field
                      ? isActive
                        ? 'border-sky-500 bg-sky-50 ring-1 ring-sky-200'
                        : 'border-slate-200 bg-white hover:border-sky-300 hover:bg-slate-50'
                      : 'border-slate-200 bg-slate-50 border-dashed';
                    const opacity = muted ? ' opacity-60' : '';

                    if (field) {
                      return (
                        <button
                          key={slot.id}
                          type="button"
                          onClick={() => onFieldClick(field.id)}
                          className={base + ' ' + clickable + ' ' + palette + opacity}
                        >
                          <div className="flex flex-col text-left">
                            <div className="flex items-center gap-2">
                              <span className="text-[11px] font-medium text-slate-500">
                                {slot.label}
                              </span>
                              {field.required && (
                                <span className="text-xs font-semibold text-rose-600">
                                  *
                                </span>
                              )}
                            </div>
                            <span className="mt-0.5 truncate text-[13px] font-medium text-slate-900">
                              {field.label ??
                                field.key ??
                                'Unbenanntes Feld'}
                            </span>
                            <span className="mt-0.5 text-[11px] text-slate-500">
                              {field.placeholder ||
                                (field.type
                                  ? `(${String(field.type).toLowerCase()})`
                                  : '(Textfeld)')}
                            </span>
                          </div>
                        </button>
                      );
                    }

                    // Placeholder, falls kein Feld diesem Slot zugeordnet ist
                    return (
                      <div
                        key={slot.id}
                        className={base + ' ' + clickable + ' ' + palette + opacity}
                      >
                        <div className="flex flex-col text-left">
                          <span className="text-[11px] font-medium text-slate-500">
                            {slot.label}
                          </span>
                          <span className="mt-1 text-[11px] text-slate-400">
                            Kein entsprechendes Feld im Formular zugeordnet.
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Optionaler Fußbereich / Hinweis */}
          <div className="mt-3 text-[10px] text-slate-500">
            Diese Ansicht ist eine grobe Annäherung an das Tablet-Layout. Das
            finale App-Design kann leicht abweichen.
          </div>
        </div>

        {/* Home-Indikator unten */}
        <div className="mt-2 flex justify-center">
          <div className="h-1 w-20 rounded-full bg-slate-700/80" />
        </div>
      </div>
    </div>
  );
}
