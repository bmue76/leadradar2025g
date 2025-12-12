# Teilprojekt 2.17 – Admin-Formbuilder: Kontakt/OCR Slot-Mapping (konfigurierbar)

## Ziel
Der Kontaktblock in der Tablet-Vorschau soll nicht mehr heuristisch “erraten”, welche Formularfelder Firma/Vorname/E-Mail etc. füllen, sondern pro Formular **konfigurierbar** sein.

- Slots: `company`, `firstName`, `lastName`, `phone`, `email`, `notes` (erweiterbar)
- Admin kann pro Slot wählen: **welches Feld füllt diesen Slot**
- Slots können **deaktiviert** werden
- Vorschau rendert Kontaktblock anhand Mapping
- **Keine Breaking Changes**: wenn Mapping leer/teilweise fehlt → Fallback auf Heuristik

## Scope / Deliverables
### Datenmodell
- Prisma: `Form.config` (Json?) ergänzt
- `config.contactSlots` speichert Slot → `FormField.id` oder `null`

### API
- `GET /api/admin/forms/[id]` liefert `form` inkl. `config`
- `PATCH /api/admin/forms/[id]` akzeptiert `config` (object oder null)
- `config.contactSlots` wird validiert und gespeichert
- Merge-Strategie:
  - `config` wird shallow gemerged
  - `config.contactSlots` wird “deep-ish” gemerged, um partielle Updates zu erlauben
  - `contactSlots: null` entfernt contactSlots komplett (Reset auf Heuristik)

### Admin UI
- Inspector Tabs: **Feld** | **Kontaktblock**
- Kontaktblock-Tab:
  - Toggle “Slot aktiv”
  - Dropdown “Auto (Heuristik)” oder konkretes Feld (#id – label (key))
  - Dirty Tracking + Save Button
  - Sofortige Vorschau-Aktualisierung

### Preview
- Kontaktblock rendert Slots anhand `contactSlots`
- Auflösung pro Slot:
  - **DISABLED**: Slot = `null` → Slot wird nicht gerendert
  - **MAPPED**: Slot = fieldId → Slot zeigt “↳ Feldlabel”
  - **AUTO**: Slot undefined → Slot nutzt Heuristik
  - **PLACEHOLDER**: kein Treffer → Slot zeigt Placeholder

## Contract
### Form.config
```ts
type ContactSlotKey = "company" | "firstName" | "lastName" | "phone" | "email" | "notes";
type ContactSlotsConfig = Partial<Record<ContactSlotKey, number | null>>;

interface FormConfig {
  contactSlots?: ContactSlotsConfig;
}
