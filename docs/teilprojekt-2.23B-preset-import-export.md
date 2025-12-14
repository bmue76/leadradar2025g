# Teilprojekt 2.23B – Admin: Preset Import/Export (JSON)

## Ziel
Presets zwischen Instanzen/Tenants portieren können:

1) **Export**
- Preset als JSON herunterladen (Meta + Current Snapshot)
- Optional: inkl. Revision-History

2) **Import**
- JSON hochladen
- Robust validieren (Zod)
- Immer **neues Preset** im aktuellen Tenant anlegen (tenant-safe, IDs neu)
- Optional: History importieren (wenn enthalten)

---

## Ausgangslage
- Preset Library existiert (`/admin/presets`, `/admin/presets/[id]`)
- Snapshot-Format etabliert (Preset enthält `snapshot` + `snapshotVersion`)
- Revisions existieren (`FormPresetRevision`)
- Admin Auth: `x-user-id` (dev)

---

## Contract: PresetExportV1 (stabil + versioniert)

```ts
type PresetExportV1 = {
  format: "leadradar-form-preset";
  formatVersion: 1;
  exportedAt: string; // ISO datetime
  preset: {
    name: string;
    category?: string;
    description?: string;
    snapshotVersion: number;
    snapshot: unknown;
  };
  revisions?: Array<{
    version: number;
    snapshot: unknown;
    createdAt?: string; // optional (Info)
  }>;
};
