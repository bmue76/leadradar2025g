// app/(admin)/admin/forms/[id]/leads/LeadsCsvExportButton.tsx
'use client';

import { useCallback } from 'react';
import type { LeadDTO } from '@/lib/types/forms';

interface LeadsCsvExportButtonProps {
  formId: number;
  leads: LeadDTO[];
}

/**
 * CSV-Wert escapen:
 * - Doppelte Anführungszeichen verdoppeln
 * - Bei Sonderzeichen (Semikolon, Zeilenumbruch, Anführungszeichen) in Quotes einschliessen
 */
function escapeCsvValue(value: unknown): string {
  if (value === null || value === undefined) return '';
  const str = String(value);

  if (
    str.includes('"') ||
    str.includes(';') ||
    str.includes('\n') ||
    str.includes('\r')
  ) {
    return `"${str.replace(/"/g, '""')}"`;
  }

  return str;
}

/**
 * Erzeugt eine CSV aus den Leads:
 * - Basis-Spalten: id, formId, createdAt, source
 * - Dynamische Spalten: alle Keys aus values (Union über alle Leads, alphabetisch sortiert)
 * - Trennzeichen: Semikolon (für Excel/DE-Umgebung angenehmer)
 */
function buildLeadsCsv(leads: LeadDTO[]): string {
  if (!leads || leads.length === 0) {
    return '';
  }

  // Alle Value-Keys einsammeln
  const valueKeySet = new Set<string>();
  for (const lead of leads) {
    const values = (lead.values ?? {}) as Record<string, unknown>;
    for (const key of Object.keys(values)) {
      valueKeySet.add(key);
    }
  }

  const valueKeys = Array.from(valueKeySet).sort((a, b) =>
    a.localeCompare(b, 'de'),
  );

  const headers = ['id', 'formId', 'createdAt', 'source', ...valueKeys];

  const lines: string[] = [];
  // Header
  lines.push(headers.map(escapeCsvValue).join(';'));

  // Datenzeilen
  for (const lead of leads) {
    const values = (lead.values ?? {}) as Record<string, unknown>;

    const row: string[] = [];
    row.push(escapeCsvValue(lead.id));
    row.push(escapeCsvValue(lead.formId));
    row.push(escapeCsvValue(lead.createdAt));
    row.push(escapeCsvValue(lead.source ?? ''));

    for (const key of valueKeys) {
      const raw = values[key];
      if (
        typeof raw === 'string' ||
        typeof raw === 'number' ||
        typeof raw === 'boolean' ||
        raw === null ||
        raw === undefined
      ) {
        row.push(escapeCsvValue(raw ?? ''));
      } else {
        // Fallback für komplexere Strukturen
        try {
          row.push(escapeCsvValue(JSON.stringify(raw)));
        } catch {
          row.push(escapeCsvValue('[Objekt]'));
        }
      }
    }

    lines.push(row.join(';'));
  }

  // Windows-kompatible Zeilenenden
  return lines.join('\r\n');
}

export default function LeadsCsvExportButton({ formId, leads }: LeadsCsvExportButtonProps) {
  const handleExport = useCallback(() => {
    if (!leads || leads.length === 0) {
      return;
    }

    const csv = buildLeadsCsv(leads);
    if (!csv) return;

    const blob = new Blob([csv], {
      type: 'text/csv;charset=utf-8;',
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const hh = String(now.getHours()).padStart(2, '0');
    const min = String(now.getMinutes()).padStart(2, '0');

    const timestamp = `${yyyy}${mm}${dd}-${hh}${min}`;

    link.href = url;
    link.setAttribute('download', `leads-form-${formId}-${timestamp}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
  }, [formId, leads]);

  const disabled = !leads || leads.length === 0;

  return (
    <button
      type="button"
      onClick={handleExport}
      disabled={disabled}
      className={`px-3 py-1 rounded border text-xs ${
        disabled
          ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
          : 'bg-white text-gray-800 hover:bg-gray-50'
      }`}
    >
      CSV exportieren
    </button>
  );
}
