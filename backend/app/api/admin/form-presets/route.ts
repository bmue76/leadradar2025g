import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'

function getTenantId(req: NextRequest): number {
  const h = req.headers.get('x-tenant-id')
  const n = h ? Number(h) : NaN
  return Number.isFinite(n) ? n : 1
}

function getUserId(req: NextRequest): number | null {
  const h = req.headers.get('x-user-id')
  const n = h ? Number(h) : NaN
  return Number.isFinite(n) ? n : null
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

function snapshotFieldCount(snapshot: unknown): number {
  if (!isPlainObject(snapshot)) return 0
  const fields = snapshot.fields
  return Array.isArray(fields) ? fields.length : 0
}

export async function GET(req: NextRequest) {
  const userId = getUserId(req)
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const tenantId = getTenantId(req)

  const presets = await prisma.formPreset.findMany({
    where: { tenantId },
    orderBy: { updatedAt: 'desc' },
  })

  const items = presets.map((p) => ({
    id: p.id,
    name: p.name,
    description: p.description,
    category: p.category,
    snapshotVersion: p.snapshotVersion,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
    fieldCount: snapshotFieldCount(p.snapshot),
  }))

  return NextResponse.json({ presets: items })
}

const CreatePresetSchema = z.object({
  formId: z.number().int().positive(),
  name: z.string().min(1).max(120),
  description: z.string().max(2000).optional().nullable(),
  category: z.string().min(1).max(80),
})

export async function POST(req: NextRequest) {
  const userId = getUserId(req)
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const tenantId = getTenantId(req)

  const body = await req.json().catch(() => null)
  const parsed = CreatePresetSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid payload', details: parsed.error.flatten() },
      { status: 400 },
    )
  }

  const { formId, name, description, category } = parsed.data

  const form = await prisma.form.findFirst({
    where: { id: formId, tenantId },
    include: {
      fields: {
        orderBy: [{ order: 'asc' }, { id: 'asc' }],
      },
    },
  })

  if (!form) {
    return NextResponse.json({ error: 'Form not found' }, { status: 404 })
  }

  const snapshot = {
    form: {
      name: form.name ?? null,
      title: (form as any).title ?? null,
      description: form.description ?? null,
      status: (form as any).status ?? (form as any).state ?? null,
      config: (form as any).config ?? null,
    },
    fields: form.fields.map((f) => ({
      key: f.key,
      label: f.label,
      type: f.type,
      placeholder: f.placeholder,
      helpText: f.helpText,
      required: f.required,
      order: f.order,
      isActive: f.isActive,
      config: (f as any).config ?? undefined,
    })),
  }

  const created = await prisma.formPreset.create({
    data: {
      tenantId,
      name,
      description: description ?? null,
      category,
      snapshotVersion: 1,
      snapshot: snapshot as any,
    },
  })

  return NextResponse.json({
    preset: {
      id: created.id,
      name: created.name,
      category: created.category,
      snapshotVersion: created.snapshotVersion,
    },
  })
}
