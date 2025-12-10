# Teilprojekt 2.14 – Admin-UI: Globale Leads-Übersicht & Filter

## 1. Ziel & Scope

Ziel von Teilprojekt 2.14 ist es, eine **globale Übersicht** aller Leads eines Tenants zu schaffen – unabhängig davon, über welches Formular oder Event sie erfasst wurden.

Kernpunkte:

- Neue Admin-Seite `/admin/leads` als zentrale Leads-Liste.
- Neuer Admin-Endpoint `GET /api/admin/leads` mit Pagination und Filtermöglichkeiten.
- Basis-Infos zu jedem Lead: Datum/Zeit, Event, Formular, Name, Firma, E-Mail, Quelle, Values-Preview.
- Navigation von Leads zu Event- und Form-Details.
- Klarer Empty-State und vorbereiteter Zeitraum-Filter.

---

## 2. Backend – Endpoint `GET /api/admin/leads`

### 2.1 Pfad & Auth

- **Route:** `GET /api/admin/leads`
- **Ort im Code:** `app/api/admin/leads/route.ts`
- **Auth:** `requireAuthContext(req)`  
  - Tenant-Kontext wird ermittelt.
  - Tenant-ID wird aus `auth.tenantId` oder `auth.tenant.id` extrahiert.
- **Scope:** Alle Leads, die zum aktuellen Tenant gehören (`where: { tenantId }`).

### 2.2 Query-Parameter

Unterstützte Query-Parameter:

- `page` (optional, default: `1`)
  - 1-basierte Seitennummer.
- `limit` (optional, default: `25`, max: `200`)
  - Anzahl Leads pro Seite.
- `eventId` (optional)
  - Filtert Leads auf ein bestimmtes Event.
- `formId` (optional)
  - Filtert Leads auf ein bestimmtes Formular.
- `from` (optional, ISO-Datum `YYYY-MM-DD`)
  - Untere Grenze des Erfassungsdatums (inklusive).
- `to` (optional, ISO-Datum `YYYY-MM-DD`)
  - Obere Grenze des Erfassungsdatums (inklusive, intern als `< nextDay` umgesetzt).

Beispiel:

```http
GET /api/admin/leads?page=2&limit=50&eventId=1&from=2025-01-01&to=2025-01-31
