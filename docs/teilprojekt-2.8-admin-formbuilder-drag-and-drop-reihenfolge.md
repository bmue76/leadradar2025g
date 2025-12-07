# LeadRadar2025g – Teilprojekt 2.8  
Admin-Formbuilder – Drag & Drop & Reihenfolge (Super UX)

## 1. Ziel

Im zentralen Formbuilder-Workspace unter `/admin/forms/[id]` sollen Admin-User die Reihenfolge der Formularfelder direkt per Drag & Drop ändern können – mit klarer UX, sofort sichtbarer Auswirkung in der Vorschau und sauberer Persistenz des `order`-Werts in der Datenbank.

Konkret:

- Felder in der linken Feldliste können per Drag & Drop umsortiert werden.
- Die neue Reihenfolge ist sofort in der Vorschau sichtbar.
- Die Reihenfolge wird erst nach explizitem Klick auf „Reihenfolge speichern“ in der Datenbank persistiert.
- Der Workspace bleibt „Single Source of Truth“ (kein separater Legacy-Screen mehr für Reihenfolge).

---

## 2. Kontext & Scope

Vorgänger-Teilprojekte:

- **2.6 – FormDetail & Builder fusionieren (Basis)**  
  `/admin/forms/[id]` wurde zum zentralen Formbuilder-Workspace mit:
  - Form-Header,
  - Feldliste links,
  - vereinfachter Vorschau & Legacy-Tabelle.

- **2.7 – Properties-Panel & Feldbearbeitung**  
  Rechts entstand ein Properties-Panel, um Feldeigenschaften des aktiven Feldes zu bearbeiten:
  - `label`, `placeholder`, `helpText`,
  - `required`, `isActive`.

Status vor 2.8:

- Die Reihenfolge der Felder (`FormField.order`) wurde zwar serverseitig bereits genutzt, konnte aber im Workspace noch **nicht** per Drag & Drop geändert werden.
- Reihenfolge-Änderungen liefen noch über Legacy-Buttons / technische Tabellen.

Scope von 2.8:

- **Im Scope**:
  - Drag & Drop in der Feldliste (UI & State-Management).
  - Persistenz der `order`-Werte via Admin-API.
  - Live-Sync mit Vorschau + Active-State-Kopplung.
  - UX-Feinschliff (Handles, Status-Hinweise).

- **Out of Scope**:
  - Auto-Scroll bei sehr langen Listen (Optional in späterem Schritt).
  - Komplexe Layouts (z. B. zweispaltige Tablet-Ansicht).
  - Bulk-Operationen und Feld-Gruppierungen.

---

## 3. Technische Umsetzung

### 3.1 Zentrale Komponenten

**File:** `app/(admin)/admin/forms/[id]/page.tsx`

- Lädt Form-Details direkt via Prisma:

  ```ts
  const form = await prisma.form.findUnique({
    where: { id: idNum },
    include: {
      fields: {
        orderBy: [{ order: 'asc' }, { id: 'asc' }],
      },
    },
  });
