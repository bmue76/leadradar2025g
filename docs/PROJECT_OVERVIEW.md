# LeadRadar2025g – Projektübersicht

SaaS-Lösung zur **digitalen Leaderfassung für Messen**.  
Backend-first Ansatz: Zuerst eine saubere, skalierbare Backend/API-Basis, danach Mobile-App(s).

---

## 1. Projekt-Steckbrief

- **Projektname:** LeadRadar2025g  
- **Ziel:** Digitale Erfassung, Verwaltung und Auswertung von Leads auf Messen  
- **Architektur:**  
  - Backend: Next.js 15 (App Router) als API-first Backend im Ordner `backend/`  
  - ORM: Prisma 7 (PostgreSQL, Konfiguration über `prisma.config.ts`)  
  - DB: PostgreSQL (Railway / Supabase, noch einzurichten)  
  - Mobile: React Native / Expo (kommt in späteren Teilprojekten)  
- **Hosting-Zielbild:**  
  - Backend/API: Vercel  
  - Datenbank: Railway oder Supabase  

---

## 2. Struktur & Code-Basis (Stand nach Teilprojekt 1.0)

Vereinfachte Top-Level-Struktur:

- `/backend` – Next.js 15 App Router Backend (API-first)
  - `app/`
    - `api/health/route.ts` – allgemeiner Health-Check
    - `api/health/db/route.ts` – DB-Health-Check (Prisma-gestützt)
  - `lib/`
    - `prisma.ts` – Prisma-Client-Singleton mit PostgreSQL-Adapter (`PrismaPg` + `pg`-Pool)
  - `prisma/`
    - `schema.prisma` – Prisma-Schema (Generator + Datasource, noch ohne Models)
  - `prisma.config.ts` – Prisma 7 Config (Datasource-URL via `env('DATABASE_URL')`)
  - `.env` – lokale Umgebungsvariablen (z. B. `DATABASE_URL=...`)
- `/docs`
  - `PROJECT_OVERVIEW.md` – dieses Dokument
  - `teilprojekt-1.0-backend-foundation.md` – Doku zu Teilprojekt 1.0

---

## 3. Teilprojekte (Überblick)

Geplante/angelegte Teilprojekte (laufend ergänzen):

- **Teilprojekt 1.0 – Backend Foundation**
  - Next.js 15 Backend im Ordner `backend/`
  - Health-Check-Endpunkte
  - Prisma-Basissetup (Prisma 7, PostgreSQL, Adapter, Client-Singleton)
- **Teilprojekt 1.x – Backend-Features**
  - Datenmodellierung (Forms, Leads, Users, Tenants, …)
  - Admin-API-Endpunkte
  - Auth / Multi-Tenant-Konzept
- **Teilprojekt 2.x – Admin-UI**
  - Web-Admin für Form-Management, Lead-Übersicht, Exporte
- **Teilprojekt 3.x – Mobile-App**
  - React Native / Expo App
  - API-Integration, Offline/Sync, QR/Visitenkarten-Scan

(Diese Liste wird Schritt für Schritt konkretisiert und mit eigenen Teilprojekt-Dokumenten verlinkt.)

---

## 4. Stand nach Teilprojekt 1.0 – Backend Foundation

### 4.1 Technische Ergebnisse

- **Next.js 15 Backend aufgesetzt**  
  - `backend/` enthält eine lauffähige Next.js-App (App Router, TypeScript aktiviert).
  - `npm run dev` startet lokal unter `http://localhost:3000`.

- **Health-Check-Endpunkte**  
  - `GET /api/health`  
    - Liefert JSON mit:
      - `status: "ok"`
      - `service: "leadradar-backend"`
      - `timestamp: <ISO-String>`
  - `GET /api/health/db`  
    - Verwendet Prisma mit PostgreSQL-Adapter (`PrismaPg`) und `pg`-Pool.
    - Antwort:
      - Bei funktionierender DB: `status: "ok"`, `db: "reachable"`.
      - Bei fehlender/Platzhalter-DB: `status: "error"`, `db: "unreachable"`, Fehlertext (z. B. `Can't reach database server at HOST`).

- **Prisma-Basis (Prisma 7, PostgreSQL)**  
  - `prisma/schema.prisma`
    - Enthält:
      - `generator client { provider = "prisma-client-js" }`
      - `datasource db { provider = "postgresql" }`
    - **Keine** `url`-Konfiguration im Schema (Prisma-7-konform).
  - `prisma.config.ts`
    - Definiert:
      - `schema: 'prisma/schema.prisma'`
      - `datasource: { url: env('DATABASE_URL') }`
  - `.env`
    - Enthält ein Template für `DATABASE_URL`, z. B.:  
      `DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/leadradar2025g?schema=public"`
  - `lib/prisma.ts`
    - Prisma-Client-Singleton mit:
      - `Pool` aus `pg` (Connection-String aus `process.env.DATABASE_URL`)
      - `PrismaPg`-Adapter (`adapter`-Konfiguration für Prisma 7)
      - `log: ['query', 'error', 'warn']`
  - `npx prisma generate`
    - Läuft fehlerfrei durch, Prisma Client ist generiert.

### 4.2 Offene Punkte & Nächste Schritte (Ausblick)

- Konkrete DB-Instanz auf Railway oder Supabase anlegen und `DATABASE_URL` in `.env` aktualisieren.
- Datenmodell für LeadRadar (Forms, FormFields, Leads, User, Tenant/Account) entwerfen und in Prisma-Models gießen.
- Migrationsstrategie (Prisma Migrate) und Naming Conventions definieren.
- Auth-Strategie (z. B. `x-user-id` Header, Multi-Tenant-Konzept) festlegen.
- Deployment-Setup für Vercel (Backend) vorbereiten (Umgebungsvariablen, Build-Settings).

---

## 5. Changelog (Auszug)

- **[Teilprojekt 1.0] Backend Foundation**  
  - Next.js 15 Backend im Ordner `backend/` initialisiert.  
  - Health-Check-Endpoints (`/api/health`, `/api/health/db`) implementiert.  
  - Prisma 7 Basis-Konfiguration (Schema + `prisma.config.ts`, `.env`, `lib/prisma.ts` mit PostgreSQL-Adapter) eingerichtet.  
  - Prisma Client erfolgreich generiert.
