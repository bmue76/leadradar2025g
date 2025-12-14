# LeadRadar2025g – Projektübersicht

SaaS-Lösung zur digitalen Leaderfassung auf Messen.  
Backend-first-Ansatz mit Next.js App Router (API-only Backend), Prisma/PostgreSQL, Admin-UI und später Mobile-App.

---

## Architektur & Tech-Stack (Kurzüberblick)

- **Backend / API**
  - Next.js 16 App Router im Ordner `backend/`
  - TypeScript, API-Routen unter `backend/app/api/...`
- **Datenbank**
  - PostgreSQL
  - Prisma 7 als ORM
- **Multi-Tenancy & Auth**
  - Mandantenmodell mit `Tenant` und `User` (inkl. `tenantId`-Bezug)
  - `requireAuthContext(req)` liest `x-user-id`, lädt User & Tenant und schützt Admin-Routen
  - Seed mit Demo-Tenant/-User (z. B. `x-user-id: 1`)
- **Admin-UI**
  - Route-Group `(admin)` mit `/admin/...`
  - Mischung aus Server Components (Daten-Fetching) und Client Components (Builder, Tabellen, Dialoge)
- **Mobile-App (geplant)**
  - Eigenes Expo/React Native Projekt (Phase 3.x)
  - Mobile API ist bereits versioniert `/api/mobile/v1/...` mit DTOs + Mappern

---

## Status-Legende

✅ abgeschlossen 🟡 in Arbeit ⚪ geplant

---

## Backend-Teilprojekte (1.x)

### 1.0 – Backend Foundation ✅
**Ziel:** Basisprojekt mit Next.js & Prisma lauffähig machen.  
**Ergebnis:** Next.js/TS/ESLint Setup, Prisma/Postgres, Dev-Setup verifiziert.

---

### 1.1 – Auth & Tenant Handling ✅
**Ziel:** Einfache Mandantenfähigkeit + Auth-Kontext.  
**Ergebnis:** `Tenant`, `User`, `requireAuthContext(req)` (x-user-id), konsequentes Tenant-Scoping.

---

### 1.2 – Datenmodell & Prisma-Schema (Forms & Leads Core) ✅
**Ziel:** Kern-Domain für Formulare & Leads modellieren.  
**Ergebnis (Auszug):**
- Modelle: `Form`, `FormField`, `Lead`
- Enums: `FormStatus`, `FormFieldType`
- DTOs/Typen: `backend/lib/types/forms.ts`

---

### 1.3 – API-Basis & Routing (Forms & Leads) ✅
**Ziel:** Tenant-sichere API für Formularverwaltung und Lead-Anlage.  
**Ergebnis (Auszug):**
- Admin: `GET/POST /api/admin/forms`, `GET/PATCH/DELETE /api/admin/forms/[id]`, `GET /api/admin/forms/[id]/leads`
- Public: `GET /api/forms/[id]/active`, `POST /api/leads` (Lead.values als JSON)

---

### 1.4 – Leads: E-Mail-Flows (Danke & Innendienst) ✅
**Ziel:** Nach Lead-Erfassung automatisierte E-Mail-Flows auslösen.  
**Ergebnis:** Mail-Infrastruktur (Provider Switch), Templates, Orchestrierung in `POST /api/leads`.

---

### 1.5 – Stripe Billing & Access Control (Backend) ✅
**Ergebnis (Auszug):**
- Modell `Subscription` + Enum `SubscriptionStatus`
- Stripe Helper `lib/stripe.ts`, Webhooks, Checkout
- Endpoint `GET /api/admin/billing/status`
- Hinweis: aktuell noch Dummy-Keys; echte Test-Keys folgen vor Beta.

---

### 1.6 – Events (Messen) + Formular-Bindung ✅
**Ergebnis (Auszug):**
- Modelle: `Event`, `EventForm`, `Lead.eventId` (optional)
- Admin: Event-CRUD + Form-Zuordnung
- Grundlage für mobile Event-/Form-Auswahl.

---

### 1.8 – Backend Security & Hardening (Rate Limiting, API-Keys & Validation) ✅
**Ergebnis (Auszug):**
- Prisma Model `ApiKey` (Tenant Relation, Hash, Active, lastUsedAt)
- API-Key Context: `requireApiKeyContext(req)` via `x-api-key`
- In-Memory Rate Limiting (globalThis store)
- Rate Limits auf Public-/Mobile-Endpunkten
- Validations via Zod.

---

### 1.9 – Mobile-API: API-Key-Auth & Access Control ✅
**Ergebnis (Auszug):**
- Policy: Mobile-/Integrations-Endpunkte sind API-Key-pflichtig (`x-api-key`)
- Tenant-Scope strikt über ApiKeyContext
- Dual Rate Limit (API-Key + IP)
- Konsistente Fehler `{ error, code, details? }` + `Retry-After` bei 429
- Doku: `docs/teilprojekt-1.9-mobile-api-api-keys.md`

---

### 1.10 – Mobile-API: Contracts & Versioning (v1) ✅
**Ergebnis (Auszug):**
- Mobile DTOs: `backend/lib/types/mobile.ts`
- Prisma → DTO Mapper: `backend/lib/mobile-mappers.ts`
- v1 Routes:
  - `GET /api/mobile/v1/events`
  - `GET /api/mobile/v1/events/[id]/forms`
  - `GET /api/mobile/v1/forms/[id]`
  - `POST /api/mobile/v1/leads`
- Contract-Doku: `docs/teilprojekt-1.10-mobile-api-contracts-v1.md`

---

## Admin-UI Teilprojekte (2.x)

### 2.1 – Admin-UI: Forms-CRUD (List & Detail) ✅
- `/admin/forms` Liste, `/admin/forms/[id]` Detail
- Datenquelle: `GET /api/admin/forms`, `GET /api/admin/forms/[id]`

---

### 2.2 – Admin-UI: FormFields-CRUD & Reihenfolge ✅
- Feldverwaltung inkl. Reihenfolge (persistiert über `order`)
- Admin API: `PATCH /api/admin/forms/[id]/fields/[fieldId]` (u. a. order)

---

### 2.3 – Admin-UI: Leads-Listen & Export ✅
- `/admin/forms/[id]/leads` + Export-Button (CSV)

---

### 2.4 – Admin-UI: Layout-Shell & Sidebar-Navigation ✅
- Layout: `app/(admin)/admin/layout.tsx`
- Sidebar Navigation, Active-State via `usePathname()`

---

### 2.5 – Admin-Formbuilder: Workspace-Basis ✅
- `/admin/forms/[id]` als zentraler Workspace (Builder + Preview)

---

### 2.6 – FormDetail & Builder fusionieren ✅
- `/admin/forms/[id]` ist zentrale Builder-Seite
- Legacy Redirects/Altseiten entkoppelt

---

### 2.7 – Admin-Formbuilder: Properties-Panel & Feldbearbeitung ✅
- Inline Editing (Label, Placeholder, HelpText, required, isActive)
- Persistenz via `PATCH /api/admin/forms/[formId]/fields/[fieldId]`

---

### 2.8 – Admin-Formbuilder: Drag & Drop Reihenfolge ✅
- Sortierung im Workspace, Persistenz via `order`

---

### 2.9 – Admin-Formbuilder: Tablet-Layout & App-nahe Vorschau ✅
- Zweispaltige Vorschau: links dynamische Felder, rechts Kontakt/OCR-Block (bisher heuristisch/placeholder)

---

### 2.10 – Admin-UI: Events (Liste, Detail & Formular-Bindung) ✅
- `/admin/events` Liste, `/admin/events/[id]` Detail
- Basis Editing + Formular-Zuordnung (je nach Stand)

---

### 2.11 – Admin-UI: Event-Erstellung & Formular-Bindung ✅
- Event Create + Zuordnung primäres Formular (je nach Stand)

---

### 2.13 – Admin-UI: Billing-Übersicht & „Abo starten“-Button ✅
- `/admin/billing` zeigt Status (aus 1.5) und triggert Checkout (Keys aktuell noch nicht produktiv)

---

### 2.14 – Admin-UI: Globale Leads-Übersicht & Filter ✅
- `/admin/leads` globale Leads Liste inkl. Filter (Event/Form/Zeitraum)

---

### 2.15 – Admin-Formbuilder: Feld-Config & Select-Optionen ✅
- Strukturierte Options-Config in `FormField.config.options`
- Zod-Validation + UI Editor + Preview Rendermodus für Choice-Felder

---

### 2.16 – Admin-UI: API-Key-Verwaltung & Mobile-Access ✅
- `/admin/api-keys` UI + Admin API
- Create/Toggle/Rename, einmalige Klartext-Key Anzeige

---

### 2.17 – Admin-Formbuilder: Kontakt/OCR Slot-Mapping (konfigurierbar) ✅
**Ziel:** Kontaktblock nicht mehr heuristisch, sondern pro Formular konfigurierbar (Fallback auf Heuristik).  
**Ergebnis (Auszug):**
- **Datenmodell:** `Form.config` (Json?) ergänzt; `config.contactSlots` speichert Slot → `FormField.id` oder `null`
- **API:** `PATCH /api/admin/forms/[id]` erweitert um `config` inkl. Validation und Merge
- **Admin-UI:** Inspector Tab „Kontaktblock“ mit Slot-Toggles, Dropdown (Auto/Feld/Deaktiviert), Dirty Tracking + Save
- **Preview:** Kontaktblock rendert anhand `contactSlots` (Mapped/Auto/Disabled) mit Fallback
- **DX Fix:** dnd-kit Hydration-Mismatch gelöst, indem DnD erst nach Client-Mount gerendert wird (SSR-safe)

Doku: `docs/teilprojekt-2.17-admin-formbuilder-kontakt-slot-mapping.md`

---

### Teilprojekt 2.18 – Admin-Formbuilder – Design Kit (Theme/Branding) ✅
- `Form.config.theme` eingeführt (Defaults + Normalisierung)
- Validation: theme = object | null, Hex-Farben validiert
- Admin-UI: Neuer Tab „Design“ (Color Picker + Font + Logo URL)
- Live Preview im Tablet-Layout; Speichern & Reset; Default => theme:null (clear)

---

### Teilprojekt 2.19 – Admin-Formbuilder – Presets/Vorlagen (Form speichern & daraus neu erstellen) ✅
- Prisma Model `FormPreset` inkl. `tenantId`, `name`, `category`, `description`, `snapshotVersion`, `snapshot`
- Admin API:
  - `GET/POST /api/admin/form-presets`
  - `POST /api/admin/forms/from-preset` (Formular aus Vorlage erstellen)
- Admin-UI:
  - Preset als Vorlage speichern aus dem Formbuilder (inkl. Kategorie)
  - `/admin/forms/new` kann aus Preset ein neues Formular erzeugen

---

### Teilprojekt 2.20 – Admin-UI – Preset Library & Management (Preview, Löschen, Suche) ✅
- Neue Seite: `/admin/presets`
  - Liste (Name, Kategorie, FieldCount, CreatedAt)
  - Suche (`q`) + Kategorie-Filter (`category`) via URL Query Params
  - Empty-State + CTA „Preset erstellen“ (führt zu `/admin/forms`)
  - Delete mit Confirm + Refresh
- Preview:
  - Detailseite `/admin/presets/[id]` mit Meta, Feldliste aus `snapshotSummary`, Snapshot-Info (theme/contactSlots) + optional Raw JSON
- API-Erweiterungen:
  - `GET /api/admin/form-presets` unterstützt `q`, `category`, optional `page`/`limit`, liefert zusätzlich `categories[]` (Facet)
  - `GET /api/admin/form-presets/[id]` (inkl. snapshot + snapshotSummary)
  - `DELETE /api/admin/form-presets/[id]` tenant-scoped
  - Konsistentes Error-Format: `{ error, code, details? }`
- Navigation:
  - Sidebar Menüpunkt „Vorlagen“ → `/admin/presets` inkl. Active-State für Detailroute

Doku: `docs/teilprojekt-2.20-admin-ui-presets-library.md`

---

- **Teilprojekt 2.21:** Preset-Save UX im Formbuilder verbessert (prominenter „Als Vorlage speichern“-Split-Button, Toast mit Links zur Library + optional Preset-Detail, Guidance-Link zu `/admin/presets`, Toast-Persistenz via sessionStorage).

---

### Teilprojekt 2.22 – Admin – Preset-Versioning & „Preset aktualisieren“ (History) ✅
**Ziel:** Presets iterativ weiterentwickeln, ohne Historie zu verlieren.  
**Ergebnis (Auszug):**
- **Datenmodell:**
  - Neue Tabelle `FormPresetRevision` (tenant-scoped, `presetId`, `version`, `snapshot`, `createdAt`)
  - Unique: `@@unique([presetId, version])`
- **Admin API:**
  - `GET /api/admin/form-presets/[id]` liefert jetzt zusätzlich `revisions[]` (History-Liste)
  - `GET /api/admin/form-presets/[id]/revisions/[version]` liefert Snapshot einer älteren Version
  - `POST /api/admin/form-presets/[id]/update`:
    - speichert Current Snapshot als Revision (version = alte snapshotVersion)
    - erzeugt neuen Snapshot aus Form+Fields
    - bumped `snapshotVersion++`
    - Transaction + Fehlercodes (u.a. `PRESET_NOT_FOUND`, `FORM_NOT_FOUND`, `TENANT_MISMATCH`, `CONFLICT`)
- **Admin UI:**
  - `/admin/presets/[id]` zeigt Current + Historie (klickbare Versionen; `?v=...`)
  - Revision-Ansicht lädt Snapshot per API und berechnet Summary/FieldCount lokal
  - Button „Preset aktualisieren“ inkl. Modal (Quelle Formular) + Success Notice
- **DX:**
  - Workaround für Next 16 / Turbopack Sourcemap/`searchParams` Edge-Case (robuster Query-Read)
  - Fallback-Loading für Forms-Dropdown (`/api/admin/forms?limit=200` → fallback `/api/admin/forms`)

Doku: `docs/teilprojekt-2.22-preset-versioning-update.md`

---

### Teilprojekt 2.23A – Admin – Preset Rollback & Audit (createdByUserId) ✅
**Ziel:** Revisionen auf einen früheren Stand zurücksetzen (Rollback) und dabei die Historie inkl. Audit sauber fortschreiben.  
**Ergebnis (Auszug):**
- **Audit:**
  - `FormPresetRevision.createdByUserId` (nullable) eingeführt
  - Update/Rollback schreiben `createdByUserId` beim Erzeugen neuer Revisionen
  - `GET /api/admin/form-presets/[id]` liefert `createdByUserId` in der Versionsliste
- **Rollback API:**
  - `POST /api/admin/form-presets/[id]/rollback`:
    - setzt Revision `vX` als neuen Current-Snapshot
    - bumped `snapshotVersion++`
    - speichert vorherigen Current als Revision (History bleibt vollständig)
    - Konfliktfall: `409` mit `REVISION_CONFLICT`
- **Admin UI:**
  - Revision-View (`?v=X`) zeigt Button „Rollback auf vX“ (Confirm Dialog)
  - Nach Erfolg: Notice „Rollback erstellt: vY“ + Redirect auf Current View (ohne Query)
  - Versionsliste zeigt optional „erstellt von <id>“

Doku: `docs/teilprojekt-2.23A-preset-rollback-audit.md`

---

### Teilprojekt 2.23B – Admin – Preset Import/Export (JSON) ✅
**Ziel:** Presets zwischen Instanzen/Tenants portieren (Download/Upload), ohne Copy/Paste.  
**Ergebnis (Auszug):**
- **Contract (versioniert):**
  - `PresetExportV1` mit `format="leadradar-form-preset"`, `formatVersion=1`, `exportedAt`, `preset`, optional `revisions[]`
- **Limits:**
  - Max JSON: 2MB (`PRESET_IMPORT_MAX_BYTES`)
  - Max Revisions: 50 (`PRESET_IMPORT_MAX_REVISIONS`)
- **Admin API:**
  - `GET /api/admin/form-presets/[id]/export`
    - Download JSON (Attachment), optional `?includeRevisions=1`
  - `POST /api/admin/form-presets/import`
    - Validiert JSON (Zod) + Limits
    - Erstellt **immer ein neues Preset** im aktuellen Tenant
    - Importiert optional Revisions (createMany) + setzt `createdByUserId` auf Import-User
  - Fehlercodes: `INVALID_IMPORT_JSON`, `IMPORT_TOO_LARGE`, `IMPORT_REVISION_LIMIT`
- **Admin UI:**
  - Detailseite `/admin/presets/[id]`: Export-Block (Checkbox „inkl. Versionen“ + Button „Export JSON“)
  - Library `/admin/presets`: Button „Import JSON“ + Modal (File Upload, Loading, Errors, Success-Link „Preset öffnen“)

Doku: `docs/teilprojekt-2.23B-preset-import-export.md`

---

## Stand nach Teilprojekt 2.23B

- Presets sind end-to-end nutzbar (inkl. Versionierung + Rollback + Portierung):
  - Preset erstellen (aus Formular speichern)
  - Preset Library: Liste, Filter, Preview, Delete (`/admin/presets`)
  - Formular aus Preset erstellen (`/admin/forms/new`)
  - Preset aktualisieren (neue Current-Version) + History bleibt abrufbar
  - Rollback von Revisionen erzeugt neue Current-Version und schreibt Historie korrekt fort
  - Preset Export als JSON (optional inkl. Revisions)
  - Preset Import aus JSON erzeugt neues Preset tenant-safe, inkl. optionaler Revisions
- API ist tenant-sicher und liefert konsistente Fehler.
- Next.js 16 / Turbopack Besonderheit berücksichtigt: `headers()`, `params`, `searchParams` können Promise sein.
