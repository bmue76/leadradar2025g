
---

## Schritt 2 – Neues Doku-File für Teilprojekt 2.1 anlegen

**Tool:** VS Code  
**Ziel:** Eigenständige Doku-Datei für dieses Teilprojekt, die du später im Masterchat referenzieren kannst.

**Aktion:**

Erstelle die Datei  
`backend/docs/teilprojekt-2.1-admin-ui-forms-leads-list-detail.md`  
mit folgendem **vollständigen** Inhalt:

```md
# LeadRadar2025g – Teilprojekt 2.1  
## Admin-UI: Forms & Leads (List & Detail)

---

## 1. Ziel & Ausgangslage

**Ziel von Teilprojekt 2.1**

Auf Basis der bestehenden Backend-API (Teilprojekte 1.0–1.3) soll ein erster schlanker Admin-Bereich entstehen, mit Fokus auf:

- Admin-Routing & Layout-Struktur
- Formular-Liste (`/admin/forms`)
- Formular-Detail (`/admin/forms/[id]`)
- Einfache UX (Status-Anzeige, Loading-States, Fehlertexte)
- Nutzung der bestehenden Admin-API (kein direktes Prisma in der UI)

**Ausgangslage**

- Repo: `C:/dev/leadradar2025g`
- Backend-/Next-App: `backend/`
- App Router, TypeScript, Prisma 7
- Admin-API vorhanden:
  - `GET /api/admin/forms`
  - `GET /api/admin/forms/:id`
  - `GET /api/admin/forms/:id/leads`
- Public-API vorhanden:
  - `GET /api/forms/:id`
  - `POST /api/leads`
- Auth / Tenant:
  - `requireAuthContext(req)` mit `x-user-id`
  - Demo-User per Seed (`x-user-id: 1`)
- DTOs in `backend/lib/types/forms.ts`:
  - `FormDTO`, `FormFieldDTO`, `LeadDTO`, ...

In 2.1 wird **kein** Datenmodell geändert, sondern nur auf der bestehenden API ein Admin-UI-Layer aufgebaut.

---

## 2. Admin-Routing & Struktur

**Route-Group & Layout**

- Admin-Routen liegen unter:

  ```text
  backend/app/
    (admin)/
      admin/
        layout.tsx
        page.tsx
        forms/
          loading.tsx
          page.tsx
          [id]/
            loading.tsx
            page.tsx
