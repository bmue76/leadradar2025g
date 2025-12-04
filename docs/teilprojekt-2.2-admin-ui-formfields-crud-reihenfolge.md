# LeadRadar2025g – Teilprojekt 2.2  
Admin-UI – FormFields-CRUD & Reihenfolge

---

## 1. Ziel & Ausgangslage

**Ziel von Teilprojekt 2.2**

Die Formular-Detailseite im Admin soll um ein vollständiges Feld-Management erweitert werden:

- Felder eines Formulars im Admin anzeigen (inkl. Order, Required, Aktiv-Status).
- Felder anlegen, bearbeiten und löschen können.
- Reihenfolge der Felder steuern (Buttons + Drag & Drop).
- Aktiv-/Inaktiv-Schaltung von Feldern.
- Ausschließlich Nutzung der Admin-API (kein direkter Prisma-Zugriff aus der UI).

**Ausgangslage**

- Backend-Basis (1.0–1.3) ist funktionsfähig:
  - Modelle: `Tenant`, `User`, `Form`, `FormField`, `Lead`.
  - Enums: `FormStatus`, `FormFieldType`.
  - Admin-Endpoints für Forms & Leads:
    - `/api/admin/forms`, `/api/admin/forms/[id]`, `/api/admin/forms/[id]/leads`, `/api/leads` etc.
  - Auth/Tenant:
    - `requireAuthContext(req)` mit `x-user-id` Header.
    - Demo-User via Seed (`x-user-id: 1`).

- Admin-UI aus 2.1:
  - `(admin)` Route-Group mit:
    - `/admin` – Dashboard.
    - `/admin/forms` – Formularliste.
    - `/admin/forms/[id]` – Form-Detail, Felder bisher nur read-only.

In 2.2 wurde auf dieser Basis das Feld-Management (FormFields) im Admin implementiert.

---

## 2. API-Routenübersicht – FormField-Endpoints (Admin)

Alle Endpoints sind:

- **Methoden:** nur Admin-API (authentifiziert)
- **Header:** `x-user-id` mit gültigem User einer Tenant-Organisation
- **Scope:** alle Operationen sind strikt tenant-scope (Form & Field gehören zum Tenant des Nutzers)

### 2.1 `GET /api/admin/forms/[id]/fields`

**Zweck:**  
Liefert alle Felder (`FormField`) zu einem Formular für den aktuellen Tenant.

**Request:**

- Pfadparameter:
  - `id` – Formular-ID (integer > 0)
- Header:
  - `x-user-id: "<userId>"`

**Response (200):**

```jsonc
[
  {
    "id": 1,
    "tenantId": 1,
    "formId": 4,
    "key": "firstName",
    "label": "Vorname",
    "type": "TEXT",
    "placeholder": "Vorname",
    "helpText": null,
    "required": true,
    "order": 1,
    "config": null,
    "isActive": true,
    "createdAt": "2025-12-03T21:00:00.000Z",
    "updatedAt": "2025-12-03T21:10:00.000Z"
  }
]
