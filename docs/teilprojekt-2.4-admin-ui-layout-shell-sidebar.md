# LeadRadar2025g – Teilprojekt 2.4  
Admin-UI – Layout-Shell & Sidebar-Navigation

---

## 1. Ziel

Ziel von Teilprojekt **2.4** ist es, eine konsistente **Layout-Shell** für den gesamten Admin-Bereich zu schaffen:

- persistente Sidebar-Navigation für alle `/admin/...`-Seiten,
- klaren Content-Bereich, in dem die bestehenden Admin-Seiten gerendert werden,
- Active-State für den jeweils aktiven Menüpunkt,
- ein Layout, das sich für spätere Erweiterungen (Formbuilder, Events, Billing, Settings, Mobile) eignet.

Fokus: **Desktop-Admin-UX**, mobiles Verhalten darf einfach, aber robust sein.

---

## 2. Ausgangslage

Vor Teilprojekt 2.4 war der Stand:

- Backend-Teilprojekte **1.0–1.4** & **1.7** abgeschlossen (Datenmodell, API, E-Mail-Flows, CSV-Export).
- Admin-UI-Teilprojekte:
  - **2.1** – Forms-CRUD (List & Detail),
  - **2.2** – FormFields-CRUD & Reihenfolge,
  - **2.3** – Leads-Listen & Export.
- Admin-Routen (Auszug):
  - `/admin` – Dashboard / Intro
  - `/admin/forms` – Formularliste
  - `/admin/forms/[id]` – Form-Detail inkl. Felder-Management
  - `/admin/forms/[id]/leads` – Leads-Ansicht & CSV-Export
  - `/admin/leads` – Placeholder
- Layout:
  - bisher simpler Header / Top-Navigation,
  - keine echte, konsistente Sidebar-Struktur.

Ziel von 2.4: all diese Seiten in eine gemeinsame **Layout-Shell** einbetten.

---

## 3. Umsetzung

### 3.1 Layout-Shell (`app/(admin)/admin/layout.tsx`)

Die Admin-Layout-Datei wurde so umgebaut, dass sie eine **Sidebar + Content**-Struktur bereitstellt:

- Pfad: `backend/app/(admin)/admin/layout.tsx`
- Struktur (vereinfacht):

```tsx
export default function AdminLayout({ children }) {
  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <div className="flex min-h-screen md:h-screen flex-col md:flex-row">
        <AdminSidebar />
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
