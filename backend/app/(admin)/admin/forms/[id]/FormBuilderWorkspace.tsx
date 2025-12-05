'use client';

import * as React from 'react';
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  closestCenter,
  type UniqueIdentifier,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';

type FieldId = UniqueIdentifier;

type FormLike = {
  id?: number | string;
  name?: string | null;
  title?: string | null;
  description?: string | null;
  status?: string | null;
  state?: string | null;
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
  [key: string]: any;
};

interface FormBuilderWorkspaceProps {
  form?: FormLike;
  fields?: FormFieldLike[];
  initialForm?: FormLike;
  initialFields?: FormFieldLike[];
}

/**
 * Hilfsfunktion: Eingehende Roh-Felder in ein konsistentes Shape bringen.
 */
function normalizeFields(fieldsInput: unknown): FormFieldLike[] {
  if (!Array.isArray(fieldsInput)) return [];

  return fieldsInput.map((raw, index) => {
    const f = raw as any;
    const id: FieldId = (f?.id ?? index) as FieldId;
    const label: string =
      f?.label ?? f?.name ?? f?.key ?? `Feld ${index + 1}`;
    const type: string = f?.type ?? f?.fieldType ?? 'text';
    const order: number | null =
      typeof f?.order === 'number' ? f.order : null;
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
        typeof a.f.order === 'number' ? a.f.order! : Number.MAX_SAFE_INTEGER;
      const bo =
        typeof b.f.order === 'number' ? b.f.order! : Number.MAX_SAFE_INTEGER;

      if (ao !== bo) return ao - bo;

      const aid =
        typeof a.f.id === 'number'
          ? a.f.id
          : typeof a.f.id === 'string'
          ? parseInt(a.f.id as string, 10) || 0
          : 0;
      const bid =
        typeof b.f.id === 'number'
          ? b.f.id
          : typeof b.f.id === 'string'
          ? parseInt(b.f.id as string, 10) || 0
          : 0;

      if (aid !== bid) return aid - bid;
      return a.index - b.index;
    })
    .map(({ f }) => f);
}

/**
 * Einzelnes sortierbares Feld in der linken Liste.
 */
function SortableFieldListItem(props: {
  field: FormFieldLike;
  isActive: boolean;
  onClick: () => void;
}) {
  const { field, isActive, onClick } = props;

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: field.id });

  const style: React.CSSProperties = {
    transform: transform
      ? `translate3d(${transform.x}px, ${transform.y}px, 0)`
      : undefined,
    transition,
  };

  const baseClasses =
    'group mb-2 flex items-center justify-between rounded-md border px-3 py-2 text-sm shadow-sm';
  let className =
    baseClasses +
    ' bg-white border-slate-200 text-slate-800 hover:border-sky-300 hover:bg-slate-50';

  if (isActive) {
    className =
      baseClasses +
      ' border-sky-500 bg-sky-50 text-slate-900 ring-1 ring-sky-200';
  }

  if (!field.isActive) {
    className += ' opacity-60';
  }

  if (isDragging) {
    className += ' z-10 ring-2 ring-sky-400';
  }

  return (
    <li ref={setNodeRef} style={style} className={className}>
      <button
        type="button"
        onClick={onClick}
        className="flex flex-1 flex-col items-start text-left"
      >
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          {field.key ?? `key_${String(field.id)}`}
        </span>
        <span className="text-sm font-medium text-slate-900">
          {field.label ?? field.key ?? 'Unbenanntes Feld'}
        </span>
        <span className="text-xs text-slate-500">
          {field.type ?? 'Textfeld'}
          {field.required && <span className="text-red-500"> *</span>}
        </span>
      </button>

      {/* Drag-Handle – dezent, wird bei Hover klarer */}
      <button
        type="button"
        {...attributes}
        {...listeners}
        className="ml-3 inline-flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 bg-slate-50 text-xs text-slate-500 opacity-70 hover:bg-slate-100 group-hover:opacity-100 cursor-grab active:cursor-grabbing"
        title="Feld verschieben"
        aria-label="Feld verschieben"
      >
        ⠿
      </button>
    </li>
  );
}

export default function FormBuilderWorkspace(
  props: FormBuilderWorkspaceProps,
) {
  const form: FormLike = props.form ?? props.initialForm ?? {};
  const initialFields = React.useMemo(
    () => normalizeFields(props.fields ?? props.initialFields ?? []),
    [props.fields, props.initialFields],
  );

  const [fieldsState, setFieldsState] =
    React.useState<FormFieldLike[]>(initialFields);
  const [activeFieldId, setActiveFieldId] =
    React.useState<FieldId | null>(null);
  const [isOrderDirty, setIsOrderDirty] = React.useState(false);

  // Reihenfolge-Persistenz
  const [isSavingOrder, setIsSavingOrder] = React.useState(false);
  const [orderSaveError, setOrderSaveError] =
    React.useState<string | null>(null);
  const [orderSaveSuccess, setOrderSaveSuccess] =
    React.useState(false);

  // Properties-Panel: Draft-State
  const [draftField, setDraftField] =
    React.useState<FormFieldLike | null>(null);
  const [isSavingField, setIsSavingField] = React.useState(false);
  const [fieldSaveError, setFieldSaveError] = React.useState<string | null>(
    null,
  );
  const [fieldSaveSuccess, setFieldSaveSuccess] = React.useState(false);
  const [isDraftDirty, setIsDraftDirty] = React.useState(false);

  // Wenn sich die eingehenden Felder ändern (z. B. durch Reload), lokalen State neu setzen.
  React.useEffect(() => {
    setFieldsState(normalizeFields(props.fields ?? props.initialFields ?? []));
    setIsOrderDirty(false);
  }, [props.fields, props.initialFields]);

  const sortedFields = React.useMemo(
    () => sortFields(fieldsState),
    [fieldsState],
  );

  // Aktives Feld sicherstellen: Wenn keins gewählt ist oder nicht mehr existiert, erstes Feld setzen.
  React.useEffect(() => {
    if (
      sortedFields.length === 0 ||
      (activeFieldId != null &&
        sortedFields.some((f) => f.id === activeFieldId))
    ) {
      return;
    }
    setActiveFieldId(sortedFields[0].id);
  }, [sortedFields, activeFieldId]);

  const activeField =
    activeFieldId != null
      ? sortedFields.find((f) => f.id === activeFieldId) ?? null
      : null;

  // Draft mit aktivem Feld synchronisieren.
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
      activationConstraint: {
        distance: 5, // Drag startet erst nach leichter Bewegung
      },
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

      // order nur lokal neu durchzählen – Persistenz folgt über Button.
      const withNewOrder = reordered.map((field, index) => ({
        ...field,
        order: index + 1,
      }));

      setIsOrderDirty(true);
      return withNewOrder;
    });
  }

  function handleDraftChange<K extends keyof FormFieldLike>(
    key: K,
    value: FormFieldLike[K],
  ) {
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
        placeholder:
          draftField.placeholder === '' ? null : draftField.placeholder ?? null,
      helpText:
          draftField.helpText === '' ? null : draftField.helpText ?? null,
        required: !!draftField.required,
        isActive: draftField.isActive !== false,
      };

      const res = await fetch(
        `/api/admin/forms/${formId}/fields/${fieldId}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            // Dev-Stub: numerische User-ID für requireAuthContext
            'x-user-id': '1',
          },
          body: JSON.stringify(payload),
        },
      );

      if (!res.ok) {
        throw new Error(
          `Fehler beim Speichern der Feldeigenschaften (Status ${res.status})`,
        );
      }

      // Lokalen State aktualisieren
      setFieldsState((prev) =>
        prev.map((f) =>
          f.id === draftField.id ? { ...f, ...draftField } : f,
        ),
      );

      setIsDraftDirty(false);
      setFieldSaveSuccess(true);
      setTimeout(() => setFieldSaveSuccess(false), 2000);
    } catch (err) {
      console.error(err);
      setFieldSaveError(
        (err as Error).message ?? 'Unbekannter Fehler beim Speichern.',
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
            `/api/admin/forms/${formId}/fields/${encodeURIComponent(
              String(fieldId),
            )}`,
            {
              method: 'PATCH',
              headers: {
                'Content-Type': 'application/json',
                // Dev-Stub: numerische User-ID für requireAuthContext
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

      // Lokalen State auf den bestätigten Stand setzen
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
        (err as Error).message ??
          'Unbekannter Fehler beim Speichern der Reihenfolge.',
      );
    } finally {
      setIsSavingOrder(false);
    }
  }

  const formName =
    form?.name ?? form?.title ?? (form?.id ? `Formular #${form.id}` : 'Form');
  const formDescription = form?.description ?? '';
  const formStatus = form?.status ?? form?.state ?? '';

  return (
    <div className="flex flex-col gap-6">
      {/* Header mit Form-Meta */}
      <header className="flex flex-wrap items-start justify-between gap-4 rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-sm">
        <div>
          <h1 className="text-lg font-semibold text-slate-900">
            {formName}
          </h1>
          {formDescription && (
            <p className="mt-1 text-sm text-slate-600">
              {formDescription}
            </p>
          )}
        </div>
        {formStatus && (
          <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-medium uppercase tracking-wide text-slate-600">
            {formStatus}
          </span>
        )}
      </header>

      {/* Builder-Workspace: Links Feldliste, rechts Vorschau + Properties */}
      <div className="grid gap-4 md:grid-cols-[minmax(0,0.35fr)_minmax(0,0.65fr)]">
        {/* Linke Spalte – Feldliste mit Drag & Drop */}
        <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">
                Feldliste
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                Zieh die Felder über das Handle (⠿), um die Reihenfolge
                zu ändern.
              </p>
            </div>
            {isOrderDirty && (
              <span className="rounded-full bg-amber-50 px-3 py-1 text-[10px] font-medium uppercase tracking-wide text-amber-700">
                Reihenfolge geändert (noch nicht gespeichert)
              </span>
            )}
          </div>

          <div className="mt-3 max-h-[480px] overflow-y-auto pr-1">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={sortedFields.map((f) => f.id)}
                strategy={verticalListSortingStrategy}
              >
                <ul>
                  {sortedFields.map((field) => (
                    <SortableFieldListItem
                      key={field.id}
                      field={field}
                      isActive={activeFieldId === field.id}
                      onClick={() => setActiveFieldId(field.id)}
                    />
                  ))}
                </ul>
              </SortableContext>
            </DndContext>

            {sortedFields.length === 0 && (
              <p className="mt-2 text-sm text-slate-500">
                Für dieses Formular sind noch keine Felder definiert.
              </p>
            )}
          </div>

          <div className="mt-3 flex items-center justify-between gap-3">
            <div className="text-xs text-slate-500">
              {orderSaveError && (
                <span className="text-red-600">
                  {orderSaveError}
                </span>
              )}
              {orderSaveSuccess && (
                <span className="text-emerald-600">
                  Reihenfolge gespeichert.
                </span>
              )}
              {!orderSaveError &&
                !orderSaveSuccess &&
                isOrderDirty && (
                  <span>
                    Reihenfolge geändert – noch nicht gespeichert.
                  </span>
                )}
            </div>

            <button
              type="button"
              onClick={handleSaveOrder}
              disabled={
                !isOrderDirty || isSavingOrder || !form?.id
              }
              className={`inline-flex items-center rounded-md px-3 py-1.5 text-xs font-medium ${
                !isOrderDirty || isSavingOrder || !form?.id
                  ? 'cursor-not-allowed bg-slate-200 text-slate-500'
                  : 'bg-sky-600 text-white hover:bg-sky-700'
              }`}
            >
              {isSavingOrder ? 'Speichere …' : 'Reihenfolge speichern'}
            </button>
          </div>

          <p className="mt-2 text-xs text-slate-400">
            Hinweis: Beim Speichern wird die aktuelle Reihenfolge in der
            Datenbank persistiert.
          </p>
        </section>

        {/* Rechte Spalte – Vorschau + Properties-Panel */}
        <section className="flex flex-col gap-4">
          {/* Vereinfachte Vorschau */}
          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-900">
              Formular-Vorschau (vereinfachte Ansicht)
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Reihenfolge, Labels und Pflichtfeld-Markierungen werden
              live aus der Feldliste übernommen.
            </p>

            <div className="mt-3 space-y-2">
              {sortedFields.map((field) => {
                const isPreviewActive = activeFieldId === field.id;
                const previewBase =
                  'flex flex-col rounded-md border px-3 py-2 cursor-pointer transition-colors';
                const previewClass = isPreviewActive
                  ? previewBase +
                    ' border-sky-500 bg-sky-50 ring-1 ring-sky-200'
                  : previewBase +
                    ' border-slate-200 bg-slate-50 hover:border-sky-300 hover:bg-slate-50';

                return (
                  <div
                    key={field.id}
                    className={previewClass}
                    onClick={() => setActiveFieldId(field.id)}
                  >
                    <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-600">
                      {field.label ?? field.key ?? 'Unbenanntes Feld'}
                      {field.required && (
                        <span className="text-red-500"> *</span>
                      )}
                    </span>
                    <span className="mt-1 text-xs text-slate-400">
                      {field.placeholder ||
                        `(${field.type ?? 'Textfeld'})`}
                    </span>
                  </div>
                );
              })}

              {sortedFields.length === 0 && (
                <p className="text-xs text-slate-500">
                  Noch keine Vorschau möglich – füge zuerst Felder hinzu.
                </p>
              )}
            </div>
          </div>

          {/* Properties-Panel */}
          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-900">
              Feldeigenschaften
            </h2>

            {!activeField && (
              <p className="mt-2 text-sm text-slate-500">
                Wähle links ein Feld oder in der Vorschau ein Element
                aus, um die Eigenschaften zu bearbeiten.
              </p>
            )}

            {activeField && draftField && (
              <div className="mt-3 space-y-3">
                <div className="grid grid-cols-2 gap-3 text-xs text-slate-500">
                  <div>
                    <span className="font-medium">Typ</span>
                    <div className="mt-0.5 text-[11px] text-slate-700">
                      {draftField.type ?? 'text'}
                    </div>
                  </div>
                  <div>
                    <span className="font-medium">Key</span>
                    <div className="mt-0.5 text-[11px] text-slate-700">
                      {draftField.key ?? '(kein Key)'}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700">
                    Label
                  </label>
                  <input
                    type="text"
                    className="mt-1 block w-full rounded-md border border-slate-300 px-2 py-1 text-sm text-slate-900 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                    value={draftField.label ?? ''}
                    onChange={(e) =>
                      handleDraftChange('label', e.target.value)
                    }
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700">
                    Placeholder
                  </label>
                  <input
                    type="text"
                    className="mt-1 block w-full rounded-md border border-slate-300 px-2 py-1 text-sm text-slate-900 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                    value={draftField.placeholder ?? ''}
                    onChange={(e) =>
                      handleDraftChange('placeholder', e.target.value)
                    }
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700">
                    Help-Text
                  </label>
                  <textarea
                    rows={2}
                    className="mt-1 block w-full rounded-md border border-slate-300 px-2 py-1 text-sm text-slate-900 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                    value={draftField.helpText ?? ''}
                    onChange={(e) =>
                      handleDraftChange('helpText', e.target.value)
                    }
                  />
                </div>

                <div className="flex flex-wrap gap-4 text-sm text-slate-700">
                  <label className="inline-flex items-center gap-2">
                    <input
                      type="checkbox"
                      className="h-3 w-3 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                      checked={!!draftField.required}
                      onChange={(e) =>
                        handleDraftChange('required', e.target.checked)
                      }
                    />
                    <span className="text-xs">Pflichtfeld</span>
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
                    <span className="text-xs">Feld aktiv</span>
                  </label>
                </div>

                <div className="mt-2 flex items-center justify-between gap-3">
                  <div className="text-xs text-slate-500">
                    {fieldSaveError && (
                      <span className="text-red-600">
                        {fieldSaveError}
                      </span>
                    )}
                    {fieldSaveSuccess && (
                      <span className="text-emerald-600">
                        Änderungen gespeichert.
                      </span>
                    )}
                    {!fieldSaveError &&
                      !fieldSaveSuccess &&
                      isDraftDirty && (
                        <span>Änderungen noch nicht gespeichert.</span>
                      )}
                  </div>

                  <button
                    type="button"
                    onClick={handleSaveFieldDetails}
                    disabled={
                      isSavingField || !isDraftDirty || !draftField.id
                    }
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
          </div>
        </section>
      </div>
    </div>
  );
}
