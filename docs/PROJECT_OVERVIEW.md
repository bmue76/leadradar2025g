# LeadRadar2025g – Projektübersicht

SaaS-Lösung zur digitalen Leaderfassung auf Messen.  
Backend-first-Ansatz mit Next.js App Router (API-only Backend), Prisma/PostgreSQL, später Admin-UI und Mobile-App.

---

## Architektur & Tech-Stack (Kurzüberblick)

- **Backend / API**
  - Next.js 16 App Router im Ordner `backend/`
  - TypeScript, Edge-/Node-Runtime (je nach Route konfigurierbar)
  - API-Routen unter `app/api/...`
- **Datenbank**
  - PostgreSQL
  - Prisma 7 als ORM
- **Multi-Tenancy & Auth**
  - Tenant-Modell (Mandantenfähigkeit)
  - `requireAuthContext(req)` mit `x-user-id` Header
  - Demo-User/Tenant via Seed (z. B. `x-user-id: 1`)
- **Admin-UI**
  - Route-Group `(admin)` mit `/admin/...`
  - Server Components + Client Components (z. B. Tabellen, Dialoge)
- **Mobile-App (geplant)**
  - Getrenntes Expo/React Native Projekt (später, Phase 3.x)

---

## Stand nach Teilprojekt 1.0 – Backend Foundation

**Ziel:** Lauffähige Backend-Basis mit Next.js & Prisma.

Ergebnis:

- Next.js-App im Ordner `backend/` aufgesetzt.
- TypeScript-, ESLint- und Basis-Konfiguration eingerichtet.
- Prisma 7 mit PostgreSQL angebunden (Schema-Datei, Prisma Client-Generierung).
- Entwicklungs-Setup unter Windows (VS Code, Git Bash, `npm run dev`) verifiziert.

---

## Stand nach Teilprojekt 1.1 – Auth & Tenant Handling

**Ziel:** Einfache, aber saubere Auth- und Tenant-Basis.

Ergebnis:

- Modelle:
  - `Tenant` (Mandant)
  - `User` (mit `tenantId`-Bezug)
- Utility:
  - `requireAuthContext(req)`:
    - Liest `x-user-id` aus dem Request.
    - Lädt User + zugehörigen Tenant.
    - Wirft 401/403 bei ungültigem Kontext.
- Seed:
  - Demo-Tenant und Demo-User (z. B. `x-user-id: 1`) angelegt.
- API:
  - Test-Endpoint `/api/me` liefert `user` + `tenant` zurück (authentifiziert).
- Scope:
  - Alle „Admin“-Routen arbeiten konsequent tenant-scope (kein Cross-Tenant-Zugriff).

---

## Stand nach Teilprojekt 1.2 – Datenmodell & Prisma-Schema (Forms & Leads Core)

**Ziel:** Kern-Datenmodell für Formulare & Leads sauber modellieren.

Ergebnis:

- Prisma-Modelle (Kern):
  - `Form`
    - Bezug zu `Tenant`
    - Felder wie `name`, `description`, `status` (`FormStatus`), `slug` o. Ä.
  - `FormField`
    - Bezug zu `Tenant` & `Form`
    - `key`, `label`, `type` (`FormFieldType`), `required`, `placeholder`, `helpText`, `order`, `config`, `isActive`
  - `Lead`
    - Bezug zu `Tenant` & `Form`
    - `values` (JSON), `source`, `createdByUserId`, Timestamps
- Enums:
  - `FormStatus` (z. B. `DRAFT`, `ACTIVE`, `ARCHIVED`)
  - `FormFieldType` (z. B. `TEXT`, `EMAIL`, `PHONE`, `NUMBER`, `TEXTAREA`, `SELECT`, `CHECKBOX`, …)
- Migration:
  - Prisma-Migrationen ausgeführt, Schema in der DB verankert.
- Seed:
  - Demo-Formulare mit einfachen Feldern und Test-Leads angelegt.
- Typen/DTOs:
  - `backend/lib/types/forms.ts` mit:
    - `FormDto`, `FormFieldDto`, `LeadDto`
    - `CreateLeadRequest` u. a.

---

## Stand nach Teilprojekt 1.3 – API-Basis & Routing (Forms & Leads)

**Ziel:** Saubere, tenant-scope API für Formular-Verwaltung und Lead-Verarbeitung.

Ergebnis:

- **Admin-API (authentifiziert, tenant-scope)**

  - `GET /api/admin/forms`
    - Liste aller Formulare eines Tenants.
  - `POST /api/admin/forms`
    - Neues Formular anlegen.
  - `GET /api/admin/forms/[id]`
    - Formular-Detail (inkl. Feldern) für einen Tenant.
  - `PATCH /api/admin/forms/[id]`
    - Formular bearbeiten (z. B. Name, Beschreibung, Status).
  - `DELETE /api/admin/forms/[id]`
    - Formular löschen (abhängig von Business-Entscheidungen; aktuell vor allem für Test/Demo).
  - `GET /api/admin/forms/[id]/leads`
    - Lead-Liste zu einem Formular (Paginierung/Filter optional).

- **Public-/Mobile-API**

  - `GET /api/forms/[id]/active` oder vergleichbarer Endpoint:
    - Liefert ein aktives Formular (inkl. Felder) für Mobile-Frontend/Public-Use.
  - `POST /api/leads`
    - Legt einen Lead an:
      - Payload: `{ formId, values: { [fieldKey]: value } }`
      - Validierung der Felder anhand `FormField.key` + `required`.
      - Speichert Daten in `Lead.values` (JSON) + Metadaten.

- **Technische Eckpunkte**

  - DTOs für Admin- und Public-API wiederverwendet.
  - Alle Admin-Routen nutzen `requireAuthContext` und filtern konsequent nach `tenantId`.
  - Konsistente Fehlerstruktur (z. B. `error`, `message`, optional `details`).

---


---

### Schritt 2 – Projektübersicht um Teilprojekt 1.4 ergänzen

**Tool:** VS Code  
**Ziel:** `PROJECT_OVERVIEW.md` um einen knappen Statusblock für 1.4 erweitern.

**Aktion:**

Öffne die Datei  
`C:/dev/leadradar2025g/docs/PROJECT_OVERVIEW.md`  
und füge im Bereich der Backend-Teilprojekte (bei 1.x) einen neuen Block ein, z. B. direkt nach 1.3 / 1.7 – je nach bisheriger Reihenfolge:

```md
## Teilprojekt 1.4 – Leads: E-Mail-Flows (Danke & Innendienst)

**Status:** abgeschlossen

**Ziel:**  
Nach der Lead-Erfassung automatisiert E-Mail-Flows auslösen:

- optionale Danke-Mail an den Lead,
- Innendienst-Benachrichtigung an interne Empfänger.

**Ergebnis:**

- Zentrale Mail-Infrastruktur (`lib/mail.ts`) mit Provider-Switch:
  - `MAIL_PROVIDER=console` (loggt nur),
  - `MAIL_PROVIDER=resend` (Versand via Resend-API).
- Template-Funktionen in `lib/mail-templates.ts`:
  - `buildThankYouEmail(...)`,
  - `buildInternalLeadNotification(...)`.
- Hook `handleLeadCreatedEmailFlows(...)` in `lib/lead-email-flows.ts`, eingebunden in `POST /api/leads`.
- Feature-Flags & Konfiguration über `.env`:
  - `LEADS_THANK_YOU_ENABLED`, `LEADS_INTERNAL_NOTIFY_ENABLED`,
  - `MAIL_INTERNAL_RECIPIENTS`, `MAIL_FROM_DEFAULT`, `MAIL_REPLY_TO_DEFAULT`.
- Happy-Path-Tests + Flag-Szenarien erfolgreich verifiziert.

---

### Teilprojekt 1.7 – Backend Exports (CSV & Download-API)

- Admin-Export-Endpoint: `GET /api/admin/forms/[id]/leads/export`
  - CSV-Export aller Leads eines Formulars (optional mit `from`/`to`).
  - Authentifiziert via `requireAuthContext` + tenant-scope.
  - CSV: Semikolon-separiert, UTF-8 mit BOM, dynamische Spalten basierend auf FormFields.
  - Limitierung auf max. 50'000 Leads pro Export (`EXPORT_TOO_LARGE`).
- Optionaler Tenant-Export (`/api/admin/leads/export`) ist als TODO vorgesehen.

---

## Stand nach Teilprojekt 2.1 – Admin-UI: Forms-CRUD (List & Detail)

**Ziel:** Grundlegende Formular-Verwaltung im Admin-Bereich.

Ergebnis:

- Route-Group `(admin)` mit Einstiegspunkt:
  - `/admin` – Dashboard/Übersicht.
- Formularverwaltung:

  - `GET /admin/forms`
    - Seite zeigt Formularliste (Name, Status, Anzahl Felder/Leads etc.).
    - Aktionen: „Neues Formular“, „Bearbeiten“, „Löschen“ (je nach Implementierung).
    - Datenquelle: `GET /api/admin/forms`.

  - `GET /admin/forms/[id]`
    - Formular-Detail-Seite mit Anzeige von:
      - Meta-Daten (Name, Beschreibung, Status, Timestamps)
      - Status-Badge (z. B. DRAFT/ACTIVE/ARCHIVED)
      - Read-only Liste der zugehörigen `FormField`s (Stand 2.1)
      - Link zur Lead-Übersicht des Formulars.
    - Datenquelle: `GET /api/admin/forms/[id]`.

- Tech/UX:
  - Server Components für Daten-Fetching.
  - Erste Client-Komponenten für Buttons/Interaktionen.
  - Fehlermeldungen (404/400) sauber behandelt, z. B. invalid `id` → `notFound()`.

---

## Stand nach Teilprojekt 2.2 – Admin-UI: FormFields-CRUD & Reihenfolge

**Ziel:** Vollständiges Feld-Management je Formular inkl. Reihenfolge-Steuerung.

Ergebnis:

- **Neue Admin-API für FormFields**

  - `GET /api/admin/forms/[id]/fields`
    - Liefert alle Felder eines Formulars für den aktuellen Tenant.
    - Sortierung: `order ASC, id ASC`.

  - `POST /api/admin/forms/[id]/fields`
    - Legt ein neues Feld an.
    - Pflichtwerte: `label`, `key`, `type`, `required`.
    - Optionale Werte: `placeholder`, `helpText`, `isActive`.
    - Backend vergibt `order` automatisch (an das Ende der Liste).

  - `PATCH /api/admin/forms/[id]/fields/[fieldId]`
    - Partielles Update eines Feldes (CRUD + Aktiv-Status + Reorder).
    - Unterstützte Payloads (kombinierbar):
      - Stammdaten-Update: `label`, `key`, `type`, `required`, `placeholder`, `helpText`, `isActive`.
      - Reihenfolge-Update: `order` (1-basiert).
    - Bei `order`-Änderung:
      - Backend ermittelt alle Felder des Formulars und packt die Reihenfolge neu (keine doppelten `order`-Werte).

  - `DELETE /api/admin/forms/[id]/fields/[fieldId]`
    - Hard Delete des Feldes.
    - Aktuell: Server löscht den Datensatz, UI packt Order lokal neu.  
      (Optional: Später serverseitige Kompaktierung der Order-Werte.)

- **UI: Felder-Management auf `/admin/forms/[id]`**

  - Tabelle „Felder“ mit:
    - Spalten: `Order`, `Label`, `Key`, `Typ`, `Required`, `Aktiv`, Aktionen.
    - Datenquelle: `GET /api/admin/forms/[id]/fields`.
  - Aktionen pro Feld:
    - **Bearbeiten**
      - Öffnet Modal mit Formular für `label`, `key`, `type`, `required`, `placeholder`, `helpText`, `isActive`.
      - Speichert via `PATCH /api/admin/forms/[id]/fields/[fieldId]`.
    - **Löschen**
      - Confirm-Dialog.
      - `DELETE /api/admin/forms/[id]/fields/[fieldId]`.
      - UI aktualisiert lokale Reihenfolge (1..n).
    - **Reihenfolge**
      - Pfeile `↑` / `↓`
        - `PATCH` mit neuer `order`, anschließend Refresh via `GET /api/admin/forms/[id]/fields`.
      - **Drag & Drop**
        - Tabellenzeilen sind `draggable`.
        - Beim Drop wird `PATCH` mit neuer `order` ausgelöst (Ziel-Position), danach Liste frisch vom Server geladen.
    - **Aktiv/Deaktiv**
      - Button „Aktivieren/Deaktivieren“ toggelt `isActive` via `PATCH`.

  - Aktionen für das Formular selbst:
    - Button „+ Neues Feld hinzufügen“:
      - Öffnet Modal für Anlage eines neuen Feldes.
      - Nach erfolgreichem `POST` wird das neue Feld in der Tabelle angezeigt.

- **UX & Robustheit**

  - Validierung im Modal:
    - Pflichtfelder: `label`, `key`, `type`.
  - Loading/Busy-States:
    - Save-Button zeigt „Speichere…/Aktualisiere…“.
    - Delete-/Reorder-/Toggle-Buttons werden während der Operation disabled.
  - Fehlerszenarien:
    - Saubere Fehlertexte im Modal (z. B. „Fehler beim Anlegen des Feldes“).
    - Alerts bei technisch nicht ermittelbarer `formId`.
  - Drag & Drop:
    - Visuelles Feedback:
      - Ziehende Zeile halbtransparent.
      - Zielzeile mit Rahmen (Ring) hervorgehoben.

---

**Tool:** VS Code  
**Ziel:** Kurzer Status-Eintrag für 2.3 in der Projektübersicht.

**Aktion:**

Öffne:

`C:/dev/leadradar2025g/backend/docs/PROJECT_OVERVIEW.md`

Füge im Bereich **Admin-UI / 2.x** einen Abschnitt zu **2.3** ein, z. B. direkt nach 2.2:

```md
### 2.3 Admin-UI – Leads-Listen & Export

- Neue Formular-spezifische Leads-Ansicht unter `/admin/forms/[id]/leads`.
- Anzeige der Leads in einer Tabelle mit Meta-Infos (ID, Datum/Zeit, Quelle) und Basis-Kontaktdaten (Name, E-Mail, Firma) plus Werte-Preview.
- Pagination über `page`/`limit` und clientseitiger CSV-Export der aktuell angezeigten Leads.
- Placeholder-Seite `/admin/leads` verhindert 404-Fehler und verweist auf die Formular-spezifische Leads-Ansicht.


## Ausblick / Nächste sinnvolle Teilprojekte

- **2.3 – Admin-UI: Leads-Ansicht & Details**
  - Verbesserung der Lead-Listen-/Detailansicht (Filter, Suche, Pagination).
  - Besseres Zusammenspiel mit Export-/E-Mail-Flows.

- **2.x – Presets / Form-Vorlagen (optional)**
  - Speichern & Wiederverwenden von Form-Layouts.
  - Kategorisierung nach Use Cases (z. B. „Messe-Lead“, „Produktfeedback“).

- **3.x – Mobile-App**
  - Expo/React Native-App zur Leaderfassung.
  - Offline-Fähigkeit (lokales Caching, Sync mit Backend).
  - QR-/Barcode-Scanning, Visitenkarten-Erfassung.

- **4.x – Billing & Abos**
  - Stripe-Integration für Mandanten.
  - Abo-Status-basierte Feature-Freischaltungen (z. B. Anzahl Formulare, Leads, Nutzer).
