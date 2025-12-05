# LeadRadar2025g – Teilprojekt 2.5  
Admin-Formbuilder – Builder-View & Vorschau

## 1. Ziel

Teilprojekt 2.5 hatte das Ziel, für jedes Formular einen eigenen **Formbuilder-View** zu schaffen, der:

- eine klare Builder-Aufteilung bietet:
  - links: Feldliste / Auswahl des aktiven Feldes,
  - rechts: Formular-Vorschau,
- auf der bestehenden Form-/FormField-API aufbaut (kein neues Datenmodell),
- als Grundlage für spätere Erweiterungen dient (Presets, Styling, Properties-Panel etc.).

Im Fokus stand eine **erste funktionsfähige Builder-Oberfläche**, nicht ein voll ausgestatteter visueller Editor.

---

## 2. Ausgangslage

Bereits vorhanden aus den vorherigen Teilprojekten:

- **Backend 1.x**
  - Prisma-Modelle: `Tenant`, `User`, `Form`, `FormField`, `Lead` inkl. `FormStatus`, `FormFieldType`.
  - Admin-API:
    - `GET /api/admin/forms`
    - `GET /api/admin/forms/[id]`
    - `GET /api/admin/forms/[id]/fields`
    - `POST/PUT/DELETE /api/admin/forms/[id]/fields/[fieldId]`
    - `GET /api/admin/forms/[id]/leads`, `GET /api/admin/forms/[id]/leads/export`
    - `POST /api/leads`
  - Auth: `requireAuthContext(req)` mit `x-user-id` im Header.

- **Admin-UI 2.1–2.4**
  - `/admin` – Dashboard / Intro.
  - `/admin/forms` – Formularliste.
  - `/admin/forms/[id]` – Formulardetail inkl. FormFields-CRUD & Reihenfolge (Drag & Drop).
  - `/admin/forms/[id]/leads` – Leads-Liste & CSV-Export.
  - `/admin/leads`, `/admin/exports`, `/admin/settings` – Platzhalter.
  - Einheitliche Admin-Layout-Shell mit persistenter Sidebar-Navigation.

Noch **nicht** vorhanden war ein dedizierter Builder-View mit Live-Vorschau. Bisher wurden Felder rein tabellarisch verwaltet.

---

## 3. Umsetzung – Routing & Datenfluss

### 3.1 Routing

Neuer Admin-Route-Tree:

- **Form-Detail** (bestehend):
  - `app/(admin)/admin/forms/[id]/page.tsx`
- **Formbuilder (neu):**
  - `app/(admin)/admin/forms/[id]/builder/page.tsx`
  - `app/(admin)/admin/forms/[id]/builder/FormBuilderShell.tsx` (Client-Komponente)

Die URL-Struktur:

- Formular-Detail:  
  `/admin/forms/[id]`
- Formbuilder-View pro Formular:  
  `/admin/forms/[id]/builder`

Im Form-Detail wurde ein zusätzlicher Button ergänzt:

- **„Formbuilder öffnen“** → `/admin/forms/[id]/builder`.

Im Builder-View gibt es einen Back-Link:

- **„← Zurück zum Formular-Detail“** → `/admin/forms/[id]`.

### 3.2 Datenbeschaffung

Der Builder-Page-Server-Component (`builder/page.tsx`):

- löst `params` (Next.js 16: Promise) mit `const { id: rawId } = await props.params;`,
- validiert die ID (`Number(rawId)`, `notFound()` bei Ungültigkeit),
- lädt parallel:
  - `GET /api/admin/forms/[id]` → Form-Metadaten (`FormDto`),
  - `GET /api/admin/forms/[id]/fields` → Felder (`BuilderFormField[]`),
- übergibt an die Client-Komponente:

  ```ts
  <FormBuilderShell form={formWithFields} formId={id} />
