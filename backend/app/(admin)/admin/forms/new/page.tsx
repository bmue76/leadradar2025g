import type { Metadata } from 'next'
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

  return <FormCreateFromPresetClient initialPresets={initialPresets} />
}
