# LeadRadar2025g – Teilprojekt 2.6  
FormDetail & Builder fusionieren (Basis)

## 1. Ziel

Ziel von Teilprojekt **2.6** war es, die bisher getrennten Sichten

- `/admin/forms/[id]` (Form-Detail mit Felder-Tabelle) und  
- `/admin/forms/[id]/builder` (Formbuilder-View aus 2.5)

zu einer **zentralen Workspace-Seite** zusammenzuführen.

Ab diesem Teilprojekt gilt:

- `/admin/forms/[id]` ist der **Formbuilder-Workspace** für ein Formular.
- `/admin/forms/[id]/builder` ist nur noch eine **Legacy-Route**, die sauber auf `/admin/forms/[id]` weiterleitet.

Funktional bleibt alles erhalten (insbesondere die Feld-CRUD-Tabelle), aber die Benutzerführung wird auf einen Ort fokussiert, an dem sich Formular-Meta, Builder und Feldtabelle wiederfinden.

---

## 2. Ausgangslage

Vor 2.6 war die Admin-UI wie folgt strukturiert:

- `/admin/forms` – Formularliste
- `/admin/forms/[id]` – Form-Detail:
  - Meta-Infos (Name, Beschreibung, Status)
  - tabellarische Felder-Ansicht (`FormFieldsTable`) inkl. CRUD & Reihenfolge
- `/admin/forms/[id]/leads` – Leads-Ansicht & CSV-Export
- `/admin/forms/[id]/builder` – neue Builder-View aus 2.5:
  - links: Feldliste + aktives Feld (read-only)
  - rechts: Vorschau

Problem:  
Es gab **drei unterschiedliche Sichten** auf dasselbe Formular. Der Builder lag „eine Ebene tiefer“ als das Form-Detail, obwohl er perspektivisch der wichtigste Arbeitsbereich sein soll.

---

## 3. Umsetzung

### 3.1 Routing: `/builder` → `/[id]` Redirect

- Die Route `/admin/forms/[id]/builder` wurde in eine **reine Redirect-Route** umgebaut.
- Statt einer `page.tsx` existiert nun ein **Route-Handler**:

  - Datei:  
    `app/(admin)/admin/forms/[id]/builder/route.ts`
  - `GET` liest die aktuelle URL (`request.nextUrl.pathname`) aus, extrahiert die ID aus dem Pfadsegment vor `builder` und
    leitet auf `/admin/forms/[id]` weiter.
  - Fallback: Falls keine ID gefunden wird, geht der Redirect auf `/admin/forms`.

Damit ist klar:  
**Canonical Workspace-URL** ist `/admin/forms/[id]`.

---

### 3.2 FormDetail-Seite wird zum Workspace

Die Datei

- `app/(admin)/admin/forms/[id]/page.tsx`

wurde so umgebaut, dass sie jetzt folgende Bereiche enthält:

1. **Header / Workspace-Intro**
   - Label „Formbuilder-Workspace“
   - Formularname als Haupt-Titel
   - Beschreibung, was diese Seite ist (zentraler Workspace)
   - Buttons:
     - „Zur Formularliste“ → `/admin/forms`
     - „Leads anzeigen“ → `/admin/forms/[id]/leads`

2. **Meta-Section**
   - Formular-ID
   - Status (z. B. `draft`) in einem Badge
   - Optional: Beschreibungstext des Formulars

3. **Formbuilder-Section (Fokusbereich)**
   - Abschnitt „Visueller Formbuilder“
   - Hinweistext: Der Builder ist der Fokusbereich, Feldverwaltung (CRUD) läuft in 2.6 noch über die Tabelle.
   - Einbettung der neuen Komponente `FormBuilderWorkspace`.

4. **Legacy-Section: Technische Feldtabelle**
   - Überschrift „Technische Feldtabelle (Legacy)“
   - Erläuterung, dass hier weiterhin CRUD & Reihenfolge passieren.
   - Einbettung von `FormFieldsTable` mit `formId` und den geladenen Feldern aus der DB.

Die Datenbasis kommt aus einem Helper:

- `getFormWithFields(formId: number)`, der `prisma.form.findUnique` mit `include: { fields: { orderBy: { order: 'asc' }}}` nutzt.

Besonderheit Next 15/16:

- `params` ist ein **Promise** und wird in der Page-Funktion mit `const resolvedParams = await params` entpackt.

---

### 3.3 `FormBuilderWorkspace` – Basis-Builder

Die neue Client-Komponente

- `app/(admin)/admin/forms/[id]/FormBuilderWorkspace.tsx`

bildet den **visuellen Builder** ab:

**Props:**

- `formName: string`
- `fields: { id; key; label; type; required; placeholder; helpText }[]` (Lite-Version der FormFields)

**Layout:**

- **Zweispaltig** via Grid:
  - Links: Feldliste + Details zum aktiven Feld
  - Rechts: Formular-Vorschau

**Linke Spalte – Feldliste + aktives Feld:**

- Listet alle Felder als Buttons (`label` oder `key`).
- Aktives Feld wird farblich hervorgehoben.
- Unter der Liste:
  - Read-only Detailansicht des aktiven Feldes (Key, Typ, Placeholder, Hilfetext, „Pflichtfeld“-Badge).
  - Hinweis, dass die Bearbeitung weiterhin in der Tabelle stattfindet (in 2.6 nur Anzeige).

**Rechte Spalte – Vorschau:**

- Überschrift „Formular-Vorschau“ + kleiner Infotext mit Formularnamen.
- Für jedes Feld wird anhand des Typs eine einfache Preview gerendert:
  - `textarea`/`multiline` → `<textarea>` simuliert
  - `checkbox` → Checkbox plus Label
  - alle anderen → `<input>`-Felder (z. B. Text, E-Mail, Nummer, Datum etc.)
- Felder sind in der Preview **disabled**, weil der Builder aktuell nur die UI repräsentiert.

**Leere Zustände:**

- Wenn `fields.length === 0`:
  - Linke Spalte: Text, dass noch keine Felder vorhanden sind und man sie über die Tabelle anlegen soll.
  - Rechte Spalte: Hinweis, dass die Vorschau aktiv wird, sobald Felder existieren.

---

### 3.4 Zusammenspiel mit `FormFieldsTable`

- Die Tabelle `FormFieldsTable` bleibt vollständig erhalten und ist weiterhin verantwortlich für:
  - Anlegen von Feldern
  - Editieren von Feldern
  - Löschen von Feldern
  - Ändern der Reihenfolge (Drag & Drop / Controls aus Teilprojekt 2.2)

- In `page.tsx` wird `FormFieldsTable` mit `formId` und `fields` aufgerufen.

- Aufgrund unterschiedlicher Typdefinitionen (Prisma-Model vs. UI-DTO, z. B. `createdAt: Date` vs. `string`) wird die Übergabe der `fields` bewusst mit `fields as any` gekapselt, um TypeScript-Fehler zu vermeiden.  
  → Das ist ein kontrollierter Kompromiss für 2.6 und kann in späteren Teilprojekten über ein sauberes DTO gelöst werden.

---

## 4. UX-Verhalten

- **Mit Feldern:**
  - Nutzer sieht sofort den Formularnamen, Meta-Infos, den Builder mit Feldliste & Vorschau und die Felder-Tabelle darunter.
  - Klick auf ein Feld in der Feldliste wechselt das „aktive Feld“ und aktualisiert die Details in der linken Spalte.

- **Ohne Felder:**
  - Builder zeigt klare Hinweise, dass noch keine Felder konfiguriert sind.
  - Nutzer wird darauf hingewiesen, die Feldtabelle zu verwenden, um Felder anzulegen.

- **Navigation:**
  - `/admin/forms` → Formular auswählen → `/admin/forms/[id]`
  - Legacy-Links oder direkte Aufrufe von `/admin/forms/[id]/builder` führen per Redirect auf `/admin/forms/[id]`.
  - Von dort führt ein Button zu `/admin/forms/[id]/leads`.

Der Fokus liegt klar auf dem **Formbuilder-Bereich**, die Tabelle ist bewusst als „Technik-/Legacy-Bereich“ gekennzeichnet.

---

## 5. Technische Besonderheiten

- **Next.js 15/16 – `params` als Promise**
  - Page-Komponenten-Typ für `params`:
    ```ts
    interface FormDetailPageProps {
      params: Promise<{ id: string }>;
    }
    ```
  - Entpacken in der Komponente:
    ```ts
    const resolvedParams = await params;
    const formId = Number(resolvedParams.id);
    ```

- **Redirect-Route `route.ts`**
  - Nutzt `NextRequest` und `NextResponse.redirect`.
  - Extrahiert die ID aus `pathname.split('/')` und nimmt das Segment vor `builder` als Formular-ID.

- **TypeScript-Interoperabilität**
  - Unterschiedliche Typen zwischen Prisma-Modell und UI-Props werden an der Übergabestelle zu `FormFieldsTable` via `fields as any` gebrückt.
  - Diese Stelle kann in einem späteren Refactoring durch ein gemeinsames DTO ersetzt werden.

---

## 6. Offene Punkte & Nächste Schritte

Teilprojekt 2.6 ist die **Basis-Fusion** von FormDetail & Builder. Geplante Erweiterungen für 2.7 ff.:

1. **Template-basierter Builder (Tablet-Layout als Standardvorlage)**
   - 1:1-Abbild des Tablet-Formulars (z. B. Atlex-Layout von 2017) mit linkem „Meta“-Block und rechtem „Kontakt/OCR“-Block.
   - Einführung von Layout-/Zonen-Informationen (`zone: "left" | "right"` o. ä.).

2. **Properties-Panel im Builder**
   - Klick auf ein Feld in der Preview öffnet ein Bearbeitungs-Panel:
     - Feldtyp
     - Label / Placeholder / Hilfetext
     - Pflichtfeld-Flag
   - Änderungen werden direkt ins Backend geschrieben.

3. **Drag & Drop direkt im Layout**
   - Felder im linken / rechten Block per Drag & Drop verschieben.
   - Reihenfolge wird als `order` im Backend gespeichert.

4. **Mehrere Standardvorlagen**
   - Auswahl eines Basislayouts bei der Formularerstellung.
   - Templates als Startpunkt, die Kunden an ihre Bedürfnisse anpassen können.

Bis dahin ist `/admin/forms/[id]` der zentrale, stabile Workspace mit sichtbarer Trennung zwischen **visuellem Builder** und **technischer Feldverwaltung**.
