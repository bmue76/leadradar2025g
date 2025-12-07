# LeadRadar2025g – Teilprojekt 2.10  
## Admin-UI – Events (Liste, Detail & Formular-Bindung)

**Zeitraum:** 2025-12-07  
**Status:** abgeschlossen  
**Bereich:** Admin-UI (Next.js / App Router)

---

## 1. Ziel & Scope

Mit Teilprojekt **2.10** wurde die **Event-Verwaltung** in der Admin-UI umgesetzt.

Events waren bereits im Backend (Teilprojekt 1.6) modelliert und über Admin-/Mobile-APIs erreichbar, aber noch nicht im Admin-Frontend sichtbar. Ziel von 2.10:

- **Events-Liste** im Admin-Bereich (`/admin/events`).
- **Event-Detailseite** (`/admin/events/[id]`) mit:
  - Anzeige der Event-Metadaten (Name, Zeitraum, Status, Location, Beschreibung).
  - Anzeige der zugeordneten Formulare (read-only) inkl. Primary-Flag.
  - Basis-Editing für Event (Name, Zeitraum, Status) via Admin-API.

**Nicht im Scope (bewusst offen gelassen):**

- UI-gestützte Event-Erstellung.
- UI-gestützte Formular-Bindung (Hinzufügen / Entfernen von Formularen).
- Primary-Formular-Umschaltung per UI.
- Filter / Suche / Pagination für Events.

---

## 2. Admin-UI – Routen & Komponenten

### 2.1 Übersicht Routen

- **Liste:**  
  `app/(admin)/admin/events/page.tsx` → `/admin/events`
- **Detail:**  
  `app/(admin)/admin/events/[id]/page.tsx` → `/admin/events/[id]`
- **Loading States:**
  - `app/(admin)/admin/events/loading.tsx`
  - `app/(admin)/admin/events/[id]/loading.tsx`
- **Client-Komponente für Editing:**
  - `app/(admin)/admin/events/[id]/EventEditForm.tsx`

### 2.2 Sidebar-Navigation

Die Admin-Sidebar wurde um einen neuen Eintrag erweitert:

```ts
const navItems: NavItem[] = [
  { label: 'Dashboard', href: '/admin', ... },
  { label: 'Formulare', href: '/admin/forms', ... },
  {
    label: 'Events',
    href: '/admin/events',
    isActive: (pathname) =>
      pathname === '/admin/events' || pathname.startsWith('/admin/events/'),
  },
  { label: 'Leads', href: '/admin/leads', ... },
  { label: 'Exporte', href: '/admin/exports', ... },
  { label: 'Einstellungen', href: '/admin/settings', ... },
];
