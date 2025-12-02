# LeadRadar2025g – Teilprojekt 1.0: Backend Foundation

## 1. Zielsetzung

Ziel dieses Teilprojekts war es, die **Backend-Basis** für LeadRadar2025g aufzubauen:

- Lauffähige Next.js 15 App (App Router, TypeScript) im Ordner `backend/`.
- Health-Check-Endpunkte, um Service- und DB-Status prüfen zu können.
- Prisma-Basis für PostgreSQL mit Prisma 7 (inkl. Adapter-Setup).
- Erste Dokumentation in `docs/` inklusive Projektübersicht.

Dieses Teilprojekt ist **Backend-first** gedacht – Mobile-Apps folgen in späteren Teilprojekten.

---

## 2. Ausgangslage

- Neues Repo: `leadradar2025g` (GitHub + lokal `C:/dev/leadradar2025g`).
- Noch keine Backend-Struktur vorhanden.
- Zielarchitektur:  
  - `backend/` als eigenständige Next.js-App (API-first).  
  - Datenbank: PostgreSQL (Railway/Supabase, noch nicht final angeschlossen).  
  - ORM: Prisma 7.x (neues Config-Konzept mit `prisma.config.ts`, Adapter Pflicht).

---

## 3. Umsetzungsschritte (chronologisch)

### 3.1 Repo & Ordnerstruktur

- Lokales Repo unter `C:/dev/leadradar2025g` geprüft (ggf. per `git clone` angelegt).
- Unterordner `backend/` im Repo erstellt.

### 3.2 Next.js 15 App im Ordner `backend/`

- Im Ordner `backend/` via `npx create-next-app@latest .` eine neue Next.js-App erzeugt.
- Wichtige Optionen:
  - TypeScript: **Ja**
  - ESLint: **Ja**
  - Tailwind: **Nein** (Backend/API-first, kein Frontend-Fokus in 1.0)
  - App Router: **Ja**
  - `src/`-Directory: **Nein** (Verwendung der `app/`-Struktur im Root)

- Dev-Server startet mit:
  - `cd backend`
  - `npm run dev`
  - Erreichbar unter `http://localhost:3000`.

### 3.3 Health-Check-Endpoint `/api/health`

- Datei: `backend/app/api/health/route.ts`
- Implementierung:
  - `GET /api/health` liefert JSON mit:
    - `status: "ok"`
    - `service: "leadradar-backend"`
    - `timestamp` (ISO-DateString)
- Dient als einfacher Service-Liveness-Check.

### 3.4 Prisma-Setup (Prisma 7 + PostgreSQL + Adapter)

1. **Installation**
   - `npm install prisma --save-dev @prisma/client`
   - `npm install @prisma/adapter-pg pg`
   - `npm install --save-dev @types/pg`
   - `npx prisma init`

2. **Schema & Config**
   - `prisma/schema.prisma`:
     - Enthält:
       - `generator client { provider = "prisma-client-js" }`
       - `datasource db { provider = "postgresql" }`
     - **Keine** `url`-Property (wichtig ab Prisma 7, URL kommt in `prisma.config.ts`).
   - `prisma.config.ts`:
     - Nutzt `defineConfig` und `env('DATABASE_URL')`:
       - `schema: 'prisma/schema.prisma'`
       - `datasource: { url: env('DATABASE_URL') }`

3. **Umgebungsvariablen**
   - `.env` im Ordner `backend/`:
     - Template für `DATABASE_URL`, z. B.:  
       `DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/leadradar2025g?schema=public"`

4. **Prisma Client & Adapter**
   - `lib/prisma.ts`:
     - Erstellt einen `Pool` aus `pg` mit `connectionString: process.env.DATABASE_URL`.
     - Wrappt den Pool mit `PrismaPg` als Adapter.
     - Erzeugt einen Prisma-Client mit:
       - `adapter`
       - `log: ['query', 'error', 'warn']`
     - Nutzt `globalThis`-Caching für Dev, um mehrere Clients bei Hot-Reloads zu vermeiden.

5. **Generate**
   - `npx prisma generate`:
     - Läuft fehlerfrei durch, Client ist generiert.

### 3.5 DB-Health-Check-Endpoint `/api/health/db`

- Datei: `backend/app/api/health/db/route.ts`
- Implementierung:
  - Verwendet `prisma.$queryRaw\`SELECT 1\`` als Minimal-DB-Test.
  - Antworten:
    - OK (echte, erreichbare DB):  
      - `status: "ok"`, `db: "reachable"`, `timestamp`.
    - Fehler (z. B. Platzhalter-Host, keine DB):  
      - `status: "error"`, `db: "unreachable"`, `error` (z. B. `Can't reach database server at HOST`), `timestamp`.
- Aktueller Stand in 1.0:
  - `.env` enthält noch Platzhalter (`HOST`), daher liefert der Endpoint erwartungsgemäß `status: "error"`.

---

## 4. Tests & Verifikation

- **Anwendung gestartet:**  
  - `cd backend`  
  - `npm run dev`  
  - Next.js Dev-Server läuft lokal.

- **Health-Check getestet:**  
  - `GET http://localhost:3000/api/health`  
    - JSON mit `status: "ok"` wird zurückgegeben.

- **Prisma-Generate:**  
  - `npx prisma generate`  
    - Erfolgreich, keine P1012-Fehler mehr (Datasource-URL korrekt in `prisma.config.ts` statt im Schema).
  - PrismaClientConstructor-Fehler wurde durch das Adapter-Setup (`PrismaPg`, `pg`) beseitigt.

- **DB-Health-Check (mit Platzhalter-DB-URL):**
  - `GET http://localhost:3000/api/health/db`
    - Antwort im aktuellen Zustand:
      - `status: "error"`, `db: "unreachable"`, inkl. Fehlermeldung wie `Can't reach database server at HOST`.
    - Dieses Verhalten ist **erwartet**, solange noch keine echte DB-Instanz hinterlegt ist.

---

## 5. Offene Punkte & Nächste Schritte

- **Datenbank-Anbindung**
  - Konkrete PostgreSQL-Instanz auf Railway oder Supabase anlegen.
  - `DATABASE_URL` in `.env` mit echten Credentials versehen.
  - DB-Health-Check erneut testen, Erwartung: `status: "ok"`.

- **Datenmodellierung**
  - Prisma-Models definieren für:
    - `Form`, `FormField`, `Lead`, `User`, `Tenant` (oder `Account`), etc.
  - Naming-Konventionen und Relationsdesign festlegen (Multi-Tenant-ready).

- **Migrationen**
  - Setup für Prisma Migrate (Migrations-Ordner, Naming, Deploy-Strategie).
  - Vorgehen für lokale Entwicklung vs. Staging/Production definieren.

- **Auth & Multi-Tenancy**
  - Auth-Mechanismus (z. B. `x-user-id`-Header) und Tenant-Isolation spezifizieren.
  - Rollen- und Berechtigungskonzept vorbereiten (Admin, Standpersonal, etc.).

- **Deployment**
  - Vercel-Projekt für `backend/` anlegen.
  - Environment-Variablen (inkl. `DATABASE_URL`) in Vercel konfigurieren.
  - Build- & Routing-Konfiguration prüfen.

---

## 6. Fazit Teilprojekt 1.0

Mit Teilprojekt 1.0 ist die **technische Basis** für das Backend von LeadRadar2025g gelegt:

- Lauffähige Next.js-Backend-App im Ordner `backend/`.
- Health-Check-Endpunkte für Service- und DB-Status.
- Prisma 7 sauber konfiguriert (Schema + `prisma.config.ts` + Client-Singleton + PostgreSQL-Adapter).
- Erste Doku-Struktur in `docs/` aufgebaut.

Das Projekt ist damit bereit für die nächsten Schritte:
**Datenmodellierung, API-Design und später die Anbindung der Mobile-App.**
