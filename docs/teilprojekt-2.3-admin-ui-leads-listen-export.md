# LeadRadar2025g – Teilprojekt 2.3  
Admin-UI – Leads-Listen & Export

## 1. Ziel & Ausgangslage

**Ziel von 2.3**

- Pro Formular eine übersichtliche Leads-Ansicht im Admin schaffen.
- Basis-Funktionen:
  - Leads-Liste pro Formular.
  - Meta-Infos (Datum/Zeit, Quelle, Basis-Kontaktdaten).
  - Pagination.
  - Clientseitiger CSV-Export der aktuell angezeigten Leads.

**Ausgangslage**

- Backend 1.0–1.3 war umgesetzt:
  - Prisma-Modelle: `Tenant`, `User`, `Form`, `FormField`, `Lead`.
  - Admin-/Public-API vorhanden, u. a.:
    - `GET /api/admin/forms`
    - `GET /api/admin/forms/[id]`
    - `POST /api/leads`
- Admin-UI aus 2.1/2.2:
  - `/admin/forms` (Formularliste).
  - `/admin/forms/[id]` (Form-Detail mit FormFields-Management).
  - Link von der Form-Detailseite zur Leads-Ansicht war vorgesehen, aber noch ohne echte Leads-UI.

In 2.3 wurde darauf aufgebaut und eine neue Formular-spezifische Leads-Ansicht inklusive CSV-Export implementiert.

---

## 2. API-Vertrag – `GET /api/admin/forms/[id]/leads`

### Request

- **Endpoint:**

  ```txt
  GET /api/admin/forms/[id]/leads
