# LeadRadar2025g – Teilprojekt 2.7  
Admin-Formbuilder – Properties-Panel & Feldbearbeitung

## 1. Ziel & Scope

Ziel von Teilprojekt 2.7 war es, den bestehenden Admin-Formbuilder auf der Route  
`/admin/forms/[id]` um ein **Properties-Panel** zu erweitern, damit Admins die wichtigsten Feldeigenschaften direkt im Builder bearbeiten können – ohne den Workspace zu verlassen.

Im Scope von 2.7:

- Properties-Panel für das **aktive Feld** (rechts, unterhalb der Vorschau).
- Bearbeitbare Eigenschaften:
  - `label`
  - `placeholder`
  - `helpText`
  - `required`
  - `isActive`
- Read-only Eigenschaften:
  - `type` (Feldtyp)
  - `key`
- Persistenz via bestehender Admin-API:
  - `PATCH /api/admin/forms/[formId]/fields/[fieldId]`
- UX:
  - Klickbare Preview-Felder rechts.
  - Klarer Save-Button mit Loading- und Success-State.
  - Fehleranzeige im Panel.

Nicht im Scope:

- Änderung von Feldtyp oder Key.
- Bearbeitung komplexer `config`-Strukturen (z. B. Select-Optionen).
- Drag & Drop im Builder.
- Styling-/Branding-Konfiguration auf Form-Ebene (Farben, Themes, etc.).

---

## 2. Ausgangslage

Stand nach Teilprojekt 2.6:

- Route `GET /admin/forms/[id]` rendert den zentralen Form-Workspace.
- **FormBuilderWorkspace** zeigte:
  - links eine Feldliste,
  - rechts eine einfache, read-only Vorschau.
- Darunter existierte die technische Feldtabelle (`FormFieldsTable`, Legacy), über die bisher das Feld-CRUD (inkl. Reihenfolge) bedient wurde.
- Die Admin-API für FormFields war bereits vorhanden:

  - `GET /api/admin/forms/[id]/fields`
  - `POST /api/admin/forms/[id]/fields`
  - `PATCH /api/admin/forms/[id]/fields/[fieldId]`
  - `DELETE /api/admin/forms/[id]/fields/[fieldId]`

- Auth / Tenant:
  - `requireAuthContext(req)` mit `x-user-id` Header.

Lücke:  
Der Builder konnte Felder anzeigen & auswählen, aber **nicht direkt bearbeiten**. Feld-Editing lief nur über die technische Tabelle oder separate Views.

---

## 3. Architektur – FormBuilderWorkspace & Properties-Panel

### 3.1. Übersicht

Die zentrale Komponenten-Datei ist:

`app/(admin)/admin/forms/[id]/FormBuilderWorkspace.tsx`

Kernbestandteile:

- **FormBuilderWorkspaceInner** (default & named Export):
  - Props:
    - `form?: FormDTO`
    - `formName?: string`
    - `fields?: FormFieldLike[]` (leichter Typ, kompatibel zu bestehendem `page.tsx`)
    - `initialFields?: FormFieldDTO[]`
  - Der Komponentenname im Export:
    - `export { FormBuilderWorkspaceInner as FormBuilderWorkspace }`
    - `export default FormBuilderWorkspaceInner;`

- **Leichter Feld-Typ `FormFieldLike`**:
  - Deckt das ab, was `page.tsx` aktuell liefert, inkl. optionaler Felder aus `FormFieldDTO`:

    ```ts
    type FormFieldLike = {
      id: number;
      key: string;
      label: string | null;
      type: string;
      required: boolean;
      placeholder: string | null;
      helpText: string | null;
      formId?: number;
      order?: number | null;
      isActive?: boolean | null;
    };
    ```

- **Layout**:

  ```text
  ┌───────────────────────────────────────────────┐
  │ Formbuilder-Workspace Header                 │
  └───────────────────────────────────────────────┘
  ┌───────────────┬──────────────────────────────┐
  │ linke Spalte  │ rechte Spalte                │
  │               │                              │
  │ Feldliste     │ Vorschau (Tablet-Layout)     │
  │ (Button-Liste │  + klickbare Felder          │
  │  je Feld)     │  + Properties-Panel          │
  └───────────────┴──────────────────────────────┘
