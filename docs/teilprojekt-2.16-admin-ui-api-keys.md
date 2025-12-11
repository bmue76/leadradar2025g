# Teilprojekt 2.16 – Admin-UI: API-Key-Verwaltung & Mobile-Access

## 1. Ausgangslage & Ziel

Mit Teilprojekt **1.8 – Backend: Security & Hardening** wurde das technische Fundament für API-Keys geschaffen:

- Prisma-Model `ApiKey` mit Relation zu `Tenant`
- Helper in `lib/api-keys.ts`:
  - `generateApiKeyForTenant({ tenantId, name })`
  - `resolveTenantByApiKey(apiKey: string)`
  - `requireApiKeyContext(req)`
- Rate Limiting in `lib/rate-limit.ts`
- Zentralisierte Validation via `lib/validation/*`

Es fehlte jedoch:

- eine **Admin-API**, um API-Keys tenant-spezifisch zu verwalten
- eine **Admin-UI**, in der der Admin API-Keys anlegen, umbenennen und deaktivieren kann
- ein klarer **UX-Flow** für das einmalige Anzeigen des Klartext-API-Keys

Ziel von **2.16**:

- Vollständige API-Key-Verwaltung im Admin:
  - API-Keys auflisten
  - neue Keys erzeugen (inkl. Klartext-Output)
  - Aktiv/Inaktiv toggeln
  - Namen anpassen
- UX-Sicherheit: Klartext-Key wird nur **einmal** angezeigt.
- Vorbereitung, damit Mobile-App und Integrationen später per `x-api-key` auf geschützte Endpunkte zugreifen können.

---

## 2. Datenmodell & Backend-Kontext

### 2.1 Prisma-Model `ApiKey`

(verkürzt, zur Einordnung)

- `id` (Int, PK)
- `tenantId` (FK → `Tenant`)
- `name` (String)
- `keyHash` (String, Hash des API-Keys)
- `isActive` (Boolean)
- `createdAt` (DateTime)
- `lastUsedAt` (DateTime, nullable)

Der Klartext-Key wird **nie** in der Datenbank gespeichert, sondern nur als `keyHash`.

### 2.2 Helper-Funktionen

- `generateApiKeyForTenant({ tenantId, name })`
  - Generiert einen neuen zufälligen API-Key.
  - Berechnet den Hash.
  - Speichert den Datensatz in `ApiKey`.
  - Rückgabe: `{ rawKey, apiKey }`, wobei:
    - `rawKey` = Klartext-Key (nur für den Aufrufer)
    - `apiKey` = Prisma-Objekt des Datensatzes
- `resolveTenantByApiKey(apiKey: string)`
  - Prüft die Hashes und liefert den passenden Tenant.
- `requireApiKeyContext(req)`
  - Liest `x-api-key` aus dem Request.
  - Validiert/auflöst den Tenant.
  - Wirft Fehler, wenn der Key ungültig oder inaktiv ist.

---

## 3. Admin-API: Endpoints & Contracts

### 3.1 GET `/api/admin/api-keys`

Listet alle API-Keys des aktuellen Tenants.

- **Auth**:
  - nutzt `requireAuthContext(req)`
  - in Dev aktuell via Header `x-user-id: "1"` gefakt
- **DB-Query**:
  - `prisma.apiKey.findMany({ where: { tenantId }, orderBy: { createdAt: "desc" } })`
- **Response-DTO** (verkürzt):

```json
{
  "items": [
    {
      "id": 1,
      "name": "Mobile App Prod",
      "isActive": true,
      "createdAt": "2025-12-11T12:34:56.000Z",
      "lastUsedAt": null,
      "displayPrefix": "lrk_********abc123"
    }
  ]
}
