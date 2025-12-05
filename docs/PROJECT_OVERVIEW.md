# LeadRadar2025g – Projektübersicht

SaaS-Lösung zur digitalen Leaderfassung auf Messen.  
Backend-first-Ansatz mit Next.js App Router (API-only Backend), Prisma/PostgreSQL, später Admin-UI und Mobile-App.

---

## Architektur & Tech-Stack (Kurzüberblick)

- **Backend / API**
  - Next.js 16 App Router im Ordner `backend/`
  - TypeScript, API-Routen unter `app/api/...`
- **Datenbank**
  - PostgreSQL
  - Prisma 7 als ORM
- **Multi-Tenancy & Auth**
  - Mandantenmodell mit `Tenant` und `User` (inkl. `tenantId`-Bezug)
  - `requireAuthContext(req)` liest `x-user-id`, lädt User & Tenant und schützt Admin-Routen
  - Seed mit Demo-Tenant/-User (z. B. `x-user-id: 1`)
- **Admin-UI**
  - Route-Group `(admin)` mit `/admin/...`
  - Mischung aus Server Components (Daten-Fetching) und Client Components (Tabellen, Dialoge)
- **Mobile-App (geplant)**
  - Eigenes Expo/React Native Projekt (Phase 3.x)

---

## Backend-Teilprojekte (1.x)

### 1.0 – Backend Foundation

**Ziel:** Basisprojekt mit Next.js & Prisma lauffähig machen.

**Ergebnis:**

- Next.js-App unter `backend/` aufgesetzt.
- TypeScript-, ESLint- und Basis-Konfiguration eingerichtet.
- Prisma 7 an PostgreSQL angebunden (Schema, Client-Generierung).
- Lokales Dev-Setup unter Windows (VS Code, Git Bash, `npm run dev`) verifiziert.

---

### 1.1 – Auth & Tenant Handling

**Ziel:** Einfache Mandantenfähigkeit + Auth-Kontext.

**Ergebnis:**

- Modelle:
  - `Tenant` (Mandant)
  - `User` mit Referenz auf `tenantId`
- Utility:
  - `requireAuthContext(req)`:
    - liest `x-user-id`-Header,
    - lädt User + Tenant,
    - gibt 401/403 bei ungültigem Kontext zurück.
- Seed:
  - Demo-Tenant und Demo-User (z. B. `x-user-id: 1`) angelegt.
- Scope:
  - Admin-Routen arbeiten konsequent tenant-scope (kein Cross-Tenant-Zugriff).

---

### 1.2 – Datenmodell & Prisma-Schema (Forms & Leads Core)

**Ziel:** Kern-Domain für Formulare & Leads modellieren.

**Ergebnis (Auszug):**

- Prisma-Modelle:
  - `Form`
    - Bezug zu `Tenant`
    - Metadaten wie `name`, `description`, `status` (`FormStatus`), optional `slug` etc.
  - `FormField`
    - Bezug zu `Tenant` & `Form`
    - Felder wie `key`, `label`, `type` (`FormFieldType`), `required`, `placeholder`,
      `helpText`, `order`, `config`, `isActive`
  - `Lead`
    - Bezug zu `Tenant` & `Form`
    - speichert `values` (JSON) plus `source`, `createdByUserId`, Timestamps
- Enums (Beispiele):
  - `FormStatus` (z. B. `DRAFT`, `ACTIVE`, `ARCHIVED`, …)
  - `FormFieldType` (z. B. `TEXT`, `EMAIL`, `PHONE`, `NUMBER`, `TEXTAREA`, `SELECT`, `CHECKBOX`, …)
- Migrationen:
  - Prisma-Migrationen ausgeführt, Schema in der DB verankert.
- Seed & Typen:
  - Demo-Formulare und Test-Leads angelegt.
  - DTOs / Typen in `lib/types/forms.ts` (z. B. `FormDto`, `FormFieldDto`, `LeadDto`, `CreateLeadRequest`).

---

### 1.3 – API-Basis & Routing (Forms & Leads)

**Ziel:** Tenant-sichere API für Formularverwaltung und Lead-Anlage.

**Ergebnis (Auszug):**

- **Admin-API (authentifiziert, tenant-scope)**
  - `GET /api/admin/forms` – Liste aller Formulare eines Tenants.
  - `POST /api/admin/forms` – neues Formular anlegen.
  - `GET /api/admin/forms/[id]` – Formular-Detail (inkl. Feldern).
  - `PATCH /api/admin/forms/[id]` – Formular-Metadaten bearbeiten.
  - `DELETE /api/admin/forms/[id]` – Formular löschen (v. a. für Test/Demo).
  - `GET /api/admin/forms/[id]/leads` – Lead-Liste zu einem Formular.
- **Public-/Mobile-API**
  - `GET /api/forms/[id]/active` – aktives Formular inkl. Feldern.
  - `POST /api/leads` – Lead anlegen:
    - Payload: `{ formId, values: { [fieldKey]: value } }`
    - Validierung der Pflichtfelder anhand `FormField.key` + `required`.
    - Speicherung der Werte in `Lead.values` (JSON).
- **Technische Eckpunkte**
  - DTOs für Admin- und Public-API wiederverwendet.
  - Alle Admin-Routen nutzen `requireAuthContext` und filtern nach `tenantId`.
  - Konsistente Fehlerstruktur (`error`, `message`, optional `details`).

---

### 1.4 – Leads: E-Mail-Flows (Danke & Innendienst)

**Ziel:** Nach Lead-Erfassung automatisierte E-Mail-Flows auslösen.

**Ergebnis:**

- Zentrale Mail-Infrastruktur in `lib/mail.ts` mit Provider-Switch:
  - `MAIL_PROVIDER=console` – simuliert Versand und loggt nur.
  - `MAIL_PROVIDER=resend` – Versand via Resend-API.
- Template-Funktionen in `lib/mail-templates.ts`:
  - `buildThankYouEmail({ lead, form, tenant })`
  - `buildInternalLeadNotification({ lead, form, tenant })`
- Orchestrierung der Flows in `lib/lead-email-flows.ts`:
  - `handleLeadCreatedEmailFlows({ lead, form, tenant })`
  - Aufruf im `POST /api/leads`-Handler.
- Konfiguration über `.env`:
  - Flags für Danke-Mail / Innendienst-Benachrichtigung,
  - Default-Absender, interne Empfänger usw.

---

### 1.7 – Backend Exports (CSV & Download-API)

**Ziel:** CSV-Export von Leads für Formular-Owner.

**Ergebnis:**

- Admin-Export-Endpoint:
  - `GET /api/admin/forms/[id]/leads/export`
  - tenant-scope via `requireAuthContext`.
- CSV:
  - UTF-8 (mit BOM), Semikolon als Trennzeichen,
  - dynamische Spalten basierend auf FormFields des Formulars.
- Schutz:
  - Limitierung auf eine maximale Anzahl Leads je Export (Fehlercode bei Überschreitung).
- Optional:
  - Globaler Tenant-Export (`/api/admin/leads/export`) als TODO vorgesehen.

---

## Admin-UI-Teilprojekte (2.x)

### 2.1 – Admin-UI: Forms-CRUD (List & Detail)

**Ziel:** Grundlegende Formular-Verwaltung im Admin-Bereich.

**Ergebnis:**

- Route-Group `(admin)` mit Einstiegspunkt:
  - `/admin` – Dashboard / Überblick.
- Formularverwaltung:
  - `/admin/forms` – Liste der Formulare (Name, Status, Meta).
  - Aktionen: Formular anlegen, bearbeiten, ggf. löschen (abhängig von Business-Regeln).
- Detailseite:
  - `/admin/forms/[id]` – Formular-Detail mit:
    - Metadaten (Name, Beschreibung, Status, Timestamps),
    - Status-Badge,
    - read-only Liste der zugehörigen `FormField`s (Stand 2.1),
    - Link zur Lead-Übersicht des Formulars.
- Datenquelle:
  - `GET /api/admin/forms`
  - `GET /api/admin/forms/[id]`
- Tech/UX:
  - Server Components für Daten-Fetching.
  - Erste Client-Komponenten (Buttons, Navigation).
  - Saubere 404-/Fehlerbehandlung.

---

### 2.2 – Admin-UI: FormFields-CRUD & Reihenfolge

**Ziel:** Vollständiges Feld-Management je Formular inkl. Reihenfolge-Steuerung.

**Ergebnis (Auszug):**

- **Admin-API für FormFields**
  - `GET /api/admin/forms/[id]/fields`
    - liefert alle Felder eines Formulars in definierter Sortierung (`order`, `id`).
  - `POST /api/admin/forms/[id]/fields`
    - legt ein neues Feld an,
    - `order` wird ans Ende der bestehenden Liste vergeben.
  - `PATCH /api/admin/forms/[id]/fields/[fieldId]`
    - Stammdaten-Update (`label`, `key`, `type`, `required`, `placeholder`, `helpText`, `isActive`),
    - Reihenfolge-Update via `order` (1-basiert) inkl. Repack der Reihenfolge.
  - `DELETE /api/admin/forms/[id]/fields/[fieldId]`
    - Hard Delete eines Feldes.
- **UI auf `/admin/forms/[id]`**
  - Tabelle „Felder“ mit Spalten: `Order`, `Label`, `Key`, `Typ`, `Required`, `Aktiv`, Aktionen.
  - Aktionen pro Feld:
    - Bearbeiten (Modal-Form),
    - Löschen (Confirm-Dialog),
    - Aktiv/Deaktiv,
    - Reihenfolge ändern per Up/Down und Drag & Drop.
- **UX & Robustheit**
  - Validierung im Modal (Pflichtfelder).
  - Loading/Busy-States und saubere Fehlermeldungen.
  - Re-Fetch der Liste nach Mutationen, keine „Zombie“-States.

---

### 2.3 – Admin-UI: Leads-Listen & Export

**Ziel:** Formular-spezifische Lead-Ansicht im Admin inkl. Export.

**Ergebnis:**

- Neue Seite `/admin/forms/[id]/leads`:
  - Tabelle mit Leads (ID, Zeitstempel, Quelle, zentrale Werte-Preview).
  - einfache Pagination (`page`/`limit`).
  - CSV-Export-Button, der `GET /api/admin/forms/[id]/leads/export` nutzt.
- Placeholder `/admin/leads`:
  - Verhindert 404,
  - verweist auf die Formular-spezifischen Lead-Ansichten.
- Konsistentes Zusammenspiel von UI, Admin-API und Export-Endpoint.

---

### 2.4 – Admin-UI: Layout-Shell & Sidebar-Navigation

**Ziel:** Konsistente Layout-Shell für alle Admin-Seiten mit persistenter Sidebar.

**Ergebnis:**

- Neues Layout in `app/(admin)/admin/layout.tsx`:
  - Flex-Layout über die gesamte Höhe:
    - Mobile: `flex-col` (Sidebar oben, Content darunter),
    - Desktop: `flex-row` (Sidebar links, Content rechts).
  - Content-Bereich (`<main>`):
    - eigener Scroll-Container (`overflow-y-auto`),
    - Innenabstände und max. Breite (`max-w-6xl`, Padding).
- Neue Komponente `app/(admin)/admin/AdminSidebar.tsx`:
  - Titel/Logo-Block „LeadRadar Admin“.
  - Navigationsliste mit Einträgen:
    - **Dashboard** → `/admin`
    - **Formulare** → `/admin/forms` + alle Unterrouten (`/admin/forms/[id]`, `/admin/forms/[id]/leads`, …)
    - **Leads** → `/admin/leads` (+ geplante globale Leads-Ansichten)
    - **Exporte** → `/admin/exports` (Platzhalter)
    - **Einstellungen** → `/admin/settings` (Platzhalter)
  - Active-State auf Basis von `usePathname()`:
    - aktueller Menüpunkt bekommt hervorgehobenes Styling (Hintergrund, Border, Font-Weight).
  - Responsives Verhalten:
    - Mobile: vollständige Breite, unterer Border,
    - Desktop: feste Breite (`md:w-64`), rechter Border, volle Höhe mit eigenem Scroll (`md:h-screen md:overflow-y-auto`).

---

## Ausblick / Nächste sinnvolle Teilprojekte

- **2.5+ – Admin-UI: Formbuilder & Presets**
  - Visueller Formbuilder für Felder, Layout und Validierungen.
  - Speichern & Wiederverwenden von Form-Vorlagen (Use Cases wie „Messe-Lead“, „Produktfeedback“, …).
- **2.x – Erweiterte Lead-Ansichten**
  - Filter, Suche, Tagging, Detail-Ansichten.
  - Engere Verzahnung mit Exporten und E-Mail-Flows.
- **3.x – Mobile-App**
  - Expo/React Native-App zur Leaderfassung.
  - Offline-Funktionalität (lokales Caching + Sync), QR-/Barcode-Scanning, Visitenkarten-Erfassung.
- **4.x – Billing & Abos**
  - Stripe-Integration für Mandanten-Abos.
  - Feature-Freischaltungen abhängig vom Abo-Status (Anzahl Formulare, Leads, Nutzer, …).
