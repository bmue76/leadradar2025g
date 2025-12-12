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

## Stand nach Teilprojekt 2.17

- Der Admin-Formbuilder kann den Kontaktblock pro Formular **konfigurierbar** mappen (Firma/Vorname/Nachname/Telefon/E-Mail/Notizen).
- Bestehende Formulare brechen nicht: fehlt Mapping → Fallback (Auto/Heuristik).
- Persistenz über `Form.config` (JSON) – Migration vorhanden.
- DnD im Builder ist SSR-stabil (keine Hydration-Warnings).

