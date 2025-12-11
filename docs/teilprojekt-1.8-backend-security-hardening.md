# Teilprojekt 1.8 – Backend – Security & Hardening (Rate Limiting, API-Keys & Validation)

## 1. Zielsetzung

Härtung der öffentlich zugänglichen und mobilen API-Endpunkte von LeadRadar:

- Missbrauchsschutz durch Rate Limiting.
- Vorbereitung eines API-Key-Konzepts für nicht-interaktive Clients (Mobile / Integrationen).
- Zentrale, einheitliche Request-Validierung mittels Zod für kritische Endpoints.

Fokus in 1.8:

- Public-/Mobile-Endpoints:
  - `POST /api/leads`
  - `GET /api/forms/[id]`
  - `GET /api/mobile/events`
  - `GET /api/mobile/events/[id]/forms`
- Admin-Endpoint:
  - `POST /api/admin/forms`

---

## 2. API-Key-Modell & Helpers

### 2.1 Prisma-Model `ApiKey`

Neues Model im `schema.prisma`:

- `ApiKey` mit Relation zu `Tenant`:
  - `id` (PK, autoincrement)
  - `tenantId` (FK → Tenant)
  - `name` (anzeigename, z. B. „Mobile App iPad Team A“)
  - `keyHash` (SHA-256 Hash des API-Keys, kein Klartext in der DB)
  - `isActive` (Boolean, Standard `true`)
  - `createdAt`, `updatedAt` (Timestamps)
  - `lastUsedAt` (optional, Auditing / Monitoring)

### 2.2 API-Key-Helpers (`lib/api-keys.ts`)

Implementiert:

- `generateApiKeyForTenant({ tenantId, name })`:
  - Generiert einen zufälligen Token (32 Bytes → 64 Hex-Zeichen).
  - Hash mit SHA-256 (`hashApiKey()`).
  - Speichert nur `keyHash` + Metadaten in der DB.
  - Gibt zurück:
    - `rawKey` (nur einmal, für Anzeige/Export)
    - `apiKey` (DB-Record ohne Klartext).

- `resolveTenantByApiKey(rawKey)`:
  - Hash des übergebenen Tokens bilden.
  - `ApiKey` suchen (`keyHash`, `isActive: true`) inkl. `tenant`.
  - Bei Erfolg:
    - `lastUsedAt` aktualisieren (Best Effort).
    - `{ tenant, apiKey }` zurückgeben.
  - Bei Misserfolg: `null`.

- `requireApiKeyContext(req)`:
  - Liest `x-api-key` aus dem Request-Header.
  - Ruft `resolveTenantByApiKey` auf.
  - Wirft Fehler bei:
    - fehlendem API-Key,
    - invalidem oder inaktivem API-Key.

**Hinweis:** In 1.8 werden API-Keys noch nicht flächendeckend vorausgesetzt, sondern als vorbereitende Infrastruktur angelegt.

---

## 3. Rate Limiting

### 3.1 Zentrales Utility (`lib/rate-limit.ts`)

In-Memory Rate Limiting mit globalem Store:

- `checkRateLimit({ key, windowMs, maxRequests })`:
  - `key`: frei definierbar, z. B. `${clientId}:POST:/api/leads`.
  - `windowMs`: Fenster in Millisekunden (z. B. 60'000 für 1 Minute).
  - `maxRequests`: maximale Requests pro Fenster.
  - Rückgabe:
    - `{ allowed: boolean, remaining: number, retryAfterMs?: number }`.

- Interner Store:
  - `Map<string, { count: number; windowStart: number }>` auf `globalThis.__LR_RATE_LIMIT_STORE__`,
    damit der State Hot-Reloads im Dev-Modus überlebt.

- `getClientIp(req: NextRequest)`:
  - Versucht in Reihenfolge:
    - `x-forwarded-for` (erstes Element),
    - `x-real-ip`,
    - `host` (Fallback),
    - `"unknown"` (Worst Case).

> Hinweis: Für Produktion (multi-node, horizontal scaling) ist ein externer Store (z. B. Redis) vorgesehen; `checkRateLimit` ist so gebaut, dass ein späterer Swap möglich ist.

### 3.2 Aktive Rate Limits

Aktuell aktivierte Limits (Version 1.8):

- `POST /api/leads`
  - Key:
    - `clientId = x-api-key || getClientIp(req)`
    - `key = ${clientId}:POST:/api/leads`
  - Limit:
    - `maxRequests: 30`
    - `windowMs: 60_000`
  - Verhalten bei Limit:
    - HTTP 429
    - Body: `{ error: "Too many requests", code: "RATE_LIMITED", details: { retryAfterMs, retryAfterSeconds } }`
    - Header: `Retry-After` (Sekunden).

- `GET /api/forms/[id]`
  - Key: `${clientId}:GET:/api/forms/[id]`
  - Limit: `60 / Minute`

- `GET /api/mobile/events`
  - Key: `${clientId}:GET:/api/mobile/events`
  - Limit: `120 / Minute`

- `GET /api/mobile/events/[id]/forms`
  - Key: `${clientId}:GET:/api/mobile/events/[id]/forms`
  - Limit: `60 / Minute`

**Rate-Limit-Strategie:**

- Mobile-/Public-Traffic wird pro Client (IP oder API-Key) gebucketed.
- `x-api-key` hat Priorität vor IP und erlaubt später genauere Tenant-/Client-Zuordnung.
- Limits sind bewusst konservativ gewählt und können bei Bedarf angepasst werden.

---

## 4. Zentrale Input-Validation mit Zod

### 4.1 Leads (`lib/validation/leads.ts` + `POST /api/leads`)

- `leadValuesSchema`:
  - `z.record(z.string(), z.unknown())`
  - Erlaubt beliebige Feld-Keys (Mapping zu `FormField.key`).

- `createLeadRequestSchema`:
  - Felder:
    - `formId`: `number`, `int`, `positive`
    - `values`: `leadValuesSchema`
    - `eventId`: optional `number`, `int`, `positive`
    - `source`: optional `string`, max. 255

- `POST /api/leads`:
  - JSON-Parsing + `createLeadRequestSchema.safeParse(json)`.
  - Bei Fehler:
    - HTTP 400
    - `{ error: "Validation failed", code: "VALIDATION_ERROR", details: { issues: [...] } }`.
  - Fachliche Pflichtfeld-Prüfung bleibt bestehen:
    - Formularfelder werden geladen.
    - Für jedes `required` Feld wird mit `isNonEmptyValue` geprüft.
    - Bei fehlenden Pflichtfeldern:
      - HTTP 400
      - `{ error: "Pflichtfelder fehlen oder sind leer.", code: "MISSING_REQUIRED_FIELDS", missingFields: [...] }`.

### 4.2 Forms (`lib/validation/forms.ts` + `POST /api/admin/forms`)

- `formStatusSchema`:
  - Enum: `"DRAFT" | "ACTIVE" | "ARCHIVED"`.

- `formCreateStatusSchema`:
  - Enum: `"DRAFT" | "ACTIVE"` (für Create sinnvoll).

- `formFieldBaseSchema`:
  - `key`, `label`, `type`: `string` (required).
  - optionale Felder: `required`, `placeholder`, `helpText`, `order`, `config`.

- `createFormRequestSchema`:
  - Felder:
    - `name`: `string`, min. 1, max. 255
    - `description`: optional, `string`, max. 2000
    - `status`: optional, `formCreateStatusSchema`
    - `slug`: optional, `string`, max. 255
    - `fields`: optional, `array(formFieldBaseSchema)`

- `POST /api/admin/forms`:
  - Request-Body bleibt API-seitig:
    - `title`, optional `slug`, `status`, `description`, `fields`
  - Mapping für Validation:
    - `name = body.title`
    - Zod-Validation über `createFormRequestSchema.safeParse({ name, ... })`.
  - Bei Validation Error:
    - HTTP 400
    - `{ error: "Validation failed", code: "VALIDATION_ERROR", details: { issues: [...] } }`.
  - Slug-Handling:
    - Provided `slug`: Kollision → 409 `CONFLICT`.
    - Generierter `slug`: aus `title` via `slugify` + `-1`, `-2`, ... (max. 50 Versuche).

---

## 5. Aktuell nicht aktivierte, aber vorbereitete Security-Bausteine

- `requireApiKeyContext(req)` wird aktuell noch nicht flächendeckend eingesetzt,
  ist aber bereit, um:
  - Mobile-/Integrations-Clients über `x-api-key` zu authentifizieren,
  - Tenant-Scope über API-Key abzuleiten.

Zukünftige Schritte (Folge-Teilprojekte):

- API-Keys im Admin-UI verwalten (Erstellen, Deaktivieren, Rotieren).
- Mobile- und Integrations-Routen verpflichtend an `requireApiKeyContext` binden.
- Erweiterung des Rate-Limit-Mechanismus um:
  - Per-Tenant-/Per-Plan-Limits,
  - Externen Store (Redis/KV) in Produktion.

---

## 6. Zusammenfassung

Teilprojekt 1.8 bringt:

- Ein API-Key-Modell und zentrale Helpers als Grundlage für sichere Integrationen.
- Ein generalisierbares Rate-Limit-Utility mit konkreter Aktivierung auf Public-/Mobile-Endpunkten.
- Zentrale, einheitliche Request-Validierung mit Zod für `POST /api/leads` und `POST /api/admin/forms`.
- Eine bessere „Security Story“ für LeadRadar – inkl. sauberer Fehlerrückgaben (429, VALIDATION_ERROR) für Clients.
