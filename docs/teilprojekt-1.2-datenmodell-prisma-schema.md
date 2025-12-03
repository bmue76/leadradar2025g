# LeadRadar2025g – Teilprojekt 1.2  
## Datenmodell & Prisma-Schema (Forms & Leads Core)

---

## 1. Ziel & Ausgangslage

**Ziel dieses Teilprojekts**

- Kern-Datenmodell für Formulare und Leads definieren.
- Multi-Tenant-fähige Prisma-Modelle implementieren:
  - `Form` (Formular-Kopf)
  - `FormField` (Felddefinitionen eines Formulars)
  - `Lead` (erfasste Datensätze)
- Sinnvolle Enums für Formularstatus und Feldtypen erstellen.
- Migration und Seed einrichten, damit ein Demo-Szenario sofort nutzbar ist.
- Erste API-/UI-Typen für spätere Routen bereitstellen.

**Ausgangslage**

- Next.js 15 Backend (`backend/`) läuft.
- Prisma 7 ist mit PostgreSQL + `PrismaPg`/`pg` eingerichtet.
- Modelle `Tenant` und `User` existieren bereits.
- Seed-Skript legt einen Demo-Tenant + Demo-User an.
- Auth-/Tenant-Handling aus Teilprojekt 1.1 ist vorhanden (u. a. `/api/me`).

---

## 2. Modell-Übersicht & Beziehungen

### 2.1 Enums

**`FormStatus`**

- `DRAFT` – Formular im Entwurf.
- `ACTIVE` – Formular produktiv im Einsatz (z. B. auf einer Messe).
- `ARCHIVED` – Formular ist nicht mehr aktiv, bleibt aber für Historie erhalten.

**`FormFieldType`**

- Textbasierte Felder:
  - `TEXT`
  - `TEXTAREA`
  - `EMAIL`
  - `PHONE`
  - `NUMBER`
- Auswahl-Felder:
  - `SELECT`
  - `MULTISELECT`
  - `CHECKBOX`
  - `RADIO`
- Datum/Zeit:
  - `DATE`
  - `DATETIME`
  - `TIME`
- Sonstiges:
  - `NOTE` (rein informatives Feld, z. B. Trenner oder Beschreibung)

---

### 2.2 Modelle

#### Tenant (erweitert)

```prisma
model Tenant {
  id        Int      @id @default(autoincrement())
  name      String
  slug      String   @unique

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  users      User[]
  forms      Form[]
  formFields FormField[]
  leads      Lead[]
}
