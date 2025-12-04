// backend/lib/export.ts
import type { Form, FormField, Lead } from '@prisma/client';

const CSV_SEPARATOR = ';';
const BOM = '\uFEFF';

function escapeCsv(value: unknown): string {
  if (value === null || value === undefined) {
    return '""';
  }

  const str = String(value);
  const escaped = str.replace(/"/g, '""');
  return `"${escaped}"`;
}

function toCsvRow(columns: unknown[]): string {
  return columns.map(escapeCsv).join(CSV_SEPARATOR);
}

/**
 * Baut eine CSV-Datei für Leads eines Formulars.
 *
 * - Meta-Spalten:
 *   leadId, formId, formName, createdAt, source, createdByUserId
 * - Dynamische Spalten:
 *   Alle FormFields in definierter Reihenfolge (label [key])
 *   plus zusätzliche Keys aus Lead.values, die nicht mehr als Felder existieren.
 *
 * - Separator: Semikolon (;)
 * - Encoding: UTF-8 mit BOM
 * - Zeilenende: CRLF (\r\n)
 */
export function buildLeadsCsv(options: {
  form: Form;
  fields: FormField[];
  leads: Lead[];
}): string {
  const { form, fields, leads } = options;

  // Felder sortieren (order, dann id als Fallback)
  const sortedFields = [...fields].sort((a, b) => {
    if (a.order === b.order) {
      return a.id - b.id;
    }
    return a.order - b.order;
  });

  const fieldKeys = sortedFields.map((f) => f.key);

  const fieldHeaderMap = new Map<string, string>();
  for (const f of sortedFields) {
    const label = f.label?.trim();
    const headerLabel = label ? `${label} [${f.key}]` : f.key;
    fieldHeaderMap.set(f.key, headerLabel);
  }

  // Zusätzliche Keys aus Lead.values, die nicht (mehr) als FormField existieren
  const extraKeys = new Set<string>();

  for (const lead of leads) {
    const values = lead.values as unknown;

    if (
      values &&
      typeof values === 'object' &&
      !Array.isArray(values)
    ) {
      for (const key of Object.keys(values as Record<string, unknown>)) {
        if (!fieldHeaderMap.has(key)) {
          extraKeys.add(key);
        }
      }
    }
  }

  const extraKeyList = Array.from(extraKeys).sort();

  // Header-Zeile: Meta-Spalten
  const header: string[] = [
    'leadId',
    'formId',
    'formName',
    'createdAt',
    'source',
    'createdByUserId',
  ];

  // Header-Zeile: dynamische Felder (FormFields)
  for (const key of fieldKeys) {
    header.push(fieldHeaderMap.get(key) ?? key);
  }

  // Header-Zeile: zusätzliche Keys aus Lead.values
  for (const key of extraKeyList) {
    header.push(key);
  }

  const lines: string[] = [];
  lines.push(toCsvRow(header));

  // Helper zur Auflösung von Werten aus Lead.values
  const resolveValue = (valuesObj: Record<string, unknown>, key: string): unknown => {
    const raw = valuesObj[key];

    if (raw === null || raw === undefined) {
      return '';
    }

    if (Array.isArray(raw)) {
      return raw.join(', ');
    }

    if (typeof raw === 'object') {
      try {
        return JSON.stringify(raw);
      } catch {
        return String(raw);
      }
    }

    return raw;
  };

  // Datenzeilen
  for (const lead of leads) {
    const values = lead.values as unknown;
    const valuesObj =
      values &&
      typeof values === 'object' &&
      !Array.isArray(values)
        ? (values as Record<string, unknown>)
        : {};

    const row: unknown[] = [
      lead.id,
      lead.formId,
      form.name ?? '',
      lead.createdAt.toISOString(),
      lead.source ?? '',
      lead.createdByUserId ?? '',
    ];

    for (const key of fieldKeys) {
      row.push(resolveValue(valuesObj, key));
    }

    for (const key of extraKeyList) {
      row.push(resolveValue(valuesObj, key));
    }

    lines.push(toCsvRow(row));
  }

  const csvBody = lines.join('\r\n') + '\r\n';
  return BOM + csvBody;
}
