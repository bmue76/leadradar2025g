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


Speichern.

---

## Schritt 19 – `docs/PROJECT_OVERVIEW.md` aktualisieren

Da ich den bisherigen Inhalt nicht sehe, bekommst du eine **vollständige, konsistente Version**, die du entweder als neue Basis nimmst oder manuell mit deiner bestehenden Datei mergen kannst.

**Tool:** VS Code  
**Ziel:** Teilprojekt 1.6 im Gesamtüberblick verankern.

**Aktion:**

1. Öffne  
   `C:/dev/leadradar2025g/backend/docs/PROJECT_OVERVIEW.md`

2. Ersetze den Inhalt durch diesen Vorschlag (oder füge zumindest den Block zu 1.6 hinzu, wenn du manuell mergen willst):

```md
# LeadRadar2025g – Project Overview

Backend-first Rebuild der LeadRadar-Plattform mit sauberem Multi-Tenant-Backend, Admin-UI und späterer Mobile-App-Anbindung.

---

## 1.x – Backend (Core & APIs)

**Status-Legende:**  
✅ abgeschlossen 🟡 in Arbeit ⚪ geplant

- ✅ **1.0 – Projektsetup & Grundstruktur**
  - Next.js App Router, TypeScript, Prisma/PostgreSQL.
  - Basis-Struktur für `app/`, `lib/`, `prisma/`, `docs/`.
- ✅ **1.1 – Multi-Tenant Core**
  - Modelle `Tenant`, `User`.
  - `requireAuthContext(req)` mit `x-user-id`.
  - Tenant-Scoping für alle relevanten Queries.
- ✅ **1.2 – Forms & FormFields Core**
  - Modelle `Form`, `FormField`.
  - Admin-API für CRUD auf Forms und FormFields.
- ✅ **1.3 – Leads Core & Public API**
  - Modell `Lead`.
  - `POST /api/leads` (Public), `GET /api/admin/forms/[id]/leads` (Admin).
- ✅ **1.4 – Leads – E-Mail-Flows**
  - Danke-Mail an Lead.
  - Info-Mail an Innendienst (konfigurierbare Adressen).
- ✅ **1.6 – Events (Messen), Formular-Bindung & Mobile-API**
  - Neues Modell `Event` + Enum `EventStatus`.
  - Join-Tabelle `EventForm` (Formulare an Events binden, `isPrimary`).
  - `Lead` mit optionaler `eventId`.
  - Admin-Endpoints:
    - `GET /api/admin/events`
    - `POST /api/admin/events`
    - `GET /api/admin/events/[id]`
    - `PATCH /api/admin/events/[id]`
    - `GET /api/admin/events/[id]/forms`
    - `POST /api/admin/events/[id]/forms`
  - Mobile-Endpoints:
    - `GET /api/mobile/events?tenantSlug=...`
    - `GET /api/mobile/events/[id]/forms`
- ✅ **1.7 – Leads – Export & CSV**
  - CSV-Export pro Form mit konfigurierbaren Spalten.
  - Admin-Endpoint `GET /api/admin/forms/[id]/leads/export`.

---

## 2.x – Admin-UI

- ✅ **2.1 – Admin-Basics & Navigation**
  - Erste Admin-Seiten für Forms & Leads.
- ✅ **2.2 – FormFields-CRUD & Reihenfolge**
  - Verwaltung von Feldern pro Form.
  - Sortierung per Drag & Drop.
- ✅ **2.3 – Leads-Listen & Export**
  - Tabellenansicht aller Leads pro Form.
  - CSV-Export-Knopf im UI.
- ✅ **2.4 – Layout-Shell & Sidebar-Navigation**
  - Persistente Admin-Layout-Shell mit Sidebar.
- ✅ **2.5 – Admin-Formbuilder – Builder-View & Vorschau (Basis)**
  - Erster Builder-Workspace mit Vorschau.
- ✅ **2.6 – FormDetail & Builder fusionieren (Basis)**
  - Vereinheitlichung von Detailansicht und Builder.
- ✅ **2.7 – Properties-Panel & Feldbearbeitung**
  - Rechtsseitiges Properties-Panel für FormFields.
- 🟡 **2.9 – Admin-Formbuilder – Tablet-Layout & App-nahe Vorschau**
  - Zwei-Spalten-Layout (links dynamische Fragen, rechts Kontaktblock).
  - Ziel: App-nahe Tablet-Vorschau für späteres Mobile-UI.

---

## 3.x – Mobile (Preview, später eigenes Projekt)

- ⚪ **3.0 – Mobile-API-Integration**
  - Nutzung von `GET /api/mobile/events` und `GET /api/mobile/events/[id]/forms`.
  - Formulardaten in Mobile-App synchronisieren.
- ⚪ **3.1 – Offline-Lead-Erfassung**
  - Lokale Speicherung + späterer Sync gegen Backend.

---

## Stand nach Teilprojekt 1.6

- **Events (Messen) sind als eigene Entität im Backend verankert.**
- **Formulare können flexibel pro Event konfiguriert** werden (inkl. Primary-Form).
- **Leads können einem Event zugeordnet** werden, ohne bestehende Daten zu brechen.
- Die **Mobile-API** bietet jetzt eine saubere Grundlage, um pro Tenant:
  - aktive Events anzuzeigen,
  - pro Event die passenden Formulare (inkl. Primary-Form) zu laden.

Details & API-Contracts siehe:  
➡ `docs/teilprojekt-1.6-events.md`

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

  ---

  ### Stand nach Teilprojekt 2.6 – FormDetail & Builder fusionieren (Basis)

- `/admin/forms/[id]` ist jetzt der **zentrale Formbuilder-Workspace** für ein Formular.
- Die Seite kombiniert:
  - Workspace-Header mit Navigation (Zur Formularliste, Leads anzeigen),
  - kompakte Meta-Infos (ID, Status, Beschreibung),
  - einen visuellen **Formbuilder-Bereich** (Feldliste + Vorschau),
  - sowie die **technische Feldtabelle (Legacy)** für Feld-CRUD & Reihenfolge.
- `/admin/forms/[id]/builder` existiert nur noch als **Legacy-Redirect** auf `/admin/forms/[id]`.
- Der Builder liest die Felder aus dem Backend und spiegelt Änderungen aus der Feldtabelle automatisch wider.
- 2.6 bildet die Basis für künftige Erweiterungen:
  - 1:1 Tablet-Layout als Standardvorlage,
  - Properties-Panel im Builder,
  - Drag & Drop im Layout,
  - Template-Auswahl für Kunden.

---

## Schritt 2 – `PROJECT_OVERVIEW.md` um Stand nach 2.7 ergänzen

**Tool:** VS Code  
**Ziel:** Überblicks-Doku um den neuen Stand erweitern.

**Aktion:**

1. Öffne:

`C:/dev/leadradar2025g/backend/docs/PROJECT_OVERVIEW.md`  
*(oder wo deine Projektübersicht liegt – Pfad ggf. anpassen)*

2. Füge am passenden Ort (z. B. unter „Teilprojekt 2.x – Admin-UI“) folgenden Abschnitt hinzu:

```md
### Stand nach Teilprojekt 2.7 – Admin-Formbuilder: Properties-Panel & Feldbearbeitung

- `/admin/forms/[id]` ist der zentrale Formbuilder-Workspace:
  - linke Spalte: Feldliste (Auswahl des aktiven Feldes),
  - rechte Spalte: Vorschau (klickbare Felder) + Properties-Panel.
- Im Properties-Panel können folgende Eigenschaften eines Feldes direkt im Builder editiert und gespeichert werden:
  - Label, Placeholder, Help-Text,
  - Pflichtfeld (`required`),
  - Aktiv/Inaktiv (`isActive`).
- Persistenz läuft über die bestehende Admin-API:
  - `PATCH /api/admin/forms/[formId]/fields/[fieldId]` mit `x-user-id`.
- UX-Details:
  - Klick in die Vorschau oder Feldliste wählt das aktive Feld,
  - Save-Button ist nur aktiv bei tatsächlichen Änderungen,
  - Erfolg- & Fehlermeldungen werden direkt im Panel angezeigt.
- Linke Spalte ist bewusst für zukünftige globale Form-/CD-Settings reserviert
  (Theme, Farben, Komponenten-Defaults, später Drag & Drop etc.).
- Die Legacy-Feldtabelle (`FormFieldsTable`) bleibt weiterhin als technische Ansicht unterhalb des Builders bestehen.

---

### Stand nach Teilprojekt 2.9 – Admin-Formbuilder: Tablet-Layout & App-nahe Vorschau

- Die Vorschau im Admin-Formbuilder nutzt nun ein **zweispaltiges Tablet-Layout**:
  - Linke Spalte: dynamische Formularfelder mit Drag & Drop und persistierter Reihenfolge.
  - Rechte Spalte: heuristisch erkannter Kontakt-/OCR-Block mit typischen Kontaktfeldern
    (Firma, Vorname, Nachname, Telefon, E-Mail, Notizen).
- Die Vorschau hängt am gleichen Datenstrom wie Feldliste und Properties-Panel:
  - Klicks in Liste und Tablet-Vorschau sind synchron,
  - Änderungen an Label, Placeholder, Help-Text, Required, isActive werden direkt übernommen.
- Die Reihung aus der Feldliste beeinflusst primär die dynamischen Felder (links),
  während der Kontaktblock (rechts) eine eigene, feste Slot-Reihenfolge besitzt.

