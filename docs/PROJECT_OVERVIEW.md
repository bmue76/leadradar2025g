# LeadRadar2025g – PROJECT_OVERVIEW

## 1. Kontext & Ziel

LeadRadar2025g ist die Backend-zentrierte Neuumsetzung des LeadRadar-SaaS:
Eine Lösung zur digitalen Leaderfassung auf Messen.  
In dieser Phase steht der Aufbau eines sauberen, modularen Backends im Fokus, das später von einer Web-Admin-UI und einer Mobile-App genutzt wird.

Dieses Repository bildet die technische Basis für:

- Formular-Definition & -Verwaltung (Forms)
- Erfassung von Leads auf Messen (Leads)
- Multi-Tenant-Fähigkeit (Mandanten / Kunden)
- Einfache, später erweiterbare Authentifizierung

---

## 2. Repository-Struktur (High-Level)

- `backend/`
  - Next.js 15 (App Router, TypeScript)
  - API-Routen (REST-artig, JSON)
  - Prisma 7 (PostgreSQL, neuer PrismaPg-Adapter)
  - Health-Checks, Auth-/Tenant-Basics
- `backend/docs/`
  - Projektübersicht (`PROJECT_OVERVIEW.md`)
  - Teilprojekt-Dokumente (`teilprojekt-*.md`)

---

## 3. Technische Basis Backend – Stand nach Teilprojekt 1.0 (Backend Foundation)

**Ziele von 1.0**

- Minimal lauffähiges Backend aufsetzen.
- Health-Checks für Service und Datenbank.
- Prisma 7 mit PostgreSQL-Adapter einrichten.

**Umsetzung**

- Next.js 15 App im Ordner `backend/`:
  - App Router
  - TypeScript
  - Kein Tailwind
  - Kein `src/`-Ordner (Dateien direkt unter `app/`, `lib/`, `prisma/` etc.)

- Health-Endpoints:
  - `GET /api/health`
    - Antwort: JSON mit `status: "ok"`, `service: "leadradar-backend"`, `timestamp`
  - `GET /api/health/db`
    - Führt einen einfachen DB-Check via Prisma/SQL aus (z. B. `SELECT 1`).
    - Meldet DB-Status (ok / Fehler).

- Prisma 7-Basis:
  - `prisma/schema.prisma`
    - `generator client { provider = "prisma-client-js" }`
    - `datasource db { provider = "postgresql" }`
  - `prisma.config.ts`
    - Konfiguration der `datasource` mit `env('DATABASE_URL')`
  - `lib/prisma.ts`
    - Prisma-Client-Singleton mit `PrismaPg`-Adapter und `pg`-Connection-Pool.

- DB-Anbindung:
  - PostgreSQL als lokale Entwicklungsdatenbank.
  - `DATABASE_URL` in `.env` (z. B. `postgresql://postgres:PASS@localhost:5432/leadradar2025g?schema=public`).

**Ergebnis von 1.0**

- Backend startet mit `npm run dev`.
- Health-Checks funktionieren.
- Prisma 7 ist korrekt konfiguriert und kann mit der Datenbank sprechen.

---

## 4. Stand nach Teilprojekt 1.1 – Auth & Tenant Handling

### 4.1 Zielsetzung

- Einführung einer minimalen Multi-Tenant-Struktur:
  - `Tenant` (Mandant / Kunde)
  - `User` (Benutzer, gehört zu genau einem Tenant)
- Einfache, Header-basierte „Fake-Auth“:
  - `x-user-id` als Platzhalter für „eingeloggter Benutzer“
- Zentrales Utility:
  - `requireAuthContext(req)` lädt `user` + `tenant` und liefert einen klar typisierten Kontext.
- Seed-Daten:
  - Ein Demo-Tenant und ein Demo-User für lokale Tests.

---

### 4.2 Datenmodell (Prisma)

**Datei:** `backend/prisma/schema.prisma`

Relevante Models:

```prisma
model Tenant {
  id        Int      @id @default(autoincrement())
  name      String
  slug      String   @unique

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  users     User[]
}

model User {
  id        Int      @id @default(autoincrement())
  email     String   @unique
  name      String?

  tenantId  Int
  tenant    Tenant   @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
