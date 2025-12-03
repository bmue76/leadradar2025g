# LeadRadar2025g – Projektübersicht (Backend-first)

SaaS-Lösung zur digitalen Leaderfassung auf Messen.  
In diesem Repo wird das **Backend + Admin-UI** mit Next.js (App Router) und Prisma aufgebaut.  
Mobile-App folgt später und spricht die Public-API an.

---

## 0. Ziel & Scope (Backend / Admin-UI)

- Saubere, API-first Backend-Basis für:
  - Formularverwaltung (Forms, FormFields)
  - Lead-Erfassung (Leads)
- Multi-Tenant-fähig (Tenant, User, x-user-id Header)
- Schlanke Admin-UI für:
  - Übersicht & Detail von Formularen
  - später: Lead-Übersichten, CSV-Exports, Form-Editor etc.
- Mobile-App soll später primär die Public-API verwenden (kein direktes Prisma im Mobile).

---

## 1. Technischer Stack

- **Framework:** Next.js 15/16 (App Router, TypeScript, Server Components)
- **Runtime:** Node.js (Dev: `npm run dev`)
- **Datenbank:** PostgreSQL (Prisma ORM)
- **ORM:** Prisma 7
- **Auth / Tenant:**
  - `requireAuthContext(req)` mit `x-user-id`-Header
  - Demo-User via Seed (`x-user-id: 1`)
- **API-Stil:** REST-artige JSON-Endpunkte für Admin & Public

---

## 2. Datenmodell (Forms & Leads – Kurzüberblick)

Die Kernmodelle sind in `prisma/schema.prisma` definiert:

- `Tenant` – Mandant / Kunde
- `User` – Benutzer, gehört zu einem Tenant
- `Form` – Formular (Meta: Name, Status, Slug, Version, Beschreibung, …)
- `FormField` – Feld eines Formulars (Label, Key, Typ, Required, Order, …)
- `Lead` – erfasster Messe-Lead mit JSON-Werten pro Feld

Dazu existieren DTOs in `backend/lib/types/forms.ts`, z. B.:

- `FormDTO`
- `FormFieldDTO`
- `LeadDTO`
- `CreateLeadRequest` (Request-Payload für Lead-Erfassung)

---

## 3. API-Übersicht (Stand nach Teilprojekt 1.3)

### 3.1 Admin-API (authentifiziert, Tenant-scope)

Alle Admin-Routen erwarten einen gültigen `x-user-id`-Header.  
Für Demo-Zwecke: `x-user-id: 1`.

- `GET /api/admin/forms`
  - Liefert paginierte Liste der Forms des Tenants.
  - Typisch: `{ items: FormDTO[], page, limit, total }`.

- `GET /api/admin/forms/:id`
  - Liefert ein Formular inklusive Feldern.
  - Struktur: `{ form: FormDTO, fields: FormFieldDTO[] }`.

- `GET /api/admin/forms/:id/leads`
  - Liefert die Leads zu einem Formular (Struktur siehe Teilprojekt 1.3).

Weitere Admin-Routen (Create/Update/Delete) sind geplant, aber noch nicht Teil von 2.1.

### 3.2 Public-API (ohne klassische Auth)

- `GET /api/forms/:id`
  - Liefert ein einzelnes Formular für die Mobile-/Public-Nutzung.
  - Genutzte DTOs: `FormDTO`, `FormFieldDTO`.

- `POST /api/leads`
  - Erfasst einen Lead für ein Formular.
  - Erwartet `CreateLeadRequest` im Body.
  - Validierung gegen FormFields (Pflichtfelder, Typen, etc.).

---

## 4. Admin-UI – Routing & Struktur (Stand nach Teilprojekt 2.1)

Die Admin-UI lebt im App-Router unter einer eigenen Route-Group:

```text
backend/app/
  (admin)/
    admin/
      layout.tsx        # Admin-Layout mit Header & Navigation
      page.tsx          # /admin – Dashboard / Intro
      forms/
        loading.tsx     # Loading-State für /admin/forms
        page.tsx        # /admin/forms – Form-Liste
        [id]/
          loading.tsx   # Loading-State für /admin/forms/[id]
          page.tsx      # /admin/forms/[id] – Form-Detail
