'use client';

import * as React from 'react';
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  closestCenter,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';

import FormPreviewTabletLayout from './FormPreviewTabletLayout';
import { FieldOptionsEditor } from './FieldOptionsEditor';
import type { ContactSlotKey, ContactSlotsConfig } from '@/lib/types/forms';
import { DEFAULT_FORM_THEME, normalizeTheme } from '@/lib/formTheme';

type FieldId = string | number;

type FormLike = {
  id?: number | string;
  name?: string | null;
  title?: string | null;
  description?: string | null;
  status?: string | null;
  state?: string | null;
  config?: unknown | null;
  [key: string]: any;
};

type FormFieldLike = {
  id: FieldId;
  key?: string;
  label?: string | null;
  type?: string | null;
  order?: number | null;
  isActive?: boolean;
  placeholder?: string | null;
  helpText?: string | null;
  required?: boolean | null;
  config?: unknown | null;
  [key: string]: any;
};

interface FormBuilderWorkspaceProps {
  form?: FormLike;
  fields?: FormFieldLike[];
  initialForm?: FormLike;
  initialFields?: FormFieldLike[];
}

type InspectorTab = 'field' | 'contact' | 'design';

const CONTACT_SLOTS: Array<{ key: ContactSlotKey; label: string }> = [
  { key: 'company', label: 'Firma' },
  { key: 'firstName', label: 'Vorname' },
  { key: 'lastName', label: 'Nachname' },
  { key: 'phone', label: 'Telefon' },
  { key: 'email', label: 'E-Mail' },
  { key: 'notes', label: 'Notizen' },
];

type ThemeDraft = {
  background: string;
  surface: string;
  primary: string;
  text: string;
  muted: string;
  border: string;
  fontFamily: string;
  logoUrl: string; // bewusst immer string fürs Input ("" = kein Logo)
};

const THEME_COLOR_FIELDS: Array<{
  key: keyof Pick<ThemeDraft, 'background' | 'surface' | 'primary' | 'text' | 'muted' | 'border'>;
  label: string;
  hint: string;
}> = [
  { key: 'background', label: 'Hintergrund', hint: 'App Background' },
  { key: 'surface', label: 'Surface', hint: 'Panels / Cards' },
  { key: 'primary', label: 'Primary', hint: 'Buttons / Highlights' },
  { key: 'text', label: 'Text', hint: 'Primärtext' },
  { key: 'muted', label: 'Muted', hint: 'Secondary / Hint Text' },
  { key: 'border', label: 'Border', hint: 'Linien / Trennungen' },
];

const FONT_FAMILY_OPTIONS = [
  { value: 'System', label: 'System' },
  { value: 'Inter', label: 'Inter' },
  { value: 'Roboto', label: 'Roboto' },
  { value: 'Oxygen', label: 'Oxygen' },
  { value: 'Arial', label: 'Arial' },
];

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function getStringProp(obj: Record<string, unknown>, key: string): string | null {
  const v = obj[key];
  return typeof v === 'string' ? v : null;
}

function extractPresetId(data: unknown): number | null {
  if (!isPlainObject(data)) return null;

  const direct = data.id;
  if (typeof direct === 'number' && Number.isFinite(direct)) return direct;

  const preset = data.preset;
  if (isPlainObject(preset)) {
    const pid = preset.id;
    if (typeof pid === 'number' && Number.isFinite(pid)) return pid;
  }

  return null;
}

function normalizeContactSlots(raw: unknown): ContactSlotsConfig {
  if (!isPlainObject(raw)) return {};
  const out: ContactSlotsConfig = {};
  for (const [k, v] of Object.entries(raw)) {
    if (v === null) {
      (out as any)[k] = null;
      continue;
    }
    if (typeof v === 'number' && Number.isFinite(v)) {
      (out as any)[k] = v;
      continue;
    }
    if (typeof v === 'string') {
      const trimmed = v.trim();
      if (/^\d+$/.test(trimmed)) {
        (out as any)[k] = Number.parseInt(trimmed, 10);
      }
    }
  }
  return out;
}

function shallowEqualContactSlots(a: ContactSlotsConfig, b: ContactSlotsConfig): boolean {
  const keys = new Set([...Object.keys(a ?? {}), ...Object.keys(b ?? {})]);
  for (const k of keys) {
    if ((a as any)[k] !== (b as any)[k]) return false;
  }
  return true;
}

/**
 * Eingehende Roh-Felder in ein konsistentes Shape bringen.
 */
function normalizeFields(fieldsInput: unknown): FormFieldLike[] {
  if (!Array.isArray(fieldsInput)) return [];
  return fieldsInput.map((raw, index) => {
    const f = raw as any;
    const id: FieldId = (f?.id ?? index) as FieldId;
    const label: string = f?.label ?? f?.name ?? f?.key ?? `Feld ${index + 1}`;
    const type: string = f?.type ?? f?.fieldType ?? 'text';
    const order: number | null = typeof f?.order === 'number' ? f.order : null;
    const isActive: boolean =
      typeof f?.isActive === 'boolean'
        ? f.isActive
        : typeof f?.active === 'boolean'
        ? f.active
        : true;

    return {
      ...f,
      id,
      label,
      type,
      order,
      isActive,
    };
  });
}

/**
 * Sortierung der Felder anhand von order (Fallback: id).
 */
function sortFields(fields: FormFieldLike[]): FormFieldLike[] {
  const withIndex = fields.map((f, index) => ({ f, index }));
  return withIndex
    .sort((a, b) => {
      const ao =
        typeof a.f.order === 'number'
          ? (a.f.order as number)
          : Number.MAX_SAFE_INTEGER;
      const bo =
        typeof b.f.order === 'number'
          ? (b.f.order as number)
          : Number.MAX_SAFE_INTEGER;

      if (ao !== bo) return ao - bo;

      const aid =
        typeof a.f.id === 'number'
          ? (a.f.id as number)
          : typeof a.f.id === 'string'
          ? Number.parseInt(a.f.id as string, 10) || 0
          : 0;
      const bid =
        typeof b.f.id === 'number'
          ? (b.f.id as number)
          : typeof b.f.id === 'string'
          ? Number.parseInt(b.f.id as string, 10) || 0
          : 0;

      if (aid !== bid) return aid - bid;
      return a.index - b.index;
    })
    .map(({ f }) => f);
}

/**
 * Plain List Item (ohne dnd-kit) – wird für SSR + ersten Client-Render verwendet,
 * um Hydration-Mismatch zu vermeiden.
 */
function PlainFieldListItem(props: {
  field: FormFieldLike;
  isActive: boolean;
  onClick: () => void;
}) {
  const { field, isActive, onClick } = props;

  const baseClasses =
    'group mb-2 flex items-center justify-between rounded-md border px-3 py-2 text-xs md:text-sm shadow-sm';
  let className =
    baseClasses +
    ' bg-white border-slate-200 text-slate-800 hover:border-sky-300 hover:bg-slate-50';

  if (isActive) {
    className =
      baseClasses +
      ' border-sky-500 bg-sky-50 text-slate-900 ring-1 ring-sky-200';
  }

  if (field.isActive === false) {
    className += ' opacity-60';
  }

  return (
    <div className={className}>
      <button type="button" className="flex flex-1 flex-col text-left" onClick={onClick}>
        <div className="flex items-center gap-2">
          <span className="truncate font-medium">
            {field.label ?? field.key ?? 'Unbenanntes Feld'}
          </span>
          {field.required && (
            <span className="text-xs font-semibold text-rose-600">*</span>
          )}
        </div>
        <div className="mt-0.5 flex items-center gap-2 text-[11px] text-slate-500">
          <span className="uppercase tracking-wide">{field.type ?? 'text'}</span>
          {field.key && (
            <span className="truncate text-slate-400">({field.key})</span>
          )}
        </div>
      </button>

      {/* Drag-Handle (disabled hint) */}
      <span
        className="ml-2 select-none text-slate-200"
        aria-label="Feld verschieben (lädt)"
        title="Drag & Drop wird geladen…"
      >
        ⠿
      </span>
    </div>
  );
}

/**
 * Sortable Item – nur nach Mount rendern (sonst Hydration-Mismatch möglich).
 */
function SortableFieldListItem(props: {
  field: FormFieldLike;
  isActive: boolean;
  onClick: () => void;
}) {
  const { field, isActive, onClick } = props;

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: field.id });

  const style: React.CSSProperties = {
    transform: transform
      ? `translate3d(${transform.x}px, ${transform.y}px, 0)`
      : undefined,
    transition,
  };

  const baseClasses =
    'group mb-2 flex items-center justify-between rounded-md border px-3 py-2 text-xs md:text-sm shadow-sm';
  let className =
    baseClasses +
    ' bg-white border-slate-200 text-slate-800 hover:border-sky-300 hover:bg-slate-50';

  if (isActive) {
    className =
      baseClasses +
      ' border-sky-500 bg-sky-50 text-slate-900 ring-1 ring-sky-200';
  }

  if (field.isActive === false) {
    className += ' opacity-60';
  }

  if (isDragging) {
    className += ' z-10 ring-2 ring-sky-400';
  }

  return (
    <div ref={setNodeRef} style={style} className={className}>
      <button type="button" className="flex flex-1 flex-col text-left" onClick={onClick}>
        <div className="flex items-center gap-2">
          <span className="truncate font-medium">
            {field.label ?? field.key ?? 'Unbenanntes Feld'}
          </span>
          {field.required && (
            <span className="text-xs font-semibold text-rose-600">*</span>
          )}
        </div>
        <div className="mt-0.5 flex items-center gap-2 text-[11px] text-slate-500">
          <span className="uppercase tracking-wide">{field.type ?? 'text'}</span>
          {field.key && (
            <span className="truncate text-slate-400">({field.key})</span>
          )}
        </div>
      </button>

      {/* Drag-Handle */}
      <button
        type="button"
        className="ml-2 cursor-grab text-slate-300 hover:text-slate-500"
        aria-label="Feld verschieben"
        {...attributes}
        {...listeners}
      >
        ⠿
      </button>
    </div>
  );
}

function isValidHexColor(value: string): boolean {
  const t = (value ?? '').trim();
  if (!t) return false;
  const s = t.startsWith('#') ? t.slice(1) : t;
  return /^[0-9a-fA-F]{3}$/.test(s) || /^[0-9a-fA-F]{6}$/.test(s) || /^[0-9a-fA-F]{8}$/.test(s);
}

function normalizeHex(value: string): string {
  const t = (value ?? '').trim();
  const withHash = t.startsWith('#') ? t : `#${t}`;
  return withHash.toLowerCase();
}

function toColorPickerValue(value: string, fallback: string): string {
  const v = (value ?? '').trim();
  const f = (fallback ?? '#000000').trim();

  const pick = (input: string): string | null => {
    if (!isValidHexColor(input)) return null;
    const n = normalizeHex(input);
    // Color input kann kein Alpha: #rrggbbaa -> #rrggbb
    if (n.length === 9) return n.slice(0, 7);
    // #rgb -> #rrggbb
    if (n.length === 4) {
      const r = n[1];
      const g = n[2];
      const b = n[3];
      return `#${r}${r}${g}${g}${b}${b}`;
    }
    return n;
  };

  return pick(v) ?? pick(f) ?? '#000000';
}

function shallowEqualThemeDraft(a: ThemeDraft, b: ThemeDraft): boolean {
  const keys: Array<keyof ThemeDraft> = [
    'background',
    'surface',
    'primary',
    'text',
    'muted',
    'border',
    'fontFamily',
    'logoUrl',
  ];
  for (const k of keys) {
    if ((a[k] ?? '').toString() !== (b[k] ?? '').toString()) return false;
  }
  return true;
}

export default function FormBuilderWorkspace(props: FormBuilderWorkspaceProps) {
  const form: FormLike = props.form ?? props.initialForm ?? {};

  // Client-Mount Flag (Fix für dnd-kit Hydration-Mismatch)
  const [isMounted, setIsMounted] = React.useState(false);
  React.useEffect(() => {
    setIsMounted(true);
  }, []);

  const initialFields = React.useMemo(
    () => normalizeFields(props.fields ?? props.initialFields ?? []),
    [props.fields, props.initialFields],
  );

  const [fieldsState, setFieldsState] = React.useState<FormFieldLike[]>(initialFields);
  const [activeFieldId, setActiveFieldId] = React.useState<FieldId | null>(
    initialFields[0]?.id ?? null,
  );

  const [inspectorTab, setInspectorTab] = React.useState<InspectorTab>('field');

  const [isOrderDirty, setIsOrderDirty] = React.useState(false);
  const [isSavingOrder, setIsSavingOrder] = React.useState(false);
  const [orderSaveError, setOrderSaveError] = React.useState<string | null>(null);
  const [orderSaveSuccess, setOrderSaveSuccess] = React.useState(false);

  const [draftField, setDraftField] = React.useState<FormFieldLike | null>(null);
  const [isDraftDirty, setIsDraftDirty] = React.useState(false);
  const [isSavingField, setIsSavingField] = React.useState(false);
  const [fieldSaveError, setFieldSaveError] = React.useState<string | null>(null);
  const [fieldSaveSuccess, setFieldSaveSuccess] = React.useState(false);

  // Kontaktblock Slot-Mapping (Teilprojekt 2.17)
  const initialContactSlots = React.useMemo(() => {
    const cfg = form?.config;
    if (!isPlainObject(cfg)) return {} as ContactSlotsConfig;
    const slots = (cfg as any).contactSlots;
    return normalizeContactSlots(slots);
  }, [form?.config]);

  const [contactSlotsDraft, setContactSlotsDraft] =
    React.useState<ContactSlotsConfig>(initialContactSlots);
  const [contactSlotsBaseline, setContactSlotsBaseline] =
    React.useState<ContactSlotsConfig>(initialContactSlots);

  const [isContactDirty, setIsContactDirty] = React.useState(false);
  const [isSavingContact, setIsSavingContact] = React.useState(false);
  const [contactSaveError, setContactSaveError] = React.useState<string | null>(null);
  const [contactSaveSuccess, setContactSaveSuccess] = React.useState(false);

  // Theme / Branding (Teilprojekt 2.18)
  const initialThemeDraft = React.useMemo<ThemeDraft>(() => {
    const cfg = form?.config;
    const rawTheme =
      isPlainObject(cfg) && (cfg as any).theme ? (cfg as any).theme : undefined;

    const n = normalizeTheme(rawTheme);

    return {
      background: n.background,
      surface: n.surface,
      primary: n.primary,
      text: n.text,
      muted: n.muted,
      border: n.border,
      fontFamily: n.fontFamily,
      logoUrl: n.logoUrl ?? '',
    };
  }, [form?.config]);

  const [themeDraft, setThemeDraft] = React.useState<ThemeDraft>(initialThemeDraft);
  const [themeBaseline, setThemeBaseline] = React.useState<ThemeDraft>(initialThemeDraft);

  const [isThemeDirty, setIsThemeDirty] = React.useState(false);
  const [isSavingTheme, setIsSavingTheme] = React.useState(false);
  const [themeSaveError, setThemeSaveError] = React.useState<string | null>(null);
  const [themeSaveSuccess, setThemeSaveSuccess] = React.useState(false);

  const themeHasInvalidHex = React.useMemo(() => {
    for (const f of THEME_COLOR_FIELDS) {
      if (!isValidHexColor(themeDraft[f.key])) return true;
    }
    return false;
  }, [themeDraft]);

  // ---------------------------------------------------------------------------
  // Preset Dialog (Teilprojekt 2.19)
  // ---------------------------------------------------------------------------
  const [isPresetDialogOpen, setIsPresetDialogOpen] = React.useState(false);
  const [presetName, setPresetName] = React.useState('');
  const [presetCategory, setPresetCategory] = React.useState('');
  const [presetDescription, setPresetDescription] = React.useState('');
  const [isSavingPreset, setIsSavingPreset] = React.useState(false);
  const [presetSaveError, setPresetSaveError] = React.useState<string | null>(null);
  const [presetToast, setPresetToast] = React.useState<string | null>(null);

  function getCurrentFormName(): string {
    return (
      form?.name ??
      form?.title ??
      (form?.id ? `Formular #${form.id}` : 'Form')
    );
  }

  function openPresetDialog() {
    setPresetName(getCurrentFormName());
    setPresetCategory('');
    setPresetDescription('');
    setPresetSaveError(null);
    setIsPresetDialogOpen(true);
  }

  function closePresetDialog() {
    setIsPresetDialogOpen(false);
    setPresetSaveError(null);
  }

  async function handleSaveAsPreset() {
    const name = (presetName ?? '').trim();
    const category = (presetCategory ?? '').trim();
    const description = (presetDescription ?? '').trim();

    const rawFormId = form?.id;
    const formIdNum = Number.parseInt(String(rawFormId ?? ''), 10);

    if (!Number.isFinite(formIdNum) || formIdNum <= 0) {
      setPresetSaveError('Ungültige Form-ID – bitte Seite neu laden.');
      return;
    }

    if (name.length === 0) {
      setPresetSaveError('Name ist Pflicht.');
      return;
    }

    if (category.length === 0) {
      setPresetSaveError('Kategorie ist Pflicht.');
      return;
    }

    setIsSavingPreset(true);
    setPresetSaveError(null);

    try {
      const res = await fetch('/api/admin/form-presets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': '1',
        },
        body: JSON.stringify({
          formId: formIdNum,
          name,
          category,
          ...(description.length > 0 ? { description } : {}),
        }),
      });

      const data: unknown = await res.json().catch(() => ({}));

      if (!res.ok) {
        let msg = `Fehler beim Speichern der Vorlage (Status ${res.status}).`;
        if (isPlainObject(data)) {
          msg = getStringProp(data, 'error') ?? msg;
        }
        setPresetSaveError(msg);
        setIsSavingPreset(false);
        return;
      }

      const newPresetId = extractPresetId(data);

      setIsSavingPreset(false);
      closePresetDialog();

      const toast = newPresetId
        ? `Vorlage gespeichert (ID ${newPresetId}).`
        : 'Vorlage gespeichert.';
      setPresetToast(toast);
      window.setTimeout(() => setPresetToast(null), 2500);
    } catch (err) {
      console.error(err);
      setPresetSaveError(
        (err as Error).message ?? 'Unbekannter Fehler beim Speichern der Vorlage.',
      );
      setIsSavingPreset(false);
    }
  }

  // Server-Felder synchronisieren
  React.useEffect(() => {
    setFieldsState(normalizeFields(props.fields ?? props.initialFields ?? []));
    setIsOrderDirty(false);
  }, [props.fields, props.initialFields]);

  // Kontakt-Slots synchronisieren, wenn Form wechselt / neu geladen wird
  React.useEffect(() => {
    setContactSlotsDraft(initialContactSlots);
    setContactSlotsBaseline(initialContactSlots);
    setIsContactDirty(false);
    setContactSaveError(null);
    setContactSaveSuccess(false);
  }, [initialContactSlots]);

  // Theme synchronisieren, wenn Form wechselt / neu geladen wird
  React.useEffect(() => {
    setThemeDraft(initialThemeDraft);
    setThemeBaseline(initialThemeDraft);
    setIsThemeDirty(false);
    setThemeSaveError(null);
    setThemeSaveSuccess(false);
  }, [initialThemeDraft]);

  const sortedFields = React.useMemo(() => sortFields(fieldsState), [fieldsState]);

  // Aktives Feld sicherstellen
  React.useEffect(() => {
    if (
      sortedFields.length === 0 ||
      (activeFieldId != null && sortedFields.some((f) => f.id === activeFieldId))
    ) {
      return;
    }
    setActiveFieldId(sortedFields[0].id);
  }, [sortedFields, activeFieldId]);

  const activeField: FormFieldLike | null =
    activeFieldId != null
      ? sortedFields.find((f) => f.id === activeFieldId) ?? null
      : null;

  // Draft mit aktivem Feld synchronisieren
  React.useEffect(() => {
    if (!activeField) {
      setDraftField(null);
      setIsDraftDirty(false);
      return;
    }

    setDraftField({ ...activeField });
    setIsDraftDirty(false);
  }, [activeFieldId, activeField]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    }),
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    setFieldsState((prev) => {
      const sortedPrev = sortFields(prev);
      const oldIndex = sortedPrev.findIndex((f) => f.id === active.id);
      const newIndex = sortedPrev.findIndex((f) => f.id === over.id);

      if (oldIndex === -1 || newIndex === -1) return prev;

      const reordered = arrayMove(sortedPrev, oldIndex, newIndex);
      const withNewOrder = reordered.map((field, index) => ({
        ...field,
        order: index + 1,
      }));

      setIsOrderDirty(true);
      return withNewOrder;
    });
  }

  function handleDraftChange<K extends keyof FormFieldLike>(key: K, value: FormFieldLike[K]) {
    setDraftField((prev) => {
      if (!prev) return prev;
      return { ...prev, [key]: value };
    });
    setIsDraftDirty(true);
    setFieldSaveError(null);
    setFieldSaveSuccess(false);
  }

  async function handleSaveFieldDetails() {
    if (!draftField || !form?.id) return;

    setIsSavingField(true);
    setFieldSaveError(null);
    setFieldSaveSuccess(false);

    try {
      const formId = encodeURIComponent(String(form.id));
      const fieldId = encodeURIComponent(String(draftField.id));

      const payload = {
        label: draftField.label ?? '',
        placeholder: draftField.placeholder === '' ? null : draftField.placeholder ?? null,
        helpText: draftField.helpText === '' ? null : draftField.helpText ?? null,
        required: !!draftField.required,
        isActive: draftField.isActive !== false,
      };

      const res = await fetch(`/api/admin/forms/${formId}/fields/${fieldId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': '1',
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error(
          `Fehler beim Speichern der Feldeigenschaften (Status ${res.status})`,
        );
      }

      setFieldsState((prev) =>
        prev.map((f) => (f.id === draftField.id ? { ...f, ...draftField } : f)),
      );

      setIsDraftDirty(false);
      setFieldSaveSuccess(true);
      setTimeout(() => setFieldSaveSuccess(false), 2000);
    } catch (err) {
      console.error(err);
      setFieldSaveError(
        (err as Error).message ?? 'Unbekannter Fehler beim Speichern der Feldeigenschaften.',
      );
    } finally {
      setIsSavingField(false);
    }
  }

  async function handleSaveOrder() {
    if (!form?.id || !isOrderDirty || fieldsState.length === 0) return;

    setIsSavingOrder(true);
    setOrderSaveError(null);
    setOrderSaveSuccess(false);

    try {
      const formId = encodeURIComponent(String(form.id));
      const sorted = sortFields(fieldsState);

      const updates = sorted.map((field, index) => ({
        fieldId: field.id,
        order: index + 1,
      }));

      await Promise.all(
        updates.map(async ({ fieldId, order }) => {
          const res = await fetch(
            `/api/admin/forms/${formId}/fields/${encodeURIComponent(String(fieldId))}`,
            {
              method: 'PATCH',
              headers: {
                'Content-Type': 'application/json',
                'x-user-id': '1',
              },
              body: JSON.stringify({ order }),
            },
          );

          if (!res.ok) {
            throw new Error(
              `Fehler beim Aktualisieren der Reihenfolge (Status ${res.status})`,
            );
          }
        }),
      );

      setFieldsState(
        sorted.map((field, index) => ({
          ...field,
          order: index + 1,
        })),
      );

      setIsOrderDirty(false);
      setOrderSaveSuccess(true);
      setTimeout(() => setOrderSaveSuccess(false), 2000);
    } catch (err) {
      console.error(err);
      setOrderSaveError(
        (err as Error).message ?? 'Unbekannter Fehler beim Speichern der Reihenfolge.',
      );
    } finally {
      setIsSavingOrder(false);
    }
  }

  function setContactSlotValue(slotKey: ContactSlotKey, value: number | null | undefined) {
    setContactSlotsDraft((prev) => {
      const next = { ...prev } as any;

      if (typeof value === 'undefined') {
        delete next[slotKey];
      } else {
        next[slotKey] = value;
      }

      return next as ContactSlotsConfig;
    });

    setContactSaveError(null);
    setContactSaveSuccess(false);
    setIsContactDirty(true);
  }

  function recomputeContactDirty(nextDraft: ContactSlotsConfig) {
    const equal = shallowEqualContactSlots(nextDraft, contactSlotsBaseline);
    setIsContactDirty(!equal);
  }

  React.useEffect(() => {
    recomputeContactDirty(contactSlotsDraft);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contactSlotsDraft]);

  async function handleSaveContactSlots() {
    if (!form?.id) return;

    setIsSavingContact(true);
    setContactSaveError(null);
    setContactSaveSuccess(false);

    try {
      const formId = encodeURIComponent(String(form.id));

      const payloadSlots: Record<string, number | null> = {};
      for (const { key } of CONTACT_SLOTS) {
        const v = (contactSlotsDraft as any)[key] as number | null | undefined;
        if (typeof v === 'undefined') continue;
        payloadSlots[key] = v;
      }

      const res = await fetch(`/api/admin/forms/${formId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': '1',
        },
        body: JSON.stringify({
          config: {
            contactSlots: payloadSlots,
          },
        }),
      });

      if (!res.ok) {
        const txt = await res.text().catch(() => '');
        throw new Error(
          `Fehler beim Speichern des Kontaktblock-Mappings (Status ${res.status}) ${txt}`,
        );
      }

      setContactSlotsBaseline(contactSlotsDraft);
      setIsContactDirty(false);

      setContactSaveSuccess(true);
      setTimeout(() => setContactSaveSuccess(false), 2000);
    } catch (err) {
      console.error(err);
      setContactSaveError(
        (err as Error).message ?? 'Unbekannter Fehler beim Speichern des Kontaktblock-Mappings.',
      );
    } finally {
      setIsSavingContact(false);
    }
  }

  function recomputeThemeDirty(nextDraft: ThemeDraft) {
    const equal = shallowEqualThemeDraft(nextDraft, themeBaseline);
    setIsThemeDirty(!equal);
  }

  React.useEffect(() => {
    recomputeThemeDirty(themeDraft);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [themeDraft]);

  function setThemeValue<K extends keyof ThemeDraft>(key: K, value: ThemeDraft[K]) {
    setThemeDraft((prev) => ({ ...prev, [key]: value }));
    setThemeSaveError(null);
    setThemeSaveSuccess(false);
    setIsThemeDirty(true);
  }

  function resetThemeToDefault() {
    setThemeDraft({
      background: DEFAULT_FORM_THEME.background,
      surface: DEFAULT_FORM_THEME.surface,
      primary: DEFAULT_FORM_THEME.primary,
      text: DEFAULT_FORM_THEME.text,
      muted: DEFAULT_FORM_THEME.muted,
      border: DEFAULT_FORM_THEME.border,
      fontFamily: DEFAULT_FORM_THEME.fontFamily,
      logoUrl: '',
    });
    setThemeSaveError(null);
    setThemeSaveSuccess(false);
    setIsThemeDirty(true);
  }

  function isThemeExactlyDefault(draft: ThemeDraft): boolean {
    const d = {
      background: isValidHexColor(draft.background) ? normalizeHex(draft.background) : draft.background,
      surface: isValidHexColor(draft.surface) ? normalizeHex(draft.surface) : draft.surface,
      primary: isValidHexColor(draft.primary) ? normalizeHex(draft.primary) : draft.primary,
      text: isValidHexColor(draft.text) ? normalizeHex(draft.text) : draft.text,
      muted: isValidHexColor(draft.muted) ? normalizeHex(draft.muted) : draft.muted,
      border: isValidHexColor(draft.border) ? normalizeHex(draft.border) : draft.border,
      fontFamily: (draft.fontFamily ?? '').trim(),
      logoUrl: (draft.logoUrl ?? '').trim(),
    };

    return (
      d.background === DEFAULT_FORM_THEME.background &&
      d.surface === DEFAULT_FORM_THEME.surface &&
      d.primary === DEFAULT_FORM_THEME.primary &&
      d.text === DEFAULT_FORM_THEME.text &&
      d.muted === DEFAULT_FORM_THEME.muted &&
      d.border === DEFAULT_FORM_THEME.border &&
      (d.fontFamily || 'System') === DEFAULT_FORM_THEME.fontFamily &&
      d.logoUrl === ''
    );
  }

  async function handleSaveTheme() {
    if (!form?.id) return;

    if (themeHasInvalidHex) {
      setThemeSaveError('Bitte gültige Hex-Farben verwenden (#rgb, #rrggbb oder #rrggbbaa).');
      return;
    }

    setIsSavingTheme(true);
    setThemeSaveError(null);
    setThemeSaveSuccess(false);

    try {
      const formId = encodeURIComponent(String(form.id));

      // Normalisieren (lowercase + führendes #)
      const normalized: ThemeDraft = {
        background: normalizeHex(themeDraft.background),
        surface: normalizeHex(themeDraft.surface),
        primary: normalizeHex(themeDraft.primary),
        text: normalizeHex(themeDraft.text),
        muted: normalizeHex(themeDraft.muted),
        border: normalizeHex(themeDraft.border),
        fontFamily: (themeDraft.fontFamily ?? DEFAULT_FORM_THEME.fontFamily).trim() || DEFAULT_FORM_THEME.fontFamily,
        logoUrl: (themeDraft.logoUrl ?? '').trim(), // "" erlaubt => Logo löschen
      };

      const themePayload = isThemeExactlyDefault(normalized)
        ? null
        : {
            background: normalized.background,
            surface: normalized.surface,
            primary: normalized.primary,
            text: normalized.text,
            muted: normalized.muted,
            border: normalized.border,
            fontFamily: normalized.fontFamily,
            logoUrl: normalized.logoUrl, // kann "" sein
          };

      const res = await fetch(`/api/admin/forms/${formId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': '1',
        },
        body: JSON.stringify({
          config: {
            theme: themePayload,
          },
        }),
      });

      if (!res.ok) {
        const txt = await res.text().catch(() => '');
        throw new Error(`Fehler beim Speichern des Designs (Status ${res.status}) ${txt}`);
      }

      // Baseline aktualisieren
      const newBaseline = themePayload === null
        ? {
            background: DEFAULT_FORM_THEME.background,
            surface: DEFAULT_FORM_THEME.surface,
            primary: DEFAULT_FORM_THEME.primary,
            text: DEFAULT_FORM_THEME.text,
            muted: DEFAULT_FORM_THEME.muted,
            border: DEFAULT_FORM_THEME.border,
            fontFamily: DEFAULT_FORM_THEME.fontFamily,
            logoUrl: '',
          }
        : normalized;

      setThemeDraft(newBaseline);
      setThemeBaseline(newBaseline);
      setIsThemeDirty(false);

      setThemeSaveSuccess(true);
      setTimeout(() => setThemeSaveSuccess(false), 2000);
    } catch (err) {
      console.error(err);
      setThemeSaveError((err as Error).message ?? 'Unbekannter Fehler beim Speichern des Designs.');
    } finally {
      setIsSavingTheme(false);
    }
  }

  const formName =
    form?.name ?? form?.title ?? (form?.id ? `Formular #${form.id}` : 'Form');
  const formDescription = form?.description ?? '';
  const formStatus = form?.status ?? form?.state ?? '';

  return (
    <div className="space-y-6">
      {/* Preset Dialog */}
      {isPresetDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 z-0 bg-black/30"
            onClick={closePresetDialog}
            role="button"
            tabIndex={-1}
            aria-label="Dialog schliessen"
          />
          <div
            className="relative z-10 w-full max-w-lg rounded-lg border border-slate-200 bg-white shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 border-b px-5 py-4">
              <div>
                <div className="text-lg font-semibold">Als Vorlage speichern</div>
                <div className="mt-1 text-sm text-slate-600">
                  Es wird ein Snapshot des aktuellen Formulars (inkl. Fields, Config, Theme) gespeichert.
                </div>
              </div>
              <button
                type="button"
                onClick={closePresetDialog}
                className="rounded-md border border-slate-200 px-2 py-1 text-sm text-slate-700 hover:bg-slate-50"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 px-5 py-4">
              {presetSaveError && (
                <div className="rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                  {presetSaveError}
                </div>
              )}

              <label className="block text-sm font-medium text-slate-800">
                Name <span className="text-rose-600">*</span>
                <input
                  type="text"
                  value={presetName}
                  onChange={(e) => setPresetName(e.target.value)}
                  className="mt-2 w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:border-sky-300"
                  placeholder="z.B. Messe Leads Standard"
                />
              </label>

              <label className="block text-sm font-medium text-slate-800">
                Kategorie <span className="text-rose-600">*</span>
                <input
                  type="text"
                  value={presetCategory}
                  onChange={(e) => setPresetCategory(e.target.value)}
                  className="mt-2 w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:border-sky-300"
                  placeholder="z.B. Standard / Event / Produkte"
                />
              </label>

              <label className="block text-sm font-medium text-slate-800">
                Beschreibung (optional)
                <textarea
                  rows={3}
                  value={presetDescription}
                  onChange={(e) => setPresetDescription(e.target.value)}
                  className="mt-2 w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:border-sky-300"
                  placeholder="Kurzbeschreibung der Vorlage…"
                />
              </label>

              <div className="text-xs text-slate-500">
                Tenant-scope: Vorlage ist nur in deinem Tenant sichtbar.
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t px-5 py-4">
              <button
                type="button"
                onClick={closePresetDialog}
                disabled={isSavingPreset}
                className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 hover:bg-slate-50 disabled:opacity-60"
              >
                Abbrechen
              </button>
              <button
                type="button"
                onClick={() => void handleSaveAsPreset()}
                disabled={isSavingPreset}
                className="rounded-md bg-sky-600 px-3 py-2 text-sm font-medium text-white hover:bg-sky-700 disabled:opacity-60"
              >
                {isSavingPreset ? 'Speichere…' : 'Vorlage speichern'}
              </button>
            </div>
          </div>
        </div>
      )}

      <header className="border-b border-slate-200 pb-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h1 className="text-lg font-semibold text-slate-900">{formName}</h1>
            {formDescription && (
              <p className="mt-1 max-w-2xl text-sm text-slate-600">{formDescription}</p>
            )}
          </div>

          <div className="flex items-center gap-2">
            {formStatus && (
              <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-medium uppercase tracking-wide text-slate-700">
                {formStatus}
              </span>
            )}

            <button
              type="button"
              onClick={openPresetDialog}
              className="inline-flex items-center rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-800 hover:bg-slate-50"
              title="Speichert das Formular als Vorlage (Snapshot)"
            >
              Als Vorlage speichern
            </button>
          </div>
        </div>

        {presetToast && (
          <div className="mt-3 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
            {presetToast}
          </div>
        )}
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(260px,320px)_minmax(0,1fr)]">
        {/* Linke Spalte – Feldliste + Reorder */}
        <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">Feldliste</h2>
              <p className="text-xs text-slate-500">
                Zieh die Felder über das Handle (⠿), um die Reihenfolge zu ändern.
              </p>
              {!isMounted && (
                <p className="mt-1 text-[11px] text-slate-400">
                  Drag &amp; Drop wird geladen…
                </p>
              )}
            </div>
          </div>

          {isOrderDirty && !orderSaveError && !orderSaveSuccess && (
            <p className="mb-3 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800">
              Reihenfolge geändert – noch nicht gespeichert.
            </p>
          )}
          {orderSaveError && (
            <p className="mb-3 rounded-md bg-red-50 px-3 py-2 text-xs text-red-700">
              {orderSaveError}
            </p>
          )}
          {orderSaveSuccess && (
            <p className="mb-3 rounded-md bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
              Reihenfolge gespeichert.
            </p>
          )}

          {/* SSR-safe render: erst nach mount DnD aktivieren */}
          {isMounted ? (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={sortedFields.map((f) => f.id)}
                strategy={verticalListSortingStrategy}
              >
                {sortedFields.map((field) => (
                  <SortableFieldListItem
                    key={String(field.id)}
                    field={field}
                    isActive={activeFieldId === field.id}
                    onClick={() => {
                      setActiveFieldId(field.id);
                      setInspectorTab('field');
                    }}
                  />
                ))}
              </SortableContext>
            </DndContext>
          ) : (
            <>
              {sortedFields.map((field) => (
                <PlainFieldListItem
                  key={String(field.id)}
                  field={field}
                  isActive={activeFieldId === field.id}
                  onClick={() => {
                    setActiveFieldId(field.id);
                    setInspectorTab('field');
                  }}
                />
              ))}
            </>
          )}

          {sortedFields.length === 0 && (
            <p className="mt-2 text-xs text-slate-500">
              Für dieses Formular sind noch keine Felder definiert.
            </p>
          )}

          <div className="mt-4 flex flex-col gap-2 text-xs text-slate-500">
            <button
              type="button"
              onClick={handleSaveOrder}
              disabled={!isOrderDirty || isSavingOrder}
              className={`inline-flex items-center justify-center rounded-md px-3 py-1.5 text-xs font-medium ${
                !isOrderDirty || isSavingOrder
                  ? 'cursor-not-allowed bg-slate-200 text-slate-500'
                  : 'bg-sky-600 text-white hover:bg-sky-700'
              }`}
            >
              {isSavingOrder ? 'Speichere …' : 'Reihenfolge speichern'}
            </button>
            <span>
              Hinweis: Beim Speichern wird die aktuelle Reihenfolge in der Datenbank
              persistiert.
            </span>
          </div>
        </section>

        {/* Rechte Spalte – Tablet-Vorschau + Inspector */}
        <section className="space-y-4">
          <div className="space-y-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h2 className="text-sm font-semibold text-slate-900">Tablet-Vorschau</h2>
                <p className="text-xs text-slate-500">
                  Grobe Annäherung an das spätere Tablet-/App-Layout. Der Kontaktblock
                  (rechts) ist über Slot-Mapping konfigurierbar. Design reagiert live.
                </p>
              </div>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-500">
                Beta
              </span>
            </div>

            <FormPreviewTabletLayout
              fields={sortedFields as any}
              activeFieldId={activeFieldId as any}
              onFieldClick={(id) => {
                setActiveFieldId(id as FieldId);
                setInspectorTab('field');
              }}
              contactSlots={contactSlotsDraft as any}
              theme={themeDraft as any}
            />
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between gap-2">
              <div className="inline-flex rounded-md bg-slate-100 p-1">
                <button
                  type="button"
                  onClick={() => setInspectorTab('field')}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium ${
                    inspectorTab === 'field'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Feld
                </button>
                <button
                  type="button"
                  onClick={() => setInspectorTab('contact')}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium ${
                    inspectorTab === 'contact'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Kontaktblock
                </button>
                <button
                  type="button"
                  onClick={() => setInspectorTab('design')}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium ${
                    inspectorTab === 'design'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Design
                </button>
              </div>

              {inspectorTab === 'contact' && (
                <button
                  type="button"
                  onClick={handleSaveContactSlots}
                  disabled={isSavingContact || !isContactDirty || !form?.id}
                  className={`inline-flex items-center rounded-md px-3 py-1.5 text-xs font-medium ${
                    isSavingContact || !isContactDirty || !form?.id
                      ? 'cursor-not-allowed bg-slate-200 text-slate-500'
                      : 'bg-sky-600 text-white hover:bg-sky-700'
                  }`}
                >
                  {isSavingContact ? 'Speichern …' : 'Kontaktblock speichern'}
                </button>
              )}

              {inspectorTab === 'design' && (
                <button
                  type="button"
                  onClick={handleSaveTheme}
                  disabled={isSavingTheme || !isThemeDirty || !form?.id || themeHasInvalidHex}
                  className={`inline-flex items-center rounded-md px-3 py-1.5 text-xs font-medium ${
                    isSavingTheme || !isThemeDirty || !form?.id || themeHasInvalidHex
                      ? 'cursor-not-allowed bg-slate-200 text-slate-500'
                      : 'bg-sky-600 text-white hover:bg-sky-700'
                  }`}
                >
                  {isSavingTheme ? 'Speichern …' : 'Design speichern'}
                </button>
              )}
            </div>

            {/* Tab: Feld */}
            {inspectorTab === 'field' && (
              <>
                <h2 className="mb-2 text-sm font-semibold text-slate-900">
                  Feldeigenschaften
                </h2>

                {!activeField && (
                  <p className="text-sm text-slate-500">
                    Wähle links ein Feld oder ein Element in der Tablet-Vorschau, um die
                    Eigenschaften zu bearbeiten.
                  </p>
                )}

                {activeField && draftField && (
                  <div className="space-y-3 text-sm">
                    <div className="grid grid-cols-2 gap-3 text-xs text-slate-500">
                      <div>
                        <div className="mb-1 font-medium">Typ</div>
                        <div className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1.5 text-[11px]">
                          {draftField.type ?? 'text'}
                        </div>
                      </div>
                      <div>
                        <div className="mb-1 font-medium">Key</div>
                        <div className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1.5 text-[11px]">
                          {draftField.key ?? '(kein Key)'}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="block text-xs font-medium text-slate-700">
                        Label
                        <input
                          type="text"
                          className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm shadow-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                          value={draftField.label ?? ''}
                          onChange={(e) => handleDraftChange('label', e.target.value)}
                        />
                      </label>

                      <label className="block text-xs font-medium text-slate-700">
                        Placeholder
                        <input
                          type="text"
                          className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm shadow-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                          value={draftField.placeholder ?? ''}
                          onChange={(e) =>
                            handleDraftChange('placeholder', e.target.value)
                          }
                        />
                      </label>

                      <label className="block text-xs font-medium text-slate-700">
                        Help-Text
                        <textarea
                          rows={3}
                          className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm shadow-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                          value={draftField.helpText ?? ''}
                          onChange={(e) => handleDraftChange('helpText', e.target.value)}
                        />
                      </label>
                    </div>

                    <div className="flex flex-wrap gap-4 text-xs text-slate-700">
                      <label className="inline-flex items-center gap-2">
                        <input
                          type="checkbox"
                          className="h-3 w-3 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                          checked={!!draftField.required}
                          onChange={(e) =>
                            handleDraftChange('required', e.target.checked)
                          }
                        />
                        <span>Pflichtfeld</span>
                      </label>

                      <label className="inline-flex items-center gap-2">
                        <input
                          type="checkbox"
                          className="h-3 w-3 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                          checked={draftField.isActive !== false}
                          onChange={(e) =>
                            handleDraftChange('isActive', e.target.checked)
                          }
                        />
                        <span>Feld aktiv</span>
                      </label>
                    </div>

                    <div className="mt-2 flex items-center justify-between gap-3 text-xs">
                      <div className="text-slate-500">
                        {fieldSaveError && (
                          <span className="text-red-600">{fieldSaveError}</span>
                        )}
                        {fieldSaveSuccess && (
                          <span className="text-emerald-600">Änderungen gespeichert.</span>
                        )}
                        {!fieldSaveError && !fieldSaveSuccess && isDraftDirty && (
                          <span>Änderungen noch nicht gespeichert.</span>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={handleSaveFieldDetails}
                        disabled={isSavingField || !isDraftDirty || !draftField.id}
                        className={`inline-flex items-center rounded-md px-3 py-1.5 text-xs font-medium ${
                          isSavingField || !isDraftDirty || !draftField.id
                            ? 'cursor-not-allowed bg-slate-200 text-slate-500'
                            : 'bg-sky-600 text-white hover:bg-sky-700'
                        }`}
                      >
                        {isSavingField ? 'Speichern …' : 'Änderungen speichern'}
                      </button>
                    </div>
                  </div>
                )}

                {form?.id && activeField && (
                  <div className="mt-4 border-t border-slate-200 pt-4">
                    <FieldOptionsEditor
                      formId={form.id as number | string}
                      field={activeField as any}
                      onFieldUpdated={(updated: any) => {
                        const normalizedUpdated: FormFieldLike = {
                          id: updated.id,
                          type: updated.type ?? activeField.type ?? null,
                          config: updated.config ?? activeField.config,
                          label:
                            typeof updated.label === 'string'
                              ? updated.label
                              : activeField.label ?? null,
                          key:
                            typeof updated.key === 'string'
                              ? updated.key
                              : activeField.key,
                          order:
                            typeof updated.order === 'number'
                              ? updated.order
                              : activeField.order ?? null,
                          isActive:
                            typeof updated.isActive === 'boolean'
                              ? updated.isActive
                              : activeField.isActive,
                          placeholder: updated.placeholder ?? activeField.placeholder ?? null,
                          helpText: updated.helpText ?? activeField.helpText ?? null,
                          required:
                            typeof updated.required === 'boolean'
                              ? updated.required
                              : activeField.required ?? null,
                        };

                        setFieldsState((prev) =>
                          prev.map((f) =>
                            f.id === normalizedUpdated.id
                              ? { ...f, ...normalizedUpdated }
                              : f,
                          ),
                        );

                        setDraftField((prev) =>
                          prev && prev.id === normalizedUpdated.id
                            ? { ...prev, ...normalizedUpdated }
                            : prev,
                        );
                      }}
                    />
                  </div>
                )}
              </>
            )}

            {/* Tab: Kontaktblock */}
            {inspectorTab === 'contact' && (
              <div className="space-y-3">
                <h2 className="text-sm font-semibold text-slate-900">
                  Kontaktblock – Slot-Mapping
                </h2>

                <p className="text-xs text-slate-500">
                  Pro Slot kannst du ein Formularfeld zuordnen. Wenn du “Auto” wählst,
                  bleibt der Slot sichtbar und die Vorschau nutzt Fallback-Heuristik.
                  Wenn du den Slot deaktivierst, wird er im Kontaktblock ausgeblendet.
                </p>

                {contactSaveError && (
                  <p className="rounded-md bg-red-50 px-3 py-2 text-xs text-red-700">
                    {contactSaveError}
                  </p>
                )}
                {contactSaveSuccess && (
                  <p className="rounded-md bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
                    Kontaktblock gespeichert.
                  </p>
                )}
                {!contactSaveError && !contactSaveSuccess && isContactDirty && (
                  <p className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800">
                    Änderungen am Kontaktblock noch nicht gespeichert.
                  </p>
                )}

                <div className="space-y-3">
                  {CONTACT_SLOTS.map((slot) => {
                    const raw = (contactSlotsDraft as any)[slot.key] as number | null | undefined;
                    const isEnabled = raw !== null;

                    const selected =
                      typeof raw === 'undefined'
                        ? '__auto__'
                        : typeof raw === 'number'
                        ? String(raw)
                        : '__auto__';

                    return (
                      <div
                        key={slot.key}
                        className="rounded-md border border-slate-200 bg-white p-3"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <div className="text-xs font-semibold text-slate-900">
                              {slot.label}
                            </div>
                            <div className="text-[11px] text-slate-500">
                              Slot-Key: <span className="font-mono">{slot.key}</span>
                            </div>
                          </div>

                          <label className="inline-flex items-center gap-2 text-xs text-slate-700">
                            <input
                              type="checkbox"
                              className="h-3 w-3 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                              checked={isEnabled}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setContactSlotValue(slot.key, undefined);
                                } else {
                                  setContactSlotValue(slot.key, null);
                                }
                              }}
                            />
                            <span>Slot aktiv</span>
                          </label>
                        </div>

                        <div className="mt-2">
                          <label className="block text-xs font-medium text-slate-700">
                            Feldzuordnung
                            <select
                              disabled={!isEnabled}
                              className={`mt-1 w-full rounded-md border px-2 py-1.5 text-xs shadow-sm focus:outline-none focus:ring-1 ${
                                !isEnabled
                                  ? 'cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400'
                                  : 'border-slate-300 bg-white text-slate-800 focus:border-sky-500 focus:ring-sky-500'
                              }`}
                              value={selected}
                              onChange={(e) => {
                                const v = e.target.value;
                                if (v === '__auto__') {
                                  setContactSlotValue(slot.key, undefined);
                                  return;
                                }
                                const n = Number.parseInt(v, 10);
                                if (Number.isFinite(n)) {
                                  setContactSlotValue(slot.key, n);
                                }
                              }}
                            >
                              <option value="__auto__">Auto (Heuristik / Fallback)</option>
                              {sortedFields.map((f) => (
                                <option key={String(f.id)} value={String(f.id)}>
                                  #{String(f.id)} – {f.label ?? f.key ?? 'Unbenannt'}{' '}
                                  {f.key ? `(${f.key})` : ''}{' '}
                                  {f.isActive === false ? '[inaktiv]' : ''}
                                </option>
                              ))}
                            </select>
                          </label>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Tab: Design */}
            {inspectorTab === 'design' && (
              <div className="space-y-3">
                <h2 className="text-sm font-semibold text-slate-900">Design Kit</h2>

                <p className="text-xs text-slate-500">
                  Farben, Font und Logo sind pro Formular gespeichert. Änderungen wirken sofort in der Vorschau.
                </p>

                {themeSaveError && (
                  <p className="rounded-md bg-red-50 px-3 py-2 text-xs text-red-700">
                    {themeSaveError}
                  </p>
                )}
                {themeSaveSuccess && (
                  <p className="rounded-md bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
                    Design gespeichert.
                  </p>
                )}
                {!themeSaveError && !themeSaveSuccess && isThemeDirty && (
                  <p className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800">
                    Änderungen am Design noch nicht gespeichert.
                  </p>
                )}
                {themeHasInvalidHex && (
                  <p className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800">
                    Mindestens eine Farbe ist ungültig. Bitte nutze Hex-Farben wie #0ea5e9.
                  </p>
                )}

                <div className="rounded-md border border-slate-200 bg-white p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <div className="text-xs font-semibold text-slate-900">Farben</div>
                      <div className="text-[11px] text-slate-500">
                        Background / Surface / Primary / Text / Muted / Border
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={resetThemeToDefault}
                      className="rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-200"
                    >
                      Zurücksetzen
                    </button>
                  </div>

                  <div className="mt-3 space-y-3">
                    {THEME_COLOR_FIELDS.map((f) => {
                      const pickerFallback = (DEFAULT_FORM_THEME as any)[f.key] as string;
                      const pickerValue = toColorPickerValue(themeDraft[f.key], pickerFallback);

                      return (
                        <div key={f.key} className="grid grid-cols-[1fr_auto] gap-3">
                          <div>
                            <div className="flex items-center justify-between">
                              <div className="text-xs font-medium text-slate-800">
                                {f.label}
                              </div>
                              <div className="text-[11px] text-slate-400">{f.hint}</div>
                            </div>

                            <div className="mt-1 flex items-center gap-2">
                              <input
                                type="color"
                                value={pickerValue}
                                onChange={(e) => setThemeValue(f.key, e.target.value as any)}
                                className="h-8 w-12 cursor-pointer rounded border border-slate-200 bg-white p-0"
                                aria-label={`${f.label} Farbe wählen`}
                              />
                              <input
                                type="text"
                                value={themeDraft[f.key]}
                                onChange={(e) => setThemeValue(f.key, e.target.value as any)}
                                className={`w-full rounded-md border px-2 py-1.5 text-xs shadow-sm focus:outline-none focus:ring-1 ${
                                  isValidHexColor(themeDraft[f.key])
                                    ? 'border-slate-300 focus:border-sky-500 focus:ring-sky-500'
                                    : 'border-amber-300 focus:border-amber-500 focus:ring-amber-500'
                                }`}
                                placeholder="#0ea5e9"
                              />
                              <button
                                type="button"
                                className="rounded-md bg-slate-100 px-2 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-200"
                                onClick={() => {
                                  const def = (DEFAULT_FORM_THEME as any)[f.key] as string;
                                  setThemeValue(f.key, def as any);
                                }}
                                title="Setzt diesen Wert auf Default"
                              >
                                Default
                              </button>
                            </div>
                          </div>

                          <div className="flex items-end">
                            <div
                              className="h-8 w-10 rounded-md border border-slate-200"
                              style={{
                                backgroundColor: isValidHexColor(themeDraft[f.key])
                                  ? normalizeHex(themeDraft[f.key])
                                  : pickerValue,
                              }}
                              title="Preview"
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="rounded-md border border-slate-200 bg-white p-3">
                  <div className="text-xs font-semibold text-slate-900">Font</div>
                  <div className="mt-2">
                    <label className="block text-xs font-medium text-slate-700">
                      Font Family (Name)
                      <select
                        className="mt-1 w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs shadow-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                        value={themeDraft.fontFamily}
                        onChange={(e) => setThemeValue('fontFamily', e.target.value)}
                      >
                        {FONT_FAMILY_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <p className="mt-1 text-[11px] text-slate-500">
                      Hinweis: echtes Font-Loading kommt später – aktuell speichern wir nur den Namen.
                    </p>
                  </div>
                </div>

                <div className="rounded-md border border-slate-200 bg-white p-3">
                  <div className="text-xs font-semibold text-slate-900">Logo</div>
                  <div className="mt-2">
                    <label className="block text-xs font-medium text-slate-700">
                      Logo URL (optional)
                      <input
                        type="text"
                        className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-xs shadow-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                        value={themeDraft.logoUrl}
                        onChange={(e) => setThemeValue('logoUrl', e.target.value)}
                        placeholder="https://…/logo.png"
                      />
                    </label>

                    <div className="mt-2 flex items-center gap-3">
                      <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] text-slate-500">
                        Preview (nur Platzhalter)
                      </div>
                      <div className="h-10 w-28 overflow-hidden rounded-md border border-slate-200 bg-white">
                        {themeDraft.logoUrl.trim().length > 0 ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={themeDraft.logoUrl.trim()}
                            alt="Logo Preview"
                            className="h-full w-full object-contain"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-[11px] text-slate-400">
                            —
                          </div>
                        )}
                      </div>

                      <button
                        type="button"
                        className="rounded-md bg-slate-100 px-2 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-200"
                        onClick={() => setThemeValue('logoUrl', '')}
                        title="Logo entfernen"
                      >
                        Entfernen
                      </button>
                    </div>

                    <p className="mt-1 text-[11px] text-slate-500">
                      Später: Upload &amp; Media-Library. Jetzt: URL.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
