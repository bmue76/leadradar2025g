# Teilprojekt 2.20 – Admin-UI: Preset Library & Management (Preview, Löschen, Suche)

## Status
✅ Abgeschlossen (API + Admin-UI + Navigation)

## Ziel
Eine nutzerfreundliche Preset-Verwaltung:
- Neue Admin-Seite: `/admin/presets` (Liste, Suche, Kategorie-Filter, Empty-State + CTA)
- Preset Preview: `/admin/presets/[id]` (Meta + Feldliste + Snapshot-Infos + Raw JSON)
- Preset löschen: Confirm, danach refresh
- UX-Integration: Sidebar-Menüpunkt „Vorlagen“ → `/admin/presets`
- Existing: `/admin/forms/new` Preset-Flow bleibt bestehen

---

## Umsetzung

### Block 1 – Contracts/API ausrunden ✅
**Endpoint: GET `/api/admin/form-presets`**
- Query Params:
  - `q` (Search über name/category, contains)
  - `category` (exakter Filter)
  - optional `page`/`limit` (Pagination, `limit` 1..200)
- Response:
  - `presets[]` (List Items inkl. `fieldCount`)
  - `categories[]` (Facet-Liste `{category,count}` tenant-scoped)
  - optional `meta` bei Pagination `{page,limit,total,hasMore}`
- Errors konsistent: `{ error, code, details? }`

**Endpoint: GET `/api/admin/form-presets/[id]`**
- Liefert Preset inkl:
  - Meta (name/category/description/snapshotVersion/createdAt/updatedAt)
  - `snapshot` (raw)
  - `snapshotSummary.fields[]` (order,label,key,type,required,active)
  - `snapshotInfo.hasTheme`, `snapshotInfo.hasContactSlots` (heuristische Keys)

**Endpoint: DELETE `/api/admin/form-presets/[id]`**
- Tenant-scoped Delete
- Response: `{ ok: true }`

**Auth / Tenant Scoping**
- `x-user-id` Header wird via `requireAuthContext()` geladen → Tenant wird daraus abgeleitet.
- (Dev-Fallback in Admin-Seiten: `x-user-id` default `"1"`)

**Next.js 16 / Turbopack Besonderheiten**
- `context.params` kann Promise sein → `await context.params`
- `searchParams` kann Promise sein → `await Promise.resolve(searchParams)`
- `headers()` kann Promise sein → `await headers()`

---

### Block 2 – Admin-UI: Presets Liste ✅
**Route:** `/admin/presets`
- Server Component lädt Presets + Kategorie-Facets von API
- Filter via URL Query Params (`q`, `category`)
- Client:
  - Search Input (Debounce)
  - Kategorie-Dropdown
  - Delete Button (Confirm, optimistic remove, danach `router.refresh()`)
  - Empty-State mit CTA „Zu den Formularen“ bzw. „Preset erstellen“

---

### Block 3 – Preview ✅
**Route:** `/admin/presets/[id]`
- Meta + Feldliste aus `snapshotSummary`
- Snapshot-Infos (theme/contactSlots)
- Optional: `details` → Raw Snapshot JSON (aufklappbar)
- Delete Action auf Detailseite inkl. redirect zurück zur Library

---

### Block 4 – Navigation ✅
- Sidebar Menüpunkt ergänzt:
  - „Vorlagen“ → `/admin/presets`
  - Active-State für `/admin/presets` und `/admin/presets/[id]`

---

## Geänderte / neue Dateien

### API / Types
- `backend/app/api/admin/form-presets/route.ts`
- `backend/app/api/admin/form-presets/[id]/route.ts`
- `backend/lib/validation/form-presets.ts`
- `backend/lib/types/form-presets.ts`

### Admin-UI
- `backend/app/(admin)/admin/presets/page.tsx`
- `backend/app/(admin)/admin/presets/PresetsClient.tsx`
- `backend/app/(admin)/admin/presets/[id]/page.tsx`
- `backend/app/(admin)/admin/presets/[id]/PresetDetailActions.tsx`

### Navigation
- `backend/app/(admin)/admin/AdminSidebar.tsx`

---

## Tests

### Lint
```bash
cd /c/dev/leadradar2025g/backend
npm run lint
