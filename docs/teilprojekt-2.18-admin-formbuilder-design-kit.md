cd /c/dev/leadradar2025g

cat <<'EOF' > docs/teilprojekt-2.18-admin-formbuilder-design-kit.md
# Teilprojekt 2.18 – Admin-Formbuilder – Design Kit (Theme/Branding)

## Ziel
Im Admin-Formbuilder soll pro Formular ein simples Design Kit gepflegt werden können:
- Farben (Background, Surface, Primary, Text, Muted, Border)
- Schrift (nur Name, noch kein echtes Font-Loading)
- Logo-URL (später Upload/Media-Library)

Das Design soll:
- **im Tablet-Preview sofort sichtbar** sein (Live Preview)
- **pro Formular gespeichert** werden (Form.config.theme)
- **auf Default zurücksetzbar** sein
- **clearen** können (theme: null), wenn Default gesetzt ist

## Umsetzung

### Block 1 – Theme Contract & Defaults ✅
- Neues Theme-Objekt über `Form.config.theme`
- `DEFAULT_FORM_THEME` als robuste Defaults
- Normalisierung via `normalizeTheme()` (Fallbacks + sichere Werte)

### Block 2 – Validation ✅
- `formConfigSchema` erweitert: `theme` erlaubt `object | null`
- Hex-Farbvalidation (#rgb, #rrggbb, #rrggbbaa)
- Wichtig: `logoUrl` und `fontFamily` dürfen leer sein (z. B. Logo entfernen)

### Block 3 – Preview ✅
- Tablet-Preview nimmt `theme` als Prop entgegen
- `normalizeTheme()` in Preview angewendet
- Styling dynamisch via Theme-Werten (Border, Background, Primary etc.)
- Kontaktblock & Feldliste reagieren sichtbar auf Primary/Border/Muted usw.

### Block 4 – Admin-UI Design Tab ✅
- Neuer Inspector-Tab **„Design“**
- Color Picker + Hex-Input + Default-Button je Farbe
- FontFamily Dropdown (Name wird gespeichert)
- Logo URL Input + Entfernen-Button + Mini-Preview
- Buttons:
  - **Zurücksetzen** (auf Default)
  - **Design speichern** (persistiert in `config.theme`)
- Logik: Wenn Theme exakt Default => PATCH speichert `theme: null` (cleart)

## Tests (manuell)
- Farben im Design Tab ändern => Preview ändert sofort ✅
- „Design speichern“ => Reload, Werte bleiben ✅
- Default setzen + speichern => `theme` wird gecleart (`theme:null`) ✅
- Logo URL entfernen (leer) + speichern ✅

## Betroffene Files
- `backend/lib/validation/forms.ts`
- `backend/lib/formTheme.ts`
- `backend/app/(admin)/admin/forms/[id]/FormPreviewTabletLayout.tsx`
- `backend/app/(admin)/admin/forms/[id]/FormBuilderWorkspace.tsx`
- `docs/PROJECT_OVERVIEW.md`
- `docs/teilprojekt-2.18-admin-formbuilder-design-kit.md`

EOF
