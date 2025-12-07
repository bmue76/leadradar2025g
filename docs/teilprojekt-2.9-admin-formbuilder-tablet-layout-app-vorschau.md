# Teilprojekt 2.9 – Admin-Formbuilder – Tablet-Layout & App-nahe Vorschau

## 1. Ziel & Scope

Im Teilprojekt 2.9 sollte die Vorschau des Admin-Formbuilders so umgebaut werden,  
dass sie einer späteren Tablet-/App-Ansicht der Lead-Erfassung möglichst nahekommt:

- Zweispaltiges **Tablet-Layout** innerhalb der Vorschau.
- Linke Spalte: **dynamische Formularfelder** (alle „normalen“ Felder).
- Rechte Spalte: **Kontakt-/OCR-Block** mit typischen Kontaktfeldern  
  (Firma, Vorname, Nachname, Telefon, E-Mail, Notizen).
- Die Vorschau hängt an denselben Daten wie:
  - Drag & Drop aus der Feldliste (Reihenfolge),
  - Properties-Panel (Label, Placeholder, Help-Text, Required, isActive).

Die Umsetzung zielt auf eine **strukturelle Annäherung** an das App-Layout (Tablet-Feeling),  
nicht auf eine 1:1-Pixelkopie des späteren React-Native-UI.

---

## 2. Ausgangslage

Stand nach Teilprojekt 2.8:

- `/admin/forms/[id]` war der zentrale Formbuilder-Workspace mit:
  - Header (Formname, Status, Beschreibung),
  - Feldliste links mit Drag & Drop (DndKit),
  - vereinfachter Vorschau rechts (einspaltige Liste),
  - Properties-Panel für das aktive Feld,
  - Legacy-FormFieldsTable darunter.

- Datenmodell:
  - `FormField.order` (Reihenfolge),
  - `FormField.isActive` (aktiv/inaktiv),
  - `FormField.type`, `FormField.config` etc.

- Drag & Drop:
  - Sortierung der Felder in der linken Spalte,
  - Button „Reihenfolge speichern“ persistierte `order` via PATCH.

Die Vorschau war funktional, aber noch keine **Tablet-Ansicht** mit
getrennten Bereichen für dynamische Felder und Kontakt-/OCR-Block.

---

## 3. Umsetzung

### 3.1 Neue Preview-Komponente: `FormPreviewTabletLayout`

**Datei:**  
`app/(admin)/admin/forms/[id]/FormPreviewTabletLayout.tsx`

Aufgaben & Features:

- Stellt einen **Tablet-Rahmen** dar:
  - Abgerundeter, dunkler Rahmen mit Shadow.
  - Oben „Notch“/Kamerabalken, unten „Home-Indikator“.
  - Innen ein „Screen“ mit hellem Hintergrund.

- Zweispaltiges Layout im Screen:
  - Linke Spalte: **„Dynamische Felder“**.
  - Rechte Spalte: **„Kontakt / OCR-Block“**.

- Props:
  - `fields: TabletPreviewField[]`  
    (abgeleitet aus `FormFieldDTO` über den Workspace),
  - `activeFieldId: string | number | null`,
  - `onFieldClick(fieldId)`  
    → Meldet Klicks (links & rechts) an den Workspace zurück.

- Linke Spalte:
  - Anzeige aller Felder, die **nicht** als Kontaktfeld erkannt werden.
  - Karten mit:
    - Label (oder Key, oder Fallback „Unbenanntes Feld“),
    - Placeholder / Typ,
    - Required-Indikator `*`,
    - optischer „Muted“-State, wenn `isActive === false`.
  - Hinweiszustände:
    - Keine Felder vorhanden → „Für dieses Formular sind noch keine Felder …“.
    - Nur Kontaktfelder erkannt → Hinweis, dass alle erkannten Felder rechts liegen.

- Rechte Spalte:
  - **Kontakt-Slots** in fixer Reihenfolge:
    - Firma / Company
    - Vorname / First Name
    - Nachname / Last Name
    - Telefon / Phone
    - E-Mail
    - Notizen / Comments
  - Pro Slot:
    - Wenn ein Feld zugeordnet:
      - Slot-Label (z. B. „E-Mail“),
      - darunter Feld-Label/Key,
      - Placeholder/Typ,
      - Required-Indikator `*` (falls Pflichtfeld),
      - Click → setzt aktives Feld im Workspace.
    - Wenn kein Feld zugeordnet:
      - Platzhalter-Karte mit Text „Kein entsprechendes Feld im Formular zugeordnet“.

- Hinweise:
  - Wenn zwar Felder existieren, aber keine Kontaktfelder erkannt wurden:
    - Badge „Kein Kontaktfeld erkannt“,
    - Hinweis, welche Keys/Labels sinnvoll wären
      (z. B. „firma“, „vorname“, „nachname“, „email“, „telefon“, „notizen“).

---

### 3.2 Heuristik: Mapping von FormFields auf Kontakt-Slots

In `FormPreviewTabletLayout.tsx`:

- Typen:
  - `ContactSlotId` (`company`, `firstName`, `lastName`, `phone`, `email`, `notes`),
  - `ContactSlotConfig` mit
    - `label` (für UI),
    - `patterns` (Keywords zur Erkennung).

- Funktion `normalizeText(value)`:
  - Trim + lowercase auf `key` und `label`.

- Funktion `findContactSlotForField(field)`:
  - Prüft für jeden `CONTACT_SLOTS`-Eintrag, ob eines der `patterns`
    im normalized `key` oder `label` vorkommt.
  - Erster Treffer entscheidet über den Slot.

- Mapping-Logik:
  - Alle Felder werden durchiteriert:
    - Wenn Slot erkannt und der Slot noch leer ist → Feld diesem Slot zuordnen.
    - Sonst → Feld landet als „normales Feld“ in der linken Spalte.
  - Pro Slot wird **nur das erste passende Feld** verwendet.

Beispiele für Patterns:

- Firma:
  - `firma`, `company`, `unternehmen`, `organisation`, `société` …
- Vorname:
  - `vorname`, `firstname`, `first_name`, `prenom` …
- Nachname:
  - `nachname`, `lastname`, `surname` …
- Telefon:
  - `telefon`, `phone`, `tel`, `mobile`, `handy` …
- E-Mail:
  - `email`, `e-mail`, `mail` …
- Notizen:
  - `notizen`, `notes`, `bemerkungen`, `comments` …

---

### 3.3 Integration im Workspace: `FormBuilderWorkspace`

**Datei:**  
`app/(admin)/admin/forms/[id]/FormBuilderWorkspace.tsx`

Erweiterungen / Anpassungen:

- Weiterhin:
  - Normalisierung & Sortierung der Felder (`normalizeFields`, `sortFields`),
  - Drag & Drop über `@dnd-kit/core` & `@dnd-kit/sortable`,
  - „Reihenfolge speichern“ mit PATCH auf `/api/admin/forms/[formId]/fields/[fieldId]`,
  - Properties-Panel mit:
    - Label, Placeholder, Help-Text,
    - Required, isActive,
    - PATCH auf `/api/admin/forms/[id]/fields/[fieldId]`.

- Neu/angepasst:
  - Rechte Spalte besteht jetzt aus:
    - `Tablet-Vorschau` (FormPreviewTabletLayout),
    - `Feldeigenschaften` (Properties-Panel).
  - Info-Text unter „Tablet-Vorschau“:
    - „Reihenfolge aus der Feldliste wirkt sich auf die dynamischen Felder
       (links) aus, der Kontaktblock (rechts) folgt einer eigenen Logik.“
  - `FormPreviewTabletLayout` wird mit
    - `fields={sortedFields}`,
    - `activeFieldId={activeFieldId}`,
    - `onFieldClick={(id) => setActiveFieldId(id)}`
    angebunden.
  - Selektion ist synchron:
    - Klick in der Feldliste → markiert Feld links + rechts (falls Kontaktfeld),
    - Klick im Kontaktblock → wählt Feld in der Liste, Properties-Panel passt sich an.

---

### 3.4 Page-Komponente: `/admin/forms/[id]`

**Datei:**  
`app/(admin)/admin/forms/[id]/page.tsx`

- Lädt Form + Felder direkt via Prisma:
  - `prisma.form.findUnique({ include: { fields: { orderBy: [{ order }, { id }] }}})`
- Rendert:
  - `<FormBuilderWorkspace initialForm={form} initialFields={fields} />`
  - Darunter: Legacy-`<FormFieldsTable formId={…} fields={…} />`.

---

## 4. Ergebnis / Stand nach Teilprojekt 2.9

- Die Vorschau im Admin-Formbuilder zeigt nun ein **zweispaltiges Tablet-Layout**:
  - Linke Spalte: dynamische Formularfelder (alle nicht als Kontaktfeld erkannten Fields).
  - Rechte Spalte: heuristisch erkannter **Kontakt-/OCR-Block** mit typischen Kontaktfeldern.

- Drag & Drop, Reihenfolgenspeicherung und Properties-Panel arbeiten zusammen mit der neuen Vorschau:
  - `order`-Reihenfolge beeinflusst primär die linke Spalte,
  - Kontaktblock hat eine eigene, logische Reihenfolge,
  - aktive Felder sind zwischen Liste, Tablet-Vorschau und Properties-Panel synchron.

- UX-seitig:
  - Tablet-Frame mit Notch & Home-Indikator,
  - klare Hinweise bei fehlenden Feldern und fehlender Kontaktfeld-Erkennung,
  - konsistente Card-Optik für beide Spalten.

---

## 5. Limitierungen & Ausblick

**Limitierungen:**

- Das Mapping der Kontaktfelder basiert auf einer einfachen Heuristik (String-Matching auf Keys/Labels).
  - Es kann zu Fehl-/Nicht-Erkennungen kommen, wenn Bezeichnungen stark abweichen.
- Die Vorschau ist bewusst nur eine **Annäherung** an das spätere Tablet-/App-Layout (React Native).

**Ausblick / mögliche nächste Schritte:**

- Feinjustierung des Mappings:
  - Konfigurierbare Kontakt-Slots pro Formular,
  - manuelles „Slot zu Feld“-Mapping im Admin.
- 1:1-Angleichung an das tatsächliche Expo-/React-Native-Layout, sobald das App-Design stabil ist.
- Erweiterung des Kontaktblocks um weitere Standardfelder (Adresse, PLZ/Ort, Land etc.).
- Optionale „Sektionen“ oder Steps in der Tablet-Vorschau (z. B. Qualifizierung / Projektinfos / Kontakt).
