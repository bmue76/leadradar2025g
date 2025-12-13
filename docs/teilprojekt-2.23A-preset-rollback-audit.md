# LeadRadar2025g – Teilprojekt 2.23A
Admin – Preset Rollback & Audit (createdByUserId)

## Ziel
1) **Rollback**
- Eine Revision (version) als „aktuelles Preset“ setzen
- Rollback erzeugt eine neue Current-Version (**snapshotVersion++**)
- Alte Current wird als Revision weggeschrieben (History bleibt vollständig)

2) **Audit**
- `FormPresetRevision` erhält `createdByUserId` (nullable)
- **Update** + **Rollback** schreiben `createdByUserId` in die neu erzeugte Revision

## Ausgangslage
- Teilprojekt 2.22 abgeschlossen:
  - `FormPresetRevision` existiert (tenant-scoped, unique `[presetId, version]`)
  - `/api/admin/form-presets/[id]/update` existiert
  - `/admin/presets/[id]` kann Revisions anzeigen/previewen
- `requireAuthContext` liefert `user (id)` + `tenant`

---

## Umsetzung

### Block 1 – Prisma Migration (Audit)
**Änderungen**
- `FormPresetRevision`:
  - `createdByUserId Int?`
  - optional Relation zu `User` (onDelete: SetNull)
- `User`:
  - Backrelation `presetRevisionsCreated`

**Dateien**
- `backend/prisma/schema.prisma`
- Migration: `backend/prisma/migrations/*_add_preset_revision_created_by_user/`

---

### Block 2 – Contracts & Validation
**Neue Types**
- `RollbackPresetRequest { version: number }`
- `RollbackPresetResponse { preset, revisions }`

**Zod**
- `zRollbackPresetRequest`: `version` = `int().positive()`

**Error Codes (api-response)**
- `REVISION_NOT_FOUND`
- `INVALID_VERSION`
- `REVISION_CONFLICT`
- plus bestehende: `PRESET_NOT_FOUND`, `TENANT_MISMATCH`, ...

**Dateien**
- `backend/lib/types/form-presets.ts`
- `backend/lib/validation/form-presets.ts`
- `backend/lib/api-response.ts`

---

### Block 3 – Admin API: Rollback Endpoint + Audit in Update
#### A) Update-Audit
- `/api/admin/form-presets/[id]/update` schreibt beim Erzeugen der Revision:
  - `createdByUserId = auth.user.id`

#### B) Rollback Endpoint
**Route**
- `POST /api/admin/form-presets/[id]/rollback`
- Body: `{ "version": number }`

**Transaction Ablauf**
1. Preset laden (tenant-scope strikt, sonst `TENANT_MISMATCH`)
2. Revision `presetId + version` laden (tenant-scope)
3. Current als neue Revision speichern  
   - `version = preset.snapshotVersion`
   - `snapshot = preset.snapshot`
   - `createdByUserId = auth.user.id`
4. Preset updaten  
   - `snapshot = revision.snapshot`
   - `snapshotVersion = preset.snapshotVersion + 1`
5. Return: `preset + revisions(desc)`

**Konflikte**
- Unique-Clash bei Revision create -> `409` mit `REVISION_CONFLICT`

**Zusatz**
- `GET /api/admin/form-presets/[id]` liefert bei Revisions nun auch `createdByUserId`

**Dateien**
- `backend/app/api/admin/form-presets/[id]/update/route.ts`
- `backend/app/api/admin/form-presets/[id]/rollback/route.ts` (neu)
- `backend/app/api/admin/form-presets/[id]/route.ts`

---

### Block 4 – Admin UI: Rollback Button + Audit Anzeige
**UI-Behavior**
- In Revision-Ansicht (`?v=X`) erscheint Button:
  - **„Rollback auf vX“** (Confirm Dialog)
- Nach Erfolg:
  - Notice: **„Rollback erstellt: vY“** (Y = neue Current-Version)
  - Redirect auf `/admin/presets/[id]` (ohne Query)
- Versionsliste zeigt optional:
  - `· erstellt von <id>` wenn vorhanden

**Tech**
- Notice wird via `sessionStorage` über Redirect/Refresh hinweg gehalten.

**Dateien**
- `backend/app/(admin)/admin/presets/[id]/page.tsx`
- `backend/app/(admin)/admin/presets/[id]/PresetDetailActions.tsx`

---

## Manuelle Tests

### API
1) Presets auflisten:
```bash
curl -s "http://localhost:3000/api/admin/form-presets?page=1&limit=50" -H "x-user-id: 1"
