
Speichern. 💾

---

## Schritt 2 – Teilprojekt-Doku `docs/teilprojekt-1.1-auth-tenant-handling.md` anlegen

**Tool:** VS Code  
**Ziel:** Eigenständige, detaillierte Doku nur für dieses Teilprojekt.

**Aktion:**

Lege die Datei  
`C:/dev/leadradar2025g/backend/docs/teilprojekt-1.1-auth-tenant-handling.md`  
an und fülle sie **komplett** mit:

```md
# LeadRadar2025g – Teilprojekt 1.1: Auth & Tenant Handling

**Datum:** 03.12.2025  
**Status:** Abgeschlossen

---

## 1. Ziel & Ausgangslage

**Projektkontext**

LeadRadar2025g ist das Backend-First-Repo für die SaaS-Lösung „LeadRadar“, mit der Aussteller Leads auf Messen digital erfassen können.  
In Teilprojekt 1.0 wurde eine lauffähige Backend-Basis (Next.js 15 + Prisma 7 + Health-Checks) geschaffen.

**Ziel von Teilprojekt 1.1**

- Minimalen Multi-Tenant-Unterbau einführen:
  - `Tenant` (Mandant / Kunde)
  - `User` (Benutzer, gehört zu genau einem Tenant)
- Einfachen, header-basierten Auth-Mechanismus etablieren:
  - `x-user-id` als Platzhalter für „eingeloggter Benutzer“
- Zentrale Auth-/Tenant-Hilfsfunktion bereitstellen:
  - `requireAuthContext(req)` → liefert `{ user, tenant }`
- Seed-Daten für lokale Entwicklung:
  - Demo-Tenant + Demo-User, um Auth-Flows schnell testen zu können.
- Beispiel-API, die diesen Kontext nutzt:
  - `GET /api/me`

---

## 2. Architekturentscheidungen

### 2.1 Datenmodell: Tenant & User

**Modelle in `prisma/schema.prisma`:**

- `Tenant`
  - Repräsentiert einen Mandanten (Kunde, Firma, Aussteller).
  - Felder:
    - `id` (Primary Key)
    - `name` (Anzeigename)
    - `slug` (eindeutiger Kurzname, z. B. für Subdomains / Routing)
    - `createdAt`, `updatedAt`
  - Beziehungen:
    - `users: User[]` – ein Tenant hat mehrere User.

- `User`
  - Repräsentiert einen Benutzer.
  - Felder:
    - `id` (Primary Key)
    - `email` (eindeutig, spätere Basis für echte Auth)
    - `name` (optional)
    - `tenantId` (FK auf `Tenant`)
    - `createdAt`, `updatedAt`
  - Beziehungen:
    - `tenant: Tenant` – jeder User gehört genau zu einem Tenant.
    - `onDelete: Cascade` auf der Relation: Löscht man einen Tenant, werden seine User entfernt (für lokale Entwicklung praktikabel).

### 2.2 Header-basierte „Fake-Auth“ via `x-user-id`

- Für 1.1 wird bewusst **kein** vollständiger Login-Flow implementiert.
- Stattdessen:
  - Der Client (Browser, Mobile-App, API-Client) sendet den Header:
    - `x-user-id: <User-ID>`
  - Die API-Routen können diesen Header nutzen, um direkt den User aus der DB zu laden.
- Vorteile:
  - Sehr einfach für Entwicklung & Tests.
  - Ermöglicht es, Multi-Tenant-Logik frühzeitig technisch zu verankern.
- Einschränkungen:
  - Nicht sicher genug für Produktion.
  - Kein Passwort-/Token-Handling.
  - Kein Rollen-/Rechtemodell.

### 2.3 Zentrales Auth-/Tenant-Utility (`requireAuthContext`)

- Datei: `backend/lib/auth.ts`
- Kernideen:
  - Eine zentrale Funktion kapselt:
    - Lesen des Headers `x-user-id`.
    - Validierung (Ganzzahl > 0).
    - Laden von `User` inkl. `Tenant`.
  - Fehler werden als eigene `AuthError`-Klasse geworfen:
    - Enthält HTTP-Status (`status: number`) und einen Code (`'UNAUTHORIZED' | 'FORBIDDEN'`).
- Vorteile:
  - API-Routen bleiben schlank:
    - `const { user, tenant } = await requireAuthContext(req);`
  - Einheitliches Fehlerverhalten bei Auth-Problemen.
  - Später leicht erweiterbar (z. B. auf Token-basierten Auth-Mechanismus).

### 2.4 Seed-Strategie (Prisma 7 + Raw SQL)

- Aufgrund der neuen Prisma-7-Architektur (Adapter-basiert) und der einfachen Seed-Anforderungen wurde eine **Raw-SQL-basierte** Seed-Lösung gewählt.
- Datei: `backend/prisma/seed.cjs`
  - Verwendet den `PrismaPg`-Adapter und `DATABASE_URL` aus `.env`.
  - Nutzt `INSERT ... ON CONFLICT ... DO UPDATE` für:
    - `Tenant` (Konflikt auf `slug`)
    - `User` (Konflikt auf `email`)
  - Setzt `createdAt` / `updatedAt` explizit mit `NOW()`.

---

## 3. Umgesetzte Dateien

### 3.1 Prisma & Datenbank

**Datei:** `backend/prisma/schema.prisma`

- Ergänzt/definiert:
  - `model Tenant`
  - `model User`
- Migration:
  - `npx prisma migrate dev --name init_auth_tenant`
  - Erstellt Tabellen `Tenant` und `User`.

**Datei:** `backend/prisma/seed.cjs`

- Zweck:
  - Anlage eines Demo-Tenants + Demo-Users.
- Inhalt (Kurzbeschreibung):
  - Adapter-Setup mit `PrismaPg`.
  - Upsert-Logik via Raw-SQL:
    - `Tenant`: `name = "Demo Tenant"`, `slug = "demo-tenant"`.
    - `User`: `email = "demo@leadradar.test"`, `name = "Demo User"`, `tenantId` auf Demo-Tenant.
  - Setzt `createdAt`/`updatedAt` via `NOW()`.

### 3.2 Auth-/Tenant-Utility

**Datei:** `backend/lib/auth.ts`

- Exportiert:
  - `AuthError` (mit `status` und `code`).
  - `AuthContext` (`{ user, tenant }`).
  - `requireAuthContext(req: NextRequest): Promise<AuthContext>`.
- Kernlogik:
  1. `x-user-id` aus Request-Headern lesen.
  2. Wert in Number casten und validieren.
  3. User inkl. Tenant via Prisma laden:
     - `prisma.user.findUnique({ where: { id }, include: { tenant: true } })`
  4. Bei fehlendem Header, ungültiger ID oder nicht gefundenem User/Tenant:
     - `throw new AuthError('...', 401, 'UNAUTHORIZED')`.

### 3.3 Beispiel-API

**Datei:** `backend/app/api/me/route.ts`

- Implementiert `GET /api/me`.
- Verwendet `requireAuthContext(req)`.
- Response:
  - `200 OK` mit:
    - `user`: Basisdaten (id, email, name, tenantId, createdAt, updatedAt).
    - `tenant`: Basisdaten (id, name, slug, createdAt, updatedAt).
  - `401 UNAUTHORIZED` bei fehlendem/ungültigem Header oder nicht gefundenem User/Tenant.

---

## 4. Nutzung & Tests

### 4.1 Setup & Migration

```bash
cd /c/dev/leadradar2025g/backend

# Prisma-Client generieren (falls nötig)
npx prisma generate

# Migration für Tenant/User anwenden
npx prisma migrate dev --name init_auth_tenant
