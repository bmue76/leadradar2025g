# LeadRadar2025g – Teilprojekt 1.3  
API-Basis & Routing (Forms & Leads) – Schlussrapport

---

## 1. Ziel & Scope

**Ziel von 1.3** war es, eine stabile API-Basis für die Kernobjekte **Form** und **Lead** zu schaffen, die:

- **Admin-Usecases** (Form-Verwaltung, Lead-Listing) über authentifizierte Routen unter `/api/admin/...` abdeckt.
- **Public-/Mobile-Usecases** (Formular laden, Lead erfassen) über öffentliche Routen unter `/api/...` bereitstellt.
- sauber auf dem multi-tenant-fähigen Datenmodell aus Teilprojekt 1.2 aufsetzt.
- klar definierte Contracts (Request-/Response-Shape & Fehlerformat) für spätere Admin-UI und Mobile-App liefert.

**Scope von 1.3:**

- Keine Admin-UI, nur API.
- Keine komplexen Filter/Reports, nur Basis-Pagination & Required-Checks.
- Noch kein E-Mail-/Workflow-Handling – Fokus rein auf persistenter Erfassung.

---

## 2. Ausgangslage

Aus Teilprojekt 1.0–1.2 waren bereits vorhanden:

- Laufende Next.js-15-App (`backend/`), App Router, TypeScript.
- Health-Endpoints:  
  - `GET /api/health`  
  - `GET /api/health/db`
- Prisma 7 mit PostgreSQL:
  - Modelle: `Tenant`, `User`, `Form`, `FormField`, `Lead`.
  - Enums: `FormStatus`, `FormFieldType`.
- Auth & Tenant:
  - Seed mit Demo-Tenant & Demo-User.
  - `requireAuthContext(req)` und `AuthError`.
  - Demo-Route `GET /api/me`.
- DTOs:
  - `FormDto`, `FormFieldDto`, `LeadDto`, `CreateLeadRequest` in `backend/lib/types/forms.ts`.

---

## 3. Implementierte Endpoints

### 3.1 Admin-Endpunkte (Authentifiziert, tenant-scope)

Alle Admin-Routen nutzen `requireAuthContext(req)` und erwarten einen Header:

```http
x-user-id: <UserId>