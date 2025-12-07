# Teilprojekt 1.6 – Events (Messen), Formular-Bindung & Mobile-API

## 1. Ziel

Mit Teilprojekt 1.6 werden **Events (Messen)** als erste Klasse in der Domain eingeführt.  
Ziele:

- Events pro Tenant verwalten (inkl. Zeitraum, Ort, Status).
- **Formulare an Events binden** (eins-zu-viele über Join-Tabelle).
- **Leads optional einem Event zuordnen** (`eventId`).
- **Mobile-API** bereitstellen, damit eine Mobile-App:
  - aktive Events eines Tenants laden kann,
  - zu einem Event das/die konfigurierte(n) Formular(e) erhält.

---

## 2. Ausgangslage (Stand vor 1.6)

Bereits vorhanden (aus 1.0–1.4, 1.7 & 2.x):

- **Datenmodell**
  - `Tenant`, `User`
  - `Form` (inkl. `tenantId`, `status`, `slug`, `version`, …)
  - `FormField` (inkl. `order`, `isActive`, `type`, `config`)
  - `Lead` (inkl. `tenantId`, `formId`, `values`, `source`, `createdByUserId`, Timestamps)
- **Auth / Tenant**
  - `requireAuthContext(req)` mit `x-user-id` Header
  - liefert `user` + `tenant`
- **API**
  - Admin-API:
    - `GET /api/admin/forms`
    - `POST /api/admin/forms`
    - `GET /api/admin/forms/[id]`
    - `PATCH /api/admin/forms/[id]`
    - `CRUD /api/admin/forms/[id]/fields`
    - `GET /api/admin/forms/[id]/leads`
    - `GET /api/admin/forms/[id]/leads/export` (CSV, 1.7)
  - Public-/Mobile-API:
    - `GET /api/forms/[id]` (Formular laden)
    - `POST /api/leads` (Lead erfassen + E-Mail-Flows, 1.4)

Es gab jedoch **keinen expliziten Event-Kontext**: Leads und Forms hingen nur indirekt an einem abstrakten „Kontext“, aber nicht an einem Event-Modell.

---

## 3. Datenmodell (Prisma) – Stand nach 1.6

### 3.1 Neue Enum `EventStatus`

```prisma
enum EventStatus {
  PLANNED
  ACTIVE
  FINISHED
}
