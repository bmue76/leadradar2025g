# LeadRadar2025g – Teilprojekt 1.4  
## Leads – E-Mail-Flows (Danke-Mail & Innendienst) – Schlussrapport

**Status:** abgeschlossen  
**Zeitraum:** Dezember 2025  

---

## 1. Ziel & Ausgangslage

**Ziel von Teilprojekt 1.4**

Für neu erfasste Leads sollen automatisch E-Mail-Flows ausgelöst werden:

- **Danke-Mail** an den Lead (optional / per Feature-Flag).
- **Innendienst-Mail** an interne Empfänger (z. B. Sales / Innendienst).

Dabei waren folgende Anforderungen wichtig:

- Klare Trennung von **Transport** (Mail-Versand) und **Inhalt** (Templates).
- Saubere **Konfiguration über `.env`** (Provider, Absender, Empfänger, Flags).
- Fehler im Mailversand dürfen **nie** den Lead-Speicherprozess blockieren.
- Architektur so bauen, dass später:
  - pro Tenant/Form eigene Texte / Konfiguration möglich sind,
  - weitere Events (z. B. „Lead qualifiziert“, „Termin gebucht“) andockbar sind.

**Ausgangslage**

- Backend (Next.js App Router, Prisma 7) und Admin-UI waren bereits vorhanden.
- Lead-Erfassung funktionierte schon über `POST /api/leads` (inkl. Pflichtfeld-Validierung).
- Es gab bisher **keine** E-Mail-Flows in LeadRadar2025g.
- Erfahrungen aus LeadRadar2025f zeigten, dass eine zu starre Umsetzung vermieden werden soll → Fokus auf flexible, aber pragmatische Basis.

---

## 2. Architektur & Komponenten

### 2.1 Mail-Provider & Konfiguration

Es wurde ein **zentrales Mail-Interface** eingeführt:

- Datei: `backend/lib/mail.ts`
- Zentrale Funktion:
  ```ts
  export async function sendMail(
    options: {
      to: string | string[];
      subject: string;
      html?: string;
      text?: string;
      from?: string;
      replyTo?: string;
    },
  ): Promise<{ ok: boolean; error?: unknown }>
