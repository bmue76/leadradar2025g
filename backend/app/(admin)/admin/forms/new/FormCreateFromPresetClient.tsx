'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import type { PresetItem } from './types'

type ApiResponse = { formId?: number; id?: number; form?: { id?: number } }

export default function FormCreateFromPresetClient(props: { initialPresets: PresetItem[] }) {
  const router = useRouter()
  const presets = props.initialPresets ?? []

  const [name, setName] = React.useState('Neues Formular')
  const [description, setDescription] = React.useState('')
  const [presetId, setPresetId] = React.useState<number | ''>('')
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const canCreateFromPreset = presets.length > 0 && presetId !== ''

  async function handleCreate() {
    setIsSubmitting(true)
    setError(null)

    try {
      const trimmedName = name.trim()
      const trimmedDesc = description.trim()

      // WICHTIG: description niemals als null senden (Zod erwartet string|undefined)
      const payload: { presetId?: number; name: string; description?: string } = {
        presetId: presetId === '' ? undefined : Number(presetId),
        name: trimmedName.length ? trimmedName : 'Neues Formular',
      }

      if (trimmedDesc.length) payload.description = trimmedDesc

      const res = await fetch('/api/admin/forms/from-preset', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': '1',
        },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const txt = await res.text().catch(() => '')
        throw new Error(`Erstellen fehlgeschlagen (Status ${res.status}) ${txt}`)
      }

      const data = (await res.json().catch(() => ({}))) as ApiResponse

      const formId =
        (typeof data.formId === 'number' ? data.formId : undefined) ??
        (typeof data.id === 'number' ? data.id : undefined) ??
        (typeof data.form?.id === 'number' ? data.form.id : undefined)

      if (!formId) {
        throw new Error('API hat keine formId zurückgegeben.')
      }

      router.push(`/admin/forms/${formId}`)
      router.refresh()
    } catch (e) {
      setError((e as Error).message ?? 'Unbekannter Fehler')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <header className="border-b border-slate-200 pb-4">
        <h1 className="text-lg font-semibold text-slate-900">Neues Formular</h1>
        <p className="mt-1 text-sm text-slate-600">
          Du kannst ein leeres Formular erstellen oder (falls vorhanden) aus einer Vorlage starten.
        </p>
      </header>

      {error && <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

      <section className="space-y-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid gap-4 md:grid-cols-2">
          <label className="block text-sm font-medium text-slate-700">
            Name
            <input
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </label>

          <label className="block text-sm font-medium text-slate-700">
            Vorlage (optional)
            <select
              className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
              value={presetId}
              onChange={(e) => {
                const v = e.target.value
                setPresetId(v === '' ? '' : Number(v))
              }}
            >
              <option value="">— leeres Formular —</option>
              {presets.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.category}, {p.fieldCount} Felder)
                </option>
              ))}
            </select>

            {presets.length === 0 && (
              <p className="mt-1 text-xs text-slate-500">
                Noch keine Vorlagen vorhanden – „Erstellen“ legt ein leeres Formular an.
              </p>
            )}
          </label>
        </div>

        <label className="block text-sm font-medium text-slate-700">
          Beschreibung (optional)
          <textarea
            rows={3}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </label>

        <div className="flex items-center justify-between">
          <div className="text-xs text-slate-500">
            {presetId === ''
              ? 'Erstellt ein leeres Formular.'
              : canCreateFromPreset
                ? 'Erstellt ein Formular aus der gewählten Vorlage.'
                : 'Bitte Vorlage wählen oder leer erstellen.'}
          </div>

          <button
            type="button"
            onClick={handleCreate}
            disabled={isSubmitting}
            className={`inline-flex items-center rounded-md px-4 py-2 text-sm font-medium ${
              isSubmitting
                ? 'cursor-not-allowed bg-slate-200 text-slate-500'
                : 'bg-sky-600 text-white hover:bg-sky-700'
            }`}
          >
            {isSubmitting ? 'Erstelle …' : 'Erstellen'}
          </button>
        </div>
      </section>
    </div>
  )
}
