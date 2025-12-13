import type { Metadata } from 'next'
import Link from 'next/link'
import FormCreateFromPresetClient from './FormCreateFromPresetClient'
import type { PresetItem } from './types'
import { prisma } from '@/lib/prisma'

export const metadata: Metadata = {
  title: 'LeadRadar – Neues Formular',
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

function snapshotFieldCount(snapshot: unknown): number {
  if (!isPlainObject(snapshot)) return 0
  const fields = snapshot.fields
  return Array.isArray(fields) ? fields.length : 0
}

export default async function AdminFormNewPage() {
  const presetsRaw = await prisma.formPreset.findMany({
    orderBy: { updatedAt: 'desc' },
  })

  const initialPresets: PresetItem[] = presetsRaw.map((p) => ({
    id: p.id,
    name: p.name,
    description: p.description,
    category: p.category,
    snapshotVersion: p.snapshotVersion,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
    fieldCount: snapshotFieldCount(p.snapshot),
  }))

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Neues Formular</h1>
          <p className="text-sm text-slate-600">
            Wähle eine Vorlage (Preset) als Ausgangspunkt oder verwalte deine Vorlagen in der Library.
          </p>
        </div>

        <Link
          href="/admin/presets"
          className="inline-flex items-center justify-center rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
        >
          Zur Vorlagen-Library
        </Link>
      </div>

      <FormCreateFromPresetClient initialPresets={initialPresets} />
    </div>
  )
}
