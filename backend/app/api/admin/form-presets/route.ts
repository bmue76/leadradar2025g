import { type NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuthContext } from '@/lib/auth-context'
import { jsonError, jsonOk } from '@/lib/api-response'
import { zCreatePresetRequest } from '@/lib/validation/form-presets'

export const dynamic = 'force-dynamic'

function isAuthError(err: unknown) {
  return (
    err instanceof Error &&
    (err.message.includes('x-user-id') || err.message.includes('User or tenant not found'))
  )
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

function snapshotFieldCount(snapshot: unknown): number {
  if (!isPlainObject(snapshot)) return 0
  const fields = snapshot.fields
  return Array.isArray(fields) ? fields.length : 0
}

function parseIntParam(v: string | null): number | null {
  if (!v) return null
  const n = Number.parseInt(v, 10)
  return Number.isFinite(n) ? n : null
}

export async function GET(req: NextRequest) {
  try {
    const { tenant } = await requireAuthContext(req)

    const url = new URL(req.url)
    const qRaw = url.searchParams.get('q')
    const categoryRaw = url.searchParams.get('category')

    const q = qRaw?.trim() ? qRaw.trim() : null
    const category = categoryRaw?.trim() ? categoryRaw.trim() : null

    const pageParsed = parseIntParam(url.searchParams.get('page'))
    const limitParsed = parseIntParam(url.searchParams.get('limit'))

    if (q && q.length > 200) {
      return jsonError(400, 'VALIDATION_ERROR', 'Query too long (max 200)')
    }
    if (category && category.length > 80) {
      return jsonError(400, 'VALIDATION_ERROR', 'Category too long (max 80)')
    }

    // Pagination optional
    const usePaging = pageParsed !== null || limitParsed !== null
    const page = usePaging ? (pageParsed ?? 1) : null
    const limit = usePaging ? (limitParsed ?? 50) : null

    if (usePaging) {
      if (!page || page < 1) return jsonError(400, 'VALIDATION_ERROR', 'Invalid page')
      if (!limit || limit < 1 || limit > 200)
        return jsonError(400, 'VALIDATION_ERROR', 'Invalid limit (1..200)')
    }

    const where: any = { tenantId: tenant.id }

    if (category) {
      where.category = category
    }

    if (q) {
      where.OR = [{ name: { contains: q } }, { category: { contains: q } }]
    }

    const skip = usePaging ? (page! - 1) * limit! : undefined
    const take = usePaging ? limit! : undefined

    const [presets, total] = await Promise.all([
      prisma.formPreset.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        ...(usePaging ? { skip, take } : {}),
      }),
      usePaging ? prisma.formPreset.count({ where }) : Promise.resolve(null),
    ])

    // Facets (für Kategorie-Dropdown) – unabhängig von Filtern: nur tenant-scoped
    const categories = await prisma.formPreset
      .groupBy({
        by: ['category'],
        where: { tenantId: tenant.id },
        _count: { _all: true },
        orderBy: { category: 'asc' },
      })
      .then((rows) => rows.map((r) => ({ category: r.category, count: r._count._all })))
      .catch(() => [])

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

    if (!usePaging) {
      return jsonOk({ presets: items, categories })
    }

    const totalNum = total ?? items.length
    const hasMore = (skip ?? 0) + items.length < totalNum

    return jsonOk({
      presets: items,
      categories,
      meta: {
        page,
        limit,
        total: totalNum,
        hasMore,
      },
    })
  } catch (error) {
    if (isAuthError(error)) {
      return jsonError(401, 'UNAUTHORIZED', 'Authentication required')
    }

    console.error('Error in GET /api/admin/form-presets', error)
    return jsonError(500, 'INTERNAL_ERROR', 'Internal server error')
  }
}

export async function POST(req: NextRequest) {
  try {
    const { tenant } = await requireAuthContext(req)

    const body = await req.json().catch(() => null)
    if (!body) {
      return jsonError(400, 'INVALID_JSON', 'Invalid JSON')
    }

    const parsed = zCreatePresetRequest.safeParse(body)
    if (!parsed.success) {
      return jsonError(400, 'VALIDATION_ERROR', 'Invalid payload', parsed.error.flatten())
    }

    const { formId, name, description, category } = parsed.data

    const form = await prisma.form.findFirst({
      where: { id: formId, tenantId: tenant.id },
      include: {
        fields: {
          orderBy: [{ order: 'asc' }, { id: 'asc' }],
        },
      },
    })

    if (!form) {
      return jsonError(404, 'NOT_FOUND', 'Form not found')
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
        tenantId: tenant.id,
        name,
        description: description ?? null,
        category,
        snapshotVersion: 1,
        snapshot: snapshot as any,
      },
    })

    return jsonOk(
      {
        preset: {
          id: created.id,
          name: created.name,
          category: created.category,
          snapshotVersion: created.snapshotVersion,
        },
      },
      201,
    )
  } catch (error) {
    if (isAuthError(error)) {
      return jsonError(401, 'UNAUTHORIZED', 'Authentication required')
    }

    console.error('Error in POST /api/admin/form-presets', error)
    return jsonError(500, 'INTERNAL_ERROR', 'Internal server error')
  }
}
