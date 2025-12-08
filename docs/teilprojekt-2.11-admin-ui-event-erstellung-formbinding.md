# Teilprojekt 2.11 – Admin-UI: Event-Erstellung & Formular-Bindung

## Kontext

LeadRadar2025g ist eine SaaS-Lösung zur digitalen Leaderfassung für Messen.  
Im Backend existieren die Modelle für Events inkl. Status und EventForm-Bindungen.  
Die Admin-API stellt bereits grundlegende Endpoints zur Verfügung:

- `GET /api/admin/events`
- `POST /api/admin/events`
- `GET /api/admin/events/[id]`
- `PATCH /api/admin/events/[id]`
- `GET /api/admin/events/[id]/forms`

Die Admin-UI hatte bereits:

- Sidebar-Menüpunkt **Events**
- `/admin/events` → Event-Übersicht (read-only)
- `/admin/events/[id]` → Event-Detail mit Metadaten & read-only Formular-Zuordnung

Ziel dieses Teilprojekts war, die Event-Verwaltung im Admin-Frontend funktional zu machen:

- Events direkt aus der UI heraus erstellen
- Events bearbeiten
- Formulare an Events binden
- ein primäres Formular pro Event definieren

---

## Ziele

1. **Event-Erstellung im Admin-UI**
   - Button **„+ Event erstellen“** in der Event-Liste `/admin/events`.
   - Neue Seite `/admin/events/new` mit Formular:
     - Name
     - Startdatum
     - Enddatum
     - Location
     - Status (Enum)
     - Beschreibung (optional)
   - Speichern via `POST /api/admin/events`.
   - Redirect nach Erfolg auf `/admin/events/[id]`.

2. **Formular-Bindung in der Event-Detailansicht**
   - Event-Detail (`/admin/events/[id]`) zeigt:
     - Event-Metadaten (inkl. Editing)
     - Panel „Formular-Zuordnung“
   - Aus dem Panel heraus:
     - weitere Formulare per Dropdown wählen und an das Event binden
     - alle aktuell zugeordneten Formulare sehen
     - direkt in den Formbuilder (`/admin/forms/[formId]`) wechseln

3. **Primary-Formular-Umschaltung**
   - Pro Event kann genau ein Formular als **primär** markiert werden.
   - Primäres Formular ist in der Liste sichtbar hervorgehoben (Badge „Primär“).
   - Umschaltung per Radio-Button löst Backend-Update aus.
   - Beim ersten zugeordneten Formular wird automatisch `isPrimary = true` gesetzt.

4. **UX**
   - Klare Hinweise, wenn:
     - noch keine Formulare zugeordnet sind,
     - noch kein primäres Formular gesetzt ist.
   - Fehlermeldungen werden im UI angezeigt (statt nur in der Console).

---

## Umsetzung – Admin-UI

### Event-Liste `/admin/events`

**Datei:**  
`app/(admin)/admin/events/page.tsx`

- Serverseitiger Fetch der Eventliste:
  - `GET /api/admin/events` mit Header `x-user-id: "1"` (Dev-Stub).
  - Nutzung einer absoluten URL mittels `NEXT_PUBLIC_BASE_URL` oder Fallback `http://localhost:3000`.
- Darstellung:
  - Tabellarische Übersicht mit:
    - Name
    - Zeitraum (Startdatum – Enddatum)
    - Status
    - Ort
    - Link „Details“ → `/admin/events/[id]`
- Neuer Button im Header:
  - **„+ Event erstellen“** → Link auf `/admin/events/new`.

### Event-Erstellung `/admin/events/new`

**Datei:**  
`app/(admin)/admin/events/new/page.tsx`

- Client-Komponente mit Formularfeldern:
  - `name` (Pflicht)
  - `startDate` (Pflicht, `type="date"`)
  - `endDate` (Pflicht, `type="date"`)
  - `location` (optional)
  - `status` (`PLANNED | ACTIVE | FINISHED`)
  - `description` (optional)
- Validierung im Client:
  - Name und Datumsfelder sind Pflicht.
- API-Call:
  - `POST /api/admin/events`
  - Header:
    - `Content-Type: application/json`
    - `x-user-id: "1"` (Dev-Stub)
  - Body: JSON mit obigen Feldern.
- Nach Erfolg:
  - Antwort wird geparst, Event-ID extrahiert (`id` oder `event.id`).
  - Redirect via `router.push("/admin/events/[id]")`.

---

## Umsetzung – Event-Detail & Formular-Zuordnung

### Event-Detail `/admin/events/[id]`

**Datei:**  
`app/(admin)/admin/events/[id]/page.tsx`

- Serverseitiges Laden:
  - `GET /api/admin/events/[id]` → Event-Metadaten
  - `GET /api/admin/events/[id]/forms` → EventForm-Bindungen
  - `GET /api/admin/forms` → alle verfügbaren Formulare
- Alle `fetch`-Calls:
  - nutzen absolute URLs via `NEXT_PUBLIC_BASE_URL` / Fallback `http://localhost:3000`
  - senden Header `x-user-id: "1"` (Dev-Stub für Admin-User)
- Layout:
  - Header mit Titel **„Event-Details“** + Back-Link zur Eventliste.
  - Zwei Spalten (auf Desktop):
    - **Links:** `EventMetaEditor`
    - **Rechts:** `EventFormsManager`

#### EventMetaEditor

**Datei:**  
`app/(admin)/admin/events/[id]/EventMetaEditor.tsx`

- Client-Komponente zum Bearbeiten der Event-Metadaten.
- Felder:
  - Name
  - Start-/Enddatum
  - Status
  - Location
  - Beschreibung
- Speichern:
  - `PATCH /api/admin/events/[id]`
  - Header:
    - `Content-Type: application/json`
    - `x-user-id: "1"`
- UI:
  - Erfolgs- und Fehlermeldungen werden im Panel angezeigt.

#### EventFormsManager

**Datei:**  
`app/(admin)/admin/events/[id]/EventFormsManager.tsx`

- Props:
  - `eventId`
  - `initialBindings` (EventForm-Bindungen)
  - `allForms` (alle Formulare)
  - `initialAvailableForms` (Filter: alle Forms, die noch nicht gebunden sind)
- Zustand:
  - `bindings` (aktueller Stand der Zuordnungen)
  - `availableForms` (aktuell im Dropdown auswählbar)
  - `selectedFormId` (aktuelle Auswahl)
  - Flags für Ladezustände und Fehlermeldungen
- Anzeige „Zugeordnete Formulare“:
  - Liste aller Bindungen mit:
    - Formularnamen
    - Link „Formular öffnen“ → `/admin/forms/[formId]`
    - Badge **„Primär“** bei `isPrimary = true`
    - Radio-Button „Primär“ zur Umschaltung
  - Warnhinweis, falls es Bindungen gibt, aber noch kein primäres Formular gesetzt ist.
- Bereich „Weiteres Formular zuordnen“:
  - Wenn `availableForms.length === 0`:
    - Hinweistext:
      - Es sind keine weiteren Formulare verfügbar, noch nicht gebundene Formulare fehlen.
      - Empfehlung, zuerst ein neues Formular anzulegen.
  - Sonst:
    - Dropdown mit allen verfügbaren Formularen.
    - Button **„Formular hinzufügen“**.

##### API-Calls aus EventFormsManager

- Formular hinzufügen:
  - `POST /api/admin/events/[id]/forms`
  - Header:
    - `Content-Type: application/json`
    - `x-user-id: "1"`
  - Body: `{ formId: number }`
  - Erwartete Antwort: `{"forms": EventFormBinding[]}`  
    → aktualisiert `bindings` und `availableForms`.
  - Business-Logik im Backend:
    - Erste Bindung wird automatisch `isPrimary = true`, falls vorher kein primäres Formular existiert.

- Primäres Formular setzen:
  - `PATCH /api/admin/events/[id]/forms`
  - Header:
    - `Content-Type: application/json`
    - `x-user-id: "1"`
  - Body: `{ primaryFormId: number }`
  - Erwartete Antwort: `{"forms": EventFormBinding[]}`  
    → `bindings` wird aktualisiert, genau eine Bindung hat `isPrimary = true`.

---

## Umsetzung – Admin-API

**Datei:**  
`app/api/admin/events/[id]/forms/route.ts`

Implementierte Methoden:

### GET

- Zweck:
  - Alle Formular-Bindungen eines Events laden.
- Parameter:
  - `params.id` (Promise, per `await` ausgelesen).
- Ablauf:
  1. `requireAuthContext(req)` zur Auth-Prüfung.
  2. `eventId` als Number parsen.
  3. `prisma.eventForm.findMany` mit:
     - `where: { eventId }`
     - `orderBy: [{ isPrimary: "desc" }, { id: "asc" }]`
     - `include: { form: { id, name, description } }`
- Antwort:
  - `200 OK, { forms: [...] }` oder
  - `400` bei invalidem `eventId`,
  - `500` bei internem Fehler.

### POST

- Zweck:
  - Ein Formular an ein Event binden.
- Body:
  - `{ formId: number }`.
- Ablauf:
  1. Auth via `requireAuthContext(req)`.
  2. `eventId` aus `params.id` parsen.
  3. Sicherstellen, dass Event (`prisma.event`) und Formular (`prisma.form`) existieren.
  4. Prüfen, ob `eventForm`-Eintrag bereits existiert.
  5. Falls nicht:
     - Prüfen, ob bereits ein primäres Formular existiert (`isPrimary = true`).
     - `eventForm.create` mit:
       - `eventId`
       - `formId`
       - `isPrimary: !existingPrimary`.
  6. Danach alle Bindungen des Events erneut laden wie bei GET.
- Antwort:
  - `200 OK, { forms: [...] }` oder passende Fehlercodes (`400/404/500`).

### PATCH

- Zweck:
  - Primäres Formular für ein Event setzen.
- Body:
  - `{ primaryFormId: number }`.
- Ablauf:
  1. Auth via `requireAuthContext(req)`.
  2. `eventId` aus `params.id` parsen.
  3. Event laden.
  4. Prüfen, ob eine Bindung mit `formId = primaryFormId` existiert.
  5. In einer Transaction:
     - Alle Bindungen des Events auf `isPrimary = false` setzen.
     - Die Bindung mit `formId = primaryFormId` auf `isPrimary = true` setzen.
  6. Danach alle Bindungen wie bei GET laden.
- Antwort:
  - `200 OK, { forms: [...] }` oder passende Fehlercodes (`400/404/500`).

---

## UX-Flows

### 1. Neues Event erstellen

1. Admin öffnet `/admin/events`.
2. Klick auf **„+ Event erstellen“**.
3. Formular auf `/admin/events/new` ausfüllen.
4. Klick auf **„Event erstellen“**.
5. Erfolgsfall:
   - Redirect auf `/admin/events/[id]`.
   - Event erscheint in der Eventliste.
6. Fehlerfall:
   - Lesbare Fehlermeldung im Formular (z. B. fehlende Pflichtfelder, API-Fehler).

### 2. Formular an Event binden

1. Admin öffnet `/admin/events/[id]`.
2. Im Panel „Formular-Zuordnung“:
   - Falls noch keine Formulare zugeordnet:
     - Hinweis darauf und Aufruf, ein Formular hinzuzufügen.
3. Dropdown „Weiteres Formular zuordnen“:
   - Ein Formular auswählen, das noch nicht gebunden ist.
4. Klick auf **„Formular hinzufügen“**.
5. Erfolgsfall:
   - Formular erscheint in der Liste „Zugeordnete Formulare“.
   - Wenn es die erste Bindung ist:
     - Automatisch Badge **„Primär“**.
6. Fehlerfall:
   - Lesbare Fehlermeldung (z. B. wenn das Formular nicht existiert oder API-Fehler).

### 3. Primäres Formular umschalten

1. In der Liste „Zugeordnete Formulare“:
   - Radio-Button „Primär“ beim gewünschten Formular aktivieren.
2. Erfolgsfall:
   - Badge **„Primär“** springt auf das ausgewählte Formular.
3. Fehlerfall:
   - Fehlermeldung im Panel („Primäres Formular konnte nicht gesetzt werden.“).

---

## Offene Punkte / Ideen für spätere Teilprojekte

- Tenant-Scoping in `/api/admin/events/[id]/forms` wieder explizit einziehen (statt global auf `eventId`).
- Bessere Darstellung, welches Formular aktuell in der App/User-Ansicht verwendet wird.
- Option, Zuordnung wieder zu entfernen (Unbind).
- UI für `EventStatus`-Transitions (z. B. eigener Flow von PLANNED → ACTIVE → FINISHED).
- Optionaler Schnellzugriff vom Event direkt in eine Event-spezifische Leads-Ansicht.
