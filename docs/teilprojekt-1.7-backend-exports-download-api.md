LeadRadar2025g – Teilprojekt 1.7  
Backend – Exports (CSV & Download-API)

1. Ziel & Ausgangslage
----------------------

Ziel von Teilprojekt 1.7 war es, für LeadRadar2025g saubere, serverseitige Export-APIs zu implementieren:

- CSV-Downloads für Leads eines Formulars (Admin-Seite).
- Nutzung über klar definierte Admin-API-Endpoints (kein Client-Hacking).
- Streng authentifiziert (x-user-id) und tenant-scope-beschränkt.
- CSV-Format, das in der DACH-Welt (Excel) gut funktioniert.

Ausgangslage:

- Backend (Next.js App Router, Prisma 7) inkl. Models `Tenant`, `User`, `Form`, `FormField`, `Lead` war vorhanden.
- Auth / Tenant-Handling via `requireAuthContext(req)` mit `x-user-id` vorhanden.
- Admin-API für Forms & Leads (`/api/admin/forms`, `/api/admin/forms/[id]`, `/api/admin/forms/[id]/leads`) existierte bereits.
- In Teilprojekt 2.3 wurde auf der Admin-UI (`/admin/forms/[id]/leads`) bereits ein **clientseitiger CSV-Export** auf Basis der aktuell geladenen Leads implementiert.

Teilprojekt 1.7 ergänzt dies nun um:

- Einen **serverseitigen CSV-Export** für alle Leads eines Formulars (inkl. optionaler Zeitfilter).
- Einen dedizierten Download-Endpoint unter `/api/admin/...`.
- Limitierung und Fehlerbehandlung für sehr große Exporte.

2. Umsetzung & Architektur
--------------------------

### 2.1 Neuer Admin-Export-Endpoint

Es wurde ein neuer Admin-Endpoint implementiert:

- `GET /api/admin/forms/[id]/leads/export`

Technische Umsetzung:

- Datei:  
  `app/api/admin/forms/[id]/leads/export/route.ts`
- Handler-Signatur (Next 15/16):

  ```ts
  export async function GET(
    req: NextRequest,
    context: { params: Promise<{ id: string }> },
  ): Promise<Response> { ... }
