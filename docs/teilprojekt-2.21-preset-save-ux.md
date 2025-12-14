# Teilprojekt 2.21 – Admin – Preset-Erstellung UX verbessern (Quick Win)

## Ziel
Preset-Workflow im Formbuilder so verbessern, dass er ohne Vorwissen sofort gefunden wird:
- „Als Vorlage speichern“ ist im Formbuilder prominent sichtbar (Topbar).
- Nach erfolgreichem Speichern klares Feedback (Toast).
- Toast enthält Direktlink zur Vorlagen-Library (`/admin/presets`) und optional „Preset öffnen“ (`/admin/presets/[id]`).
- UX-Hinweis im UI: „Vorlagen findest du unter /admin/presets“.

## Ausgangslage
- Preset API & UI existieren (2.20–2.23).
- Formbuilder Workspace existiert (`/admin/forms/[id]`) inkl. Header/Actions.
- Preset-Save Flow existiert bereits (Modal + POST `/api/admin/form-presets`).

## Umsetzung

### Block 1 – UI: Topbar Action
- CTA als prominenter Split-Button im Formbuilder-Header:
  - Primär: „Als Vorlage speichern“ → öffnet Save-Modal
  - Dropdown: „Als Vorlage speichern“ / „Zur Vorlagen-Library“

### Block 2 – Feedback (Toast/Notice)
- Nach erfolgreichem Speichern:
  - Toast „Vorlage gespeichert.“
  - Aktionen:
    - „Zur Vorlagen-Library“
    - optional „Preset öffnen“ (wenn Preset-ID vorhanden)
- Persistenz:
  - sessionStorage (`leadradar:presetSavedToast:v1`) für robustes Feedback auch bei Refresh/Redirect-Szenarien
  - Max-Age: 5 Minuten

### Block 3 – Small Copy & Guidance
- Always-visible Hint im Formbuilder-Header:
  - „Vorlagen findest du unter /admin/presets“ (Link)
- Zusätzlich im Save-Modal wiederholt (Link)

## Technische Details
- Datei angepasst:
  - `backend/app/(admin)/admin/forms/[id]/FormBuilderWorkspace.tsx`
- Änderungen:
  - Split-Button Dropdown + Outside-Click/Escape Close
  - Toast als fixed Bottom-Right UI, inkl. Links
  - sessionStorage Read/Write/Clear für Toast-Persistenz
  - Guidance Links im Header + Modal

## Testanweisung
1. `/admin/forms/[id]` öffnen
2. Sichtbarkeit:
   - Button „Als Vorlage speichern“ ohne Scroll sichtbar
   - Hint „Vorlagen findest du unter /admin/presets“ sichtbar
3. Save:
   - „Als Vorlage speichern“ → Modal öffnen → Speichern
   - Toast erscheint, enthält „Zur Vorlagen-Library“
   - Wenn Preset-ID zurückkommt: Link „Preset öffnen“ sichtbar
4. Optional:
   - Seite refreshen: Toast bleibt kurz sichtbar (sessionStorage), verschwindet nach Auto-Timeout

## Akzeptanzkriterien
- CTA ist im Formbuilder sofort sichtbar.
- Nach Save: Bestätigung + Link zur Library.
- Keine kaputten Routen / keine Lint-Warnungen.
