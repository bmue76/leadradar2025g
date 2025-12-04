// app/(admin)/admin/forms/[id]/FormFieldsTable.tsx
'use client';

import React, { useEffect, useState } from 'react';

export type FormField = {
  id: number;
  formId: number;
  tenantId: number;
  key: string;
  label: string;
  type: string;
  placeholder: string | null;
  helpText: string | null;
  required: boolean;
  order: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

type EditorMode = 'create' | 'edit';

type Props = {
  formId: number;
  fields: FormField[];
};

const FIELD_TYPES: string[] = [
  'TEXT',
  'EMAIL',
  'PHONE',
  'NUMBER',
  'TEXTAREA',
  'SELECT',
  'CHECKBOX',
];

export function FormFieldsTable({ formId, fields }: Props) {
  const [items, setItems] = useState<FormField[]>(fields);
  const [mode, setMode] = useState<EditorMode | null>(null);
  const [editingField, setEditingField] = useState<FormField | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [label, setLabel] = useState('');
  const [keyValue, setKeyValue] = useState('');
  const [type, setType] = useState<string>('TEXT');
  const [required, setRequired] = useState(false);
  const [placeholder, setPlaceholder] = useState('');
  const [helpText, setHelpText] = useState('');
  const [isActive, setIsActive] = useState(true);

  // Effektive Form-ID für API-Calls (Prop oder Fallback aus URL)
  const [effectiveFormId, setEffectiveFormId] = useState<number | null>(null);

  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [reorderingId, setReorderingId] = useState<number | null>(null);
  const [togglingId, setTogglingId] = useState<number | null>(null);

  // Drag & Drop State
  const [draggingId, setDraggingId] = useState<number | null>(null);
  const [dragOverId, setDragOverId] = useState<number | null>(null);

  useEffect(() => {
    // Primär: formId-Prop
    if (Number.isFinite(formId) && formId > 0) {
      setEffectiveFormId(formId);
      return;
    }

    // Fallback: ID aus URL ziehen (/admin/forms/:id)
    if (typeof window !== 'undefined') {
      const parts = window.location.pathname.split('/').filter(Boolean);
      const last = parts[parts.length - 1];
      const parsed = Number.parseInt(last ?? '', 10);
      if (Number.isFinite(parsed) && parsed > 0) {
        setEffectiveFormId(parsed);
        return;
      }
    }

    // Wenn wir hier landen, ist etwas grundsätzlich schief
    setEffectiveFormId(null);
  }, [formId]);

  // Server-Felder synchron halten (z. B. nach Refresh)
  useEffect(() => {
    setItems(fields);
  }, [fields]);

  const sorted = [...items].sort((a, b) => {
    if (a.order === b.order) return a.id - b.id;
    return a.order - b.order;
  });

  const openCreateDialog = () => {
    setMode('create');
    setEditingField(null);
    setLabel('');
    setKeyValue('');
    setType('TEXT');
    setRequired(false);
    setPlaceholder('');
    setHelpText('');
    setIsActive(true);
    setError(null);
    setIsDialogOpen(true);
  };

  const openEditDialog = (field: FormField) => {
    setMode('edit');
    setEditingField(field);
    setLabel(field.label ?? '');
    setKeyValue(field.key ?? '');
    setType(field.type ?? 'TEXT');
    setRequired(field.required ?? false);
    setPlaceholder(field.placeholder ?? '');
    setHelpText(field.helpText ?? '');
    setIsActive(field.isActive ?? true);
    setError(null);
    setIsDialogOpen(true);
  };

  const closeDialog = () => {
    if (saving) return;
    setIsDialogOpen(false);
    setMode(null);
    setEditingField(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mode) return;

    if (
      !effectiveFormId ||
      !Number.isFinite(effectiveFormId) ||
      effectiveFormId <= 0
    ) {
      setError(
        'Formular-ID konnte nicht ermittelt werden. Bitte Seite neu laden oder erneut versuchen.',
      );
      return;
    }

    if (!label.trim() || !keyValue.trim() || !type.trim()) {
      setError('Label, Key und Typ sind Pflichtfelder.');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      if (mode === 'create') {
        const res = await fetch(
          `/api/admin/forms/${effectiveFormId}/fields`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-user-id': '1',
            },
            body: JSON.stringify({
              label: label.trim(),
              key: keyValue.trim(),
              type: type.trim(),
              required,
              placeholder: placeholder.trim() || undefined,
              helpText: helpText.trim() || undefined,
              isActive,
            }),
          },
        );

        if (!res.ok) {
          let message = 'Fehler beim Anlegen des Feldes';
          try {
            const data = await res.json();
            if (data?.message) message = data.message;
          } catch {
            // ignore JSON parse
          }
          throw new Error(message);
        }

        const created = (await res.json()) as FormField;
        setItems((prev) =>
          [...prev, created].sort((a, b) =>
            a.order === b.order ? a.id - b.id : a.order - b.order,
          ),
        );
      } else if (mode === 'edit' && editingField) {
        const res = await fetch(
          `/api/admin/forms/${effectiveFormId}/fields/${editingField.id}`,
          {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              'x-user-id': '1',
            },
            body: JSON.stringify({
              label: label.trim(),
              key: keyValue.trim(),
              type: type.trim(),
              required,
              placeholder: placeholder.trim(),
              helpText: helpText.trim(),
              isActive,
            }),
          },
        );

        if (!res.ok) {
          let message = 'Fehler beim Aktualisieren des Feldes';
          try {
            const data = await res.json();
            if (data?.message) message = data.message;
          } catch {
            // ignore
          }
          throw new Error(message);
        }

        const updated = (await res.json()) as FormField;
        setItems((prev) =>
          prev.map((f) => (f.id === updated.id ? updated : f)),
        );
      }

      closeDialog();
    } catch (err: any) {
      setError(err.message || 'Unbekannter Fehler');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (field: FormField) => {
    if (
      !effectiveFormId ||
      !Number.isFinite(effectiveFormId) ||
      effectiveFormId <= 0
    ) {
      alert(
        'Formular-ID konnte nicht ermittelt werden. Bitte Seite neu laden oder erneut versuchen.',
      );
      return;
    }

    const confirmed = window.confirm(
      `Feld "${field.label}" (Key: ${field.key}) wirklich löschen?`,
    );
    if (!confirmed) return;

    setDeletingId(field.id);
    setError(null);

    try {
      const res = await fetch(
        `/api/admin/forms/${effectiveFormId}/fields/${field.id}`,
        {
          method: 'DELETE',
          headers: {
            'x-user-id': '1',
          },
        },
      );

      if (res.status !== 204) {
        let message = 'Fehler beim Löschen des Feldes';
        try {
          const data = await res.json();
          if (data?.message) message = data.message;
        } catch {
          // ignore
        }
        throw new Error(message);
      }

      // Lokalen State aktualisieren und Order neu packen
      setItems((prev) => {
        const remaining = prev.filter((f) => f.id !== field.id);
        return remaining
          .slice()
          .sort((a, b) =>
            a.order === b.order ? a.id - b.id : a.order - b.order,
          )
          .map((f, index) => ({
            ...f,
            order: index + 1,
          }));
      });
    } catch (err: any) {
      setError(err.message || 'Unbekannter Fehler beim Löschen');
    } finally {
      setDeletingId(null);
    }
  };

  const reloadFromServer = async (formIdToUse: number) => {
    try {
      const res = await fetch(`/api/admin/forms/${formIdToUse}/fields`, {
        headers: {
          'x-user-id': '1',
        },
      });
      if (!res.ok) {
        console.error(
          'Fehler beim Neuladen der Felder nach Reorder/Toggle',
          res.status,
        );
        return;
      }
      const data = (await res.json()) as FormField[];
      setItems(data);
    } catch (err) {
      console.error(
        'Unerwarteter Fehler beim Neuladen der Felder',
        err,
      );
    }
  };

  const handleMove = async (field: FormField, direction: 'up' | 'down') => {
    const fid = effectiveFormId;
    if (!fid || !Number.isFinite(fid) || fid <= 0) {
      alert(
        'Formular-ID konnte nicht ermittelt werden. Bitte Seite neu laden oder erneut versuchen.',
      );
      return;
    }

    const maxOrder = items.length;
    const currentOrder = field.order;
    let targetOrder = currentOrder;

    if (direction === 'up') {
      if (currentOrder <= 1) return; // schon ganz oben
      targetOrder = currentOrder - 1;
    } else {
      if (currentOrder >= maxOrder) return; // schon ganz unten
      targetOrder = currentOrder + 1;
    }

    setReorderingId(field.id);
    setError(null);

    try {
      const res = await fetch(
        `/api/admin/forms/${fid}/fields/${field.id}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'x-user-id': '1',
          },
          body: JSON.stringify({
            order: targetOrder,
          }),
        },
      );

      if (!res.ok) {
        let message = 'Fehler beim Ändern der Reihenfolge';
        try {
          const data = await res.json();
          if (data?.message) message = data.message;
        } catch {
          // ignore
        }
        throw new Error(message);
      }

      // Server packt Reihenfolge neu → Felder frisch laden
      await reloadFromServer(fid);
    } catch (err: any) {
      setError(err.message || 'Unbekannter Fehler beim Reorder');
    } finally {
      setReorderingId(null);
    }
  };

  const handleToggleActive = async (field: FormField) => {
    const fid = effectiveFormId;
    if (!fid || !Number.isFinite(fid) || fid <= 0) {
      alert(
        'Formular-ID konnte nicht ermittelt werden. Bitte Seite neu laden oder erneut versuchen.',
      );
      return;
    }

    setTogglingId(field.id);
    setError(null);

    try {
      const res = await fetch(
        `/api/admin/forms/${fid}/fields/${field.id}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'x-user-id': '1',
          },
          body: JSON.stringify({
            isActive: !field.isActive,
          }),
        },
      );

      if (!res.ok) {
        let message = 'Fehler beim Aktualisieren des Aktiv-Status';
        try {
          const data = await res.json();
          if (data?.message) message = data.message;
        } catch {
          // ignore
        }
        throw new Error(message);
      }

      const updated = (await res.json()) as FormField;
      setItems((prev) =>
        prev.map((f) => (f.id === updated.id ? updated : f)),
      );
    } catch (err: any) {
      setError(
        err.message || 'Unbekannter Fehler beim Aktiv-Status-Update',
      );
    } finally {
      setTogglingId(null);
    }
  };

  // --- Drag & Drop Handler ---

  const handleDragStart = (fieldId: number) => {
    setDraggingId(fieldId);
  };

  const handleDragOver = (
    e: React.DragEvent<HTMLTableRowElement>,
    fieldId: number,
  ) => {
    e.preventDefault();
    if (dragOverId !== fieldId) {
      setDragOverId(fieldId);
    }
  };

  const handleDragEnd = () => {
    setDraggingId(null);
    setDragOverId(null);
  };

  const handleDrop = async (
    e: React.DragEvent<HTMLTableRowElement>,
    targetFieldId: number,
  ) => {
    e.preventDefault();
    const fid = effectiveFormId;

    const sourceId = draggingId;
    setDraggingId(null);
    setDragOverId(null);

    if (!fid || !Number.isFinite(fid) || fid <= 0) {
      alert(
        'Formular-ID konnte nicht ermittelt werden. Bitte Seite neu laden oder erneut versuchen.',
      );
      return;
    }

    if (!sourceId || sourceId === targetFieldId) {
      return;
    }

    const list = sorted;
    const fromIndex = list.findIndex((f) => f.id === sourceId);
    const toIndex = list.findIndex((f) => f.id === targetFieldId);

    if (fromIndex === -1 || toIndex === -1) {
      return;
    }

    const targetOrder = toIndex + 1; // 1-basiert

    setReorderingId(sourceId);
    setError(null);

    try {
      const res = await fetch(
        `/api/admin/forms/${fid}/fields/${sourceId}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'x-user-id': '1',
          },
          body: JSON.stringify({
            order: targetOrder,
          }),
        },
      );

      if (!res.ok) {
        let message = 'Fehler beim Ändern der Reihenfolge (Drag & Drop)';
        try {
          const data = await res.json();
          if (data?.message) message = data.message;
        } catch {
          // ignore
        }
        throw new Error(message);
      }

      await reloadFromServer(fid);
    } catch (err: any) {
      setError(
        err.message || 'Unbekannter Fehler beim Reorder (Drag & Drop)',
      );
    } finally {
      setReorderingId(null);
    }
  };

  return (
    <div className="mt-6 space-y-3">
      {/* Header + Button */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-700">
            Felder
          </h2>
          <p className="text-xs text-gray-500">
            Verwalte Struktur und Reihenfolge der Felder für dieses Formular.
            Du kannst Zeilen per Drag &amp; Drop verschieben oder die Pfeile
            nutzen.
          </p>
        </div>

        <button
          type="button"
          className="rounded bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-500"
          onClick={openCreateDialog}
        >
          + Neues Feld hinzufügen
        </button>
      </div>

      {/* Tabelle oder Empty-State */}
      {sorted.length === 0 ? (
        <div className="rounded-md border border-dashed border-gray-300 p-4 text-sm text-gray-600">
          Für dieses Formular sind derzeit keine Felder definiert.
          <br />
          <span className="text-xs text-gray-500">
            Lege mit &laquo;Neues Feld hinzufügen&raquo; das erste Feld an.
          </span>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-md border border-gray-200 bg-white">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-600">
              <tr>
                <th className="px-3 py-2">Order</th>
                <th className="px-3 py-2">Label</th>
                <th className="px-3 py-2">Key</th>
                <th className="px-3 py-2">Typ</th>
                <th className="px-3 py-2 text-center">Required</th>
                <th className="px-3 py-2 text-center">Aktiv</th>
                <th className="px-3 py-2">Aktionen</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((field) => {
                const isDragging = draggingId === field.id;
                const isDragOver =
                  dragOverId === field.id && draggingId !== field.id;

                return (
                  <tr
                    key={field.id}
                    draggable
                    onDragStart={() => handleDragStart(field.id)}
                    onDragOver={(e) => handleDragOver(e, field.id)}
                    onDrop={(e) => handleDrop(e, field.id)}
                    onDragEnd={handleDragEnd}
                    className={[
                      'border-b last:border-b-0 transition-colors',
                      'hover:bg-gray-50',
                      isDragging ? 'opacity-60' : '',
                      isDragOver ? 'ring-2 ring-emerald-400' : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                  >
                    <td className="px-3 py-2 align-middle text-xs text-gray-500 cursor-move">
                      {field.order}
                    </td>
                    <td className="px-3 py-2 align-middle cursor-move">
                      <div className="font-medium text-gray-900">
                        {field.label}
                      </div>
                      <div className="text-xs text-gray-500">
                        {field.placeholder || field.helpText}
                      </div>
                    </td>
                    <td className="px-3 py-2 align-middle text-xs font-mono text-gray-700">
                      {field.key}
                    </td>
                    <td className="px-3 py-2 align-middle text-xs text-gray-700">
                      {field.type}
                    </td>
                    <td className="px-3 py-2 align-middle text-center text-xs">
                      {field.required ? (
                        <span className="inline-flex items-center rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-semibold text-red-700">
                          Ja
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-gray-50 px-2 py-0.5 text-[11px] text-gray-600">
                          Nein
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2 align-middle text-center text-xs">
                      {field.isActive ? (
                        <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                          Aktiv
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-[11px] text-gray-500">
                          Inaktiv
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2 align-middle">
                      <div className="flex flex-wrap gap-1">
                        <button
                          type="button"
                          className="rounded border border-gray-300 px-2 py-0.5 text-xs text-gray-700 hover:bg-gray-100"
                          onClick={() => openEditDialog(field)}
                        >
                          Bearbeiten
                        </button>
                        <button
                          type="button"
                          className="rounded border border-red-300 px-2 py-0.5 text-xs text-red-700 hover:bg-red-50 disabled:opacity-60"
                          onClick={() => handleDelete(field)}
                          disabled={deletingId === field.id}
                        >
                          {deletingId === field.id ? 'Lösche…' : 'Löschen'}
                        </button>
                        <button
                          type="button"
                          className="rounded border border-gray-300 px-1.5 py-0.5 text-xs text-gray-700 hover:bg-gray-100 disabled:opacity-60"
                          onClick={() => handleMove(field, 'up')}
                          title="Nach oben"
                          disabled={
                            reorderingId === field.id || field.order <= 1
                          }
                        >
                          {reorderingId === field.id ? '…' : '↑'}
                        </button>
                        <button
                          type="button"
                          className="rounded border border-gray-300 px-1.5 py-0.5 text-xs text-gray-700 hover:bg-gray-100 disabled:opacity-60"
                          onClick={() => handleMove(field, 'down')}
                          title="Nach unten"
                          disabled={
                            reorderingId === field.id ||
                            field.order >= items.length
                          }
                        >
                          {reorderingId === field.id ? '…' : '↓'}
                        </button>
                        <button
                          type="button"
                          className="rounded border border-gray-300 px-2 py-0.5 text-xs text-gray-700 hover:bg-gray-100 disabled:opacity-60"
                          onClick={() => handleToggleActive(field)}
                          disabled={togglingId === field.id}
                        >
                          {togglingId === field.id
                            ? 'Aktualisiere…'
                            : field.isActive
                            ? 'Deaktivieren'
                            : 'Aktivieren'}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Einfaches Modal/Overlay für Create/Edit */}
      {isDialogOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/30 px-4">
          <div className="w-full max-w-lg rounded-lg bg-white p-5 shadow-lg">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-900">
                {mode === 'create'
                  ? 'Neues Feld hinzufügen'
                  : `Feld bearbeiten (#${editingField?.id})`}
              </h3>
              <button
                type="button"
                className="text-sm text-gray-500 hover:text-gray-800"
                onClick={closeDialog}
                disabled={saving}
              >
                ✕
              </button>
            </div>

            {error && (
              <div className="mb-3 rounded border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-medium text-gray-700">
                    Label*
                  </label>
                  <input
                    type="text"
                    className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-sm"
                    value={label}
                    onChange={(e) => setLabel(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700">
                    Key*
                  </label>
                  <input
                    type="text"
                    className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-sm font-mono"
                    value={keyValue}
                    onChange={(e) => setKeyValue(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-medium text-gray-700">
                    Typ*
                  </label>
                  <select
                    className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-sm"
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                  >
                    {FIELD_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center gap-3 pt-5">
                  <label className="inline-flex items-center gap-2 text-xs text-gray-700">
                    <input
                      type="checkbox"
                      className="h-3.5 w-3.5 rounded border-gray-300"
                      checked={required}
                      onChange={(e) => setRequired(e.target.checked)}
                    />
                    Pflichtfeld
                  </label>
                  <label className="inline-flex items-center gap-2 text-xs text-gray-700">
                    <input
                      type="checkbox"
                      className="h-3.5 w-3.5 rounded border-gray-300"
                      checked={isActive}
                      onChange={(e) => setIsActive(e.target.checked)}
                    />
                    Aktiv
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-medium text-gray-700">
                    Placeholder
                  </label>
                  <input
                    type="text"
                    className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-sm"
                    value={placeholder}
                    onChange={(e) => setPlaceholder(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700">
                    Help-Text
                  </label>
                  <input
                    type="text"
                    className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-sm"
                    value={helpText}
                    onChange={(e) => setHelpText(e.target.value)}
                  />
                </div>
              </div>

              <div className="mt-4 flex justify-end gap-2">
                <button
                  type="button"
                  className="rounded border border-gray-300 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50"
                  onClick={closeDialog}
                  disabled={saving}
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  className="rounded bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-500 disabled:opacity-60"
                  disabled={saving}
                >
                  {saving
                    ? mode === 'create'
                      ? 'Speichere...'
                      : 'Aktualisiere...'
                    : mode === 'create'
                    ? 'Feld anlegen'
                    : 'Änderungen speichern'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
