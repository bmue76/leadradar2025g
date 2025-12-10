# Teilprojekt 2.12 – Admin-UI: Event-Leads-Ansicht & CSV-Export

## Ziel & Scope

Ziel dieses Teilprojekts ist eine Event-spezifische Leads-Ansicht im Admin-Bereich von LeadRadar, inklusive CSV-Export:

- Neue Admin-Seite zur Anzeige aller Leads eines Events.
- Backend-Endpoint für Event-Leads mit Pagination.
- CSV-Export aller Leads eines Events (auf Basis des primären Event-Formulars).
- Sauberer Flow: Event-Detail → Event-Leads → CSV-Export.

---

## Neue/angepasste Routen

### Admin-UI

- `/admin/events/[id]/leads`
  - Serverseitige Seite (App Router, Server Component).
  - Lädt:
    - `GET /api/admin/events/[id]` (Event-Metadaten).
    - `GET /api/admin/events/[id]/leads` (paginierte Event-Leads).
  - Features:
    - Tabellenansicht aller Leads mit:
      - ID
      - Datum/Zeit (`createdAt`)
      - Quelle (`source`)
      - Name (aus `values`: `vorname/firstName` + `nachname/lastName`)
      - E-Mail
      - Firma
      - Werte-Preview (erste ~6 key=value Paare aus `values`).
    - Pagination mit `page` und `limit` (über URL-Query):
      - Anzeige: „Seite X von Y – insgesamt N Leads“.
      - Buttons „Zurück“ / „Weiter“.
    - Navigation:
      - „Zurück zum Event“ → `/admin/events/[id]`
      - Button für CSV-Export.

### Admin-API

#### Event-Leads (JSON + CSV)

- `GET /api/admin/events/[id]/leads`

  **Auth:**

  - `requireAuthContext(req)` mit `x-user-id` Header.
  - Tenant-Scope über `auth.tenant.id`.

  **Parameter (Query):**

  - `page` (optional, Default: `1`)
  - `limit` (optional, Default: `25`, max: `200`)
  - `format` (optional)
    - `json` (Default): paginierte JSON-Response für Admin-UI.
    - `csv`: CSV-Export für dieses Event basierend auf dem primären Formular.

  **JSON-Response (format=json):**

  ```json
  {
    "items": [
      {
        "id": 1,
        "createdAt": "2025-01-01T12:34:56.000Z",
        "source": "demo",
        "formId": 1,
        "eventId": 1,
        "values": {
          "vorname": "Max",
          "nachname": "Muster",
          "email": "max@example.com",
          "firma": "Muster AG"
        }
      }
    ],
    "page": 1,
    "limit": 25,
    "total": 1,
    "totalPages": 1
  }
