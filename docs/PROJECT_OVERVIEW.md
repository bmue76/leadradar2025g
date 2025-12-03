# LeadRadar2025g – Projektübersicht

SaaS-Lösung zur digitalen Leaderfassung auf Messen.  
Backend-first Ansatz: Zuerst ein stabiles Multi-Tenant-Backend, danach Admin-UI und Mobile-App.

---

## Teilprojekt 1.0 – Backend Foundation

**Ziel**

- Technische Basis für das Backend von LeadRadar2025g schaffen:
  - Next.js 15 (App Router, TypeScript) im Ordner `backend/`.
  - Health-Check-Endpoints.
  - Prisma 7 mit PostgreSQL + Driver Adapter.
  - Erste Doku-Struktur in `docs/`.

**Umsetzung**

- Neues Next.js-Projekt im Ordner `backend/` erstellt.
- Health-Endpoints:
  - `GET /api/health` → einfacher Service-Health-Check.
  - `GET /api/health/db` → DB-Health via Prisma (`SELECT 1`).
- Prisma 7 eingerichtet:
  - `backend/prisma/schema.prisma` mit Basis-Modellen `Tenant` und `User`.
  - `backend/prisma.config.ts` mit `DATABASE_URL`-Konfiguration.
  - `backend/lib/prisma.ts` mit `PrismaPg` + `pg`-Pool als Singleton.
- Einfaches Seed-Skript für einen Demo-Tenant und einen Demo-User angelegt.

**Ergebnis**

- Backend-Grundgerüst läuft lokal.
- DB-Anbindung ist stabil.
- Projektstruktur und Doku-Basis stehen.

---

## Teilprojekt 1.1 – Auth & Tenant Handling (Kurzüberblick)

**Ziel**

- Basis-Auth- und Tenant-Handling im Backend, um später Admin-UI und Mobile sauber anzubinden.

**Umsetzung (High Level)**

- Auth-Logik in `backend/lib/auth.ts` aufgebaut (z. B. anhand eines User-Kontexts / Header).
- Hilfsfunktionen, um den aktuellen `User` und `Tenant` aus der DB zu laden.
- Endpoint `GET /api/me` implementiert:
  - Liefert Basisinformationen zum eingeloggten User inkl. Tenant.
- Logging und Error-Handling für Auth/Me-Endpoint ergänzt.

**Ergebnis**

- Es existiert ein klarer Einstiegspunkt für „Current User + Tenant“.
- Folge-Teilprojekte können darauf aufbauen (Admin-UI, Form- und Lead-APIs, Mobile).

---

## Teilprojekt 1.2 – Datenmodell & Prisma-Schema (Forms & Leads Core)

**Ziel**

- Fachliches Kern-Datenmodell für Formulare & Leads modellieren.
- Multi-Tenant-fähige Prisma-Modelle für:
  - `Form` (Formular-Kopf)
  - `FormField` (Felder eines Formulars)
  - `Lead` (erfasste Leads mit JSON-Werten)
- Sinnvolle Enums definieren und migration-ready machen.
- Seed um ein Demo-Formular + Demo-Lead erweitern.
- Erste gemeinsame Typen für API-/UI-Contracts anlegen.

---

### Modelle & Enums

**Enums**

- `FormStatus`
  - `DRAFT`
  - `ACTIVE`
  - `ARCHIVED`

- `FormFieldType`
  - `TEXT`
  - `TEXTAREA`
  - `EMAIL`
  - `PHONE`
  - `NUMBER`
  - `SELECT`
  - `MULTISELECT`
  - `CHECKBOX`
  - `RADIO`
  - `DATE`
  - `DATETIME`
  - `TIME`
  - `NOTE`

**Modelle**

1. `Tenant` (erweitert)

- Bestehendes Modell um Relationen ergänzt:
  - `forms     Form[]`
  - `formFields FormField[]`
  - `leads     Lead[]`

2. `User` (erweitert)

- Bestehendes Modell um Relationen ergänzt:
  - `formsCreated Form[] @relation("FormsCreated")`
  - `formsUpdated Form[] @relation("FormsUpdated")`
  - `leadsCreated Lead[] @relation("LeadsCreated")`

3. `Form`

- Kern-Felder:
  - `tenantId` → `Tenant`
  - `name`, `description?`
  - `status` (`FormStatus`, Default `DRAFT`)
  - `slug?` (unique pro Tenant via `@@unique([tenantId, slug])`)
  - `version` (Default `1`)
  - `createdByUserId?`, `updatedByUserId?` → `User`
  - `createdAt`, `updatedAt`
- Relationen:
  - `tenant  Tenant`
  - `fields  FormField[]`
  - `leads   Lead[]`
- Indizes:
  - `@@index([tenantId])`
  - `@@unique([tenantId, slug])`

4. `FormField`

- Kern-Felder:
  - `tenantId` → `Tenant`
  - `formId`   → `Form`
  - `key` (technische ID, z. B. `firstName`)
  - `label` (z. B. „Vorname“)
  - `type` (`FormFieldType`)
  - `placeholder?`, `helpText?`
  - `required` (Default `false`)
  - `order` (Sortierung, Default `0`)
  - `config?` (`Json` – z. B. Optionen für SELECT/MULTISELECT)
  - `isActive` (Default `true`)
  - `createdAt`, `updatedAt`
- Relationen:
  - `tenant Tenant`
  - `form   Form`
- Constraints:
  - `@@index([tenantId])`
  - `@@index([formId])`
  - `@@unique([formId, key])` (kein doppelter Key innerhalb eines Formulars)

5. `Lead`

- Kern-Felder:
  - `tenantId` → `Tenant`
  - `formId`   → `Form`
  - `values` (`Json`) – Map von `FormField.key` → Wert
  - `source?` (z. B. `"mobile-app"`, `"web-form"`, `"import"`)
  - `createdByUserId?` → `User`
  - `createdAt`, `updatedAt`
- Relationen:
  - `tenant Tenant`
  - `form   Form`
  - `createdByUser? User`
- Indizes:
  - `@@index([tenantId])`
  - `@@index([formId])`
  - `@@index([createdAt])`

---

### Migration & Seed

- Migration:
  - Befehl: `npx prisma migrate dev --name init_forms_leads_core`
  - Legt alle neuen Tabellen, Enums und Indizes an.
- Seed (`backend/prisma/seed.cjs`):
  - Nutzt den gleichen Driver Adapter wie das Backend:
    - `PrismaPg` + `pg` + `DATABASE_URL` aus `.env`
  - Legt/aktualisiert:
    - `Tenant` mit `slug = "demo-tenant"`
    - `User` mit `email = "demo@leadradar.local"`
    - Demo-Formular `Demo Lead-Formular` mit `slug = "demo-lead-form"`
      - Felder: `firstName`, `lastName`, `email`, `company`, `phone`, `notes`, `newsletterOptIn`
    - Einen Beispiel-Lead mit `values`-JSON:

      ```json
      {
        "firstName": "Beat",
        "lastName": "Müller",
        "email": "beat@example.com",
        "company": "PopUp Piazza",
        "phone": "+41 79 000 00 00",
        "notes": "Demo-Lead aus Seed-Skript.",
        "newsletterOptIn": true
      }
      ```

---

### API-/Typen-Vorbereitung

- Datei: `backend/lib/types/forms.ts`
- Enthält:
  - `FormStatus` & `FormFieldType` (von `Prisma.FormStatus` / `Prisma.FormFieldType` abgeleitet).
  - `FormFieldDTO` – DTO für Felddefinitionen.
  - `FormDTO` – Formular mit Feldern, API-/UI-freundlich, `createdAt`/`updatedAt` als ISO-Strings.
  - `LeadValue` & `LeadValueMap` – Wertetypen und Key→Value-Map für `values`.
  - `LeadDTO` – Lead-Darstellung auf API-/UI-Ebene.
  - `CreateLeadRequest` – Request-Shape für `POST /api/leads` (folgt in späterem Teilprojekt).

---

### Ergebnis nach Teilprojekt 1.2

- Das **Kern-Datenmodell** für Formulare und Leads steht und ist **multi-tenant-fähig**.
- Prisma-Schema ist migration-ready, Migration wurde ausgeführt.
- Seed-Skript erzeugt einen konsistenten Demo-Tenant inkl. Demo-User, Demo-Formular und Demo-Lead.
- Erste zentrale Typen für künftige API-Routen (Admin-UI & Mobile) sind vorbereitet.

**Nächste Schritte (geplant)**

- Teilprojekt 1.3:
  - API-Routen für Forms & Leads (CRUD / Listing) auf Basis des neuen Schemas.
  - Nutzung der Typen aus `lib/types/forms.ts`.
- Teilprojekt 2.x/3.x:
  - Admin-UI für Formular-Management.
  - Mobile-App-Flows für Leaderfassung auf Basis des Form-Schemas.
