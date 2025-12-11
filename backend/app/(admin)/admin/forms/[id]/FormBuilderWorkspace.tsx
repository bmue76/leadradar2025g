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

type FieldId = string | number;

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
 * Eingehende Roh-Felder in ein konsistentes Shape bringen.
 */
function normalizeFields(fieldsInput: unknown): FormFieldLike[] {
  if (!Array.isArray(fieldsInput)) return [];
  return fieldsInput.map((raw, index) => {
    const f = raw as any;
    const id: FieldId = (f?.id ?? index) as FieldId;
    const label: string = f?.label ?? f?.name ?? f?.key ?? `Feld ${index + 1}`;
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
      <button
        type="button"
        className="flex flex-1 flex-col text-left"
        onClick={onClick}
      >
        <div className="flex items-center gap-2">
          <span className="truncate font-medium">
            {field.label ?? field.key ?? 'Unbenanntes Feld'}
          </span>
          {field.required && (
            <span className="text-xs font-semibold text-rose-600">*</span>
          )}
        </div>
        <div className="mt-0.5 flex items-center gap-2 text-[11px] text-slate-500">
          <span className="uppercase tracking-wide">
            {field.type ?? 'text'}
          </span>
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
  const [activeFieldId, setActiveFieldId] = React.useState<FieldId | null>(
    initialFields[0]?.id ?? null,
  );

  const [isOrderDirty, setIsOrderDirty] = React.useState(false);
  const [isSavingOrder, setIsSavingOrder] = React.useState(false);
  const [orderSaveError, setOrderSaveError] = React.useState<string | null>(
    null,
  );
  const [orderSaveSuccess, setOrderSaveSuccess] = React.useState(false);

  const [draftField, setDraftField] =
    React.useState<FormFieldLike | null>(null);
  const [isDraftDirty, setIsDraftDirty] = React.useState(false);
  const [isSavingField, setIsSavingField] = React.useState(false);
  const [fieldSaveError, setFieldSaveError] = React.useState<string | null>(
    null,
  );
  const [fieldSaveSuccess, setFieldSaveSuccess] = React.useState(false);

  // Server-Felder synchronisieren
  React.useEffect(() => {
    setFieldsState(normalizeFields(props.fields ?? props.initialFields ?? []));
    setIsOrderDirty(false);
  }, [props.fields, props.initialFields]);

  const sortedFields = React.useMemo(
    () => sortFields(fieldsState),
    [fieldsState],
  );

  // Aktives Feld sicherstellen
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
          draftField.placeholder === ''
            ? null
            : draftField.placeholder ?? null,
        helpText:
          draftField.helpText === ''
            ? null
            : draftField.helpText ?? null,
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

      // lokalen State aktualisieren
      setFieldsState((prev) =>
        prev.map((f) => (f.id === draftField.id ? { ...f, ...draftField } : f)),
      );

      setIsDraftDirty(false);
      setFieldSaveSuccess(true);
      setTimeout(() => setFieldSaveSuccess(false), 2000);
    } catch (err) {
      console.error(err);
      setFieldSaveError(
        (err as Error).message ??
          'Unbekannter Fehler beim Speichern der Feldeigenschaften.',
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
    <div className="space-y-6">
      {/* Header mit Form-Meta */}
      <header className="border-b border-slate-200 pb-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h1 className="text-lg font-semibold text-slate-900">
              {formName}
            </h1>
            {formDescription && (
              <p className="mt-1 max-w-2xl text-sm text-slate-600">
                {formDescription}
              </p>
            )}
          </div>
          {formStatus && (
            <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-medium uppercase tracking-wide text-slate-700">
              {formStatus}
            </span>
          )}
        </div>
      </header>

      {/* Haupt-Workspace: links Feldliste, rechts Tablet-Vorschau + Properties */}
      <div className="grid gap-6 lg:grid-cols-[minmax(260px,320px)_minmax(0,1fr)]">
        {/* Linke Spalte – Feldliste + Reorder */}
        <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">
                Feldliste
              </h2>
              <p className="text-xs text-slate-500">
                Zieh die Felder über das Handle (⠿), um die Reihenfolge zu
                ändern.
              </p>
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
                  onClick={() => setActiveFieldId(field.id)}
                />
              ))}
            </SortableContext>
          </DndContext>

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
              Hinweis: Beim Speichern wird die aktuelle Reihenfolge in der
              Datenbank persistiert.
            </span>
          </div>
        </section>

        {/* Rechte Spalte – Tablet-Vorschau + Properties */}
        <section className="space-y-4">
          {/* Tablet-Vorschau */}
          <div className="space-y-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h2 className="text-sm font-semibold text-slate-900">
                  Tablet-Vorschau
                </h2>
                <p className="text-xs text-slate-500">
                  Grobe Annäherung an das spätere Tablet-/App-Layout. Die
                  Reihenfolge aus der Feldliste wirkt sich auf die dynamischen
                  Felder (links) aus, der Kontaktblock (rechts) folgt einer
                  eigenen Logik.
                </p>
              </div>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-500">
                Beta
              </span>
            </div>

            <FormPreviewTabletLayout
              fields={sortedFields as any}
              activeFieldId={activeFieldId as any}
              onFieldClick={(id) => setActiveFieldId(id as FieldId)}
            />
          </div>

          {/* Properties-Panel + Optionen-Editor */}
          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="mb-2 text-sm font-semibold text-slate-900">
              Feldeigenschaften
            </h2>

            {!activeField && (
              <p className="text-sm text-slate-500">
                Wähle links ein Feld oder ein Element in der Tablet-Vorschau,
                um die Eigenschaften zu bearbeiten.
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
                      onChange={(e) =>
                        handleDraftChange('label', e.target.value)
                      }
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
                      onChange={(e) =>
                        handleDraftChange('helpText', e.target.value)
                      }
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
                      <span className="text-emerald-600">
                        Änderungen gespeichert.
                      </span>
                    )}
                    {!fieldSaveError && !fieldSaveSuccess && isDraftDirty && (
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

            {/* Optionen-Editor für Choice-Felder */}
            {form?.id && activeField && (
              <FieldOptionsEditor
                formId={form.id as number | string}
                field={activeField as any}
                onFieldUpdated={(updated: any) => {
                  // Normalisiertes Objekt in Richtung FormFieldLike bauen
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
                    placeholder:
                      updated.placeholder ?? activeField.placeholder ?? null,
                    helpText: updated.helpText ?? activeField.helpText ?? null,
                    required:
                      typeof updated.required === 'boolean'
                        ? updated.required
                        : activeField.required ?? null,
                  };

                  setFieldsState((prev) =>
                    prev.map((f) =>
                      f.id === normalizedUpdated.id ? { ...f, ...normalizedUpdated } : f,
                    ),
                  );

                  setDraftField((prev) =>
                    prev && prev.id === normalizedUpdated.id
                      ? { ...prev, ...normalizedUpdated }
                      : prev,
                  );
                }}
              />
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
