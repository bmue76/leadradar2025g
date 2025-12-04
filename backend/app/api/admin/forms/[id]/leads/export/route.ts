// backend/app/api/admin/forms/[id]/leads/export/route.ts
import { NextRequest } from 'next/server';
import type { Prisma } from '@prisma/client';

import { prisma } from '@/lib/prisma';
import { requireAuthContext } from '@/lib/auth';
import { buildLeadsCsv } from '@/lib/export';

const MAX_EXPORT_ROWS = 50000;

function jsonError(
  status: number,
  code: string,
  message: string,
  details?: unknown,
): Response {
  return new Response(
    JSON.stringify({ error: message, code, details }),
    {
      status,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
      },
    },
  );
}

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  try {
    const auth = await requireAuthContext(req);

    // params ist ein Promise → erst awaiten
    const { id } = await context.params;

    const formId = Number(id);
    if (!Number.isInteger(formId) || formId <= 0) {
      return jsonError(400, 'INVALID_FORM_ID', 'Ungültige Formular-ID.');
    }

    const url = new URL(req.url);
    const searchParams = url.searchParams;

    const format = (searchParams.get('format') ?? 'csv').toLowerCase();
    if (format !== 'csv') {
      return jsonError(
        400,
        'UNSUPPORTED_EXPORT_FORMAT',
        'Nur CSV-Export wird unterstützt.',
        { supportedFormats: ['csv'] },
      );
    }

    const fromParam = searchParams.get('from');
    const toParam = searchParams.get('to');

    let fromDate: Date | undefined;
    let toDate: Date | undefined;

    if (fromParam) {
      const d = new Date(fromParam);
      if (Number.isNaN(d.getTime())) {
        return jsonError(
          400,
          'INVALID_DATE_RANGE',
          'Parameter "from" ist kein gültiges Datum.',
        );
      }
      fromDate = d;
    }

    if (toParam) {
      const d = new Date(toParam);
      if (Number.isNaN(d.getTime())) {
        return jsonError(
          400,
          'INVALID_DATE_RANGE',
          'Parameter "to" ist kein gültiges Datum.',
        );
      }
      toDate = d;
    }

    if (fromDate && toDate && fromDate > toDate) {
      return jsonError(
        400,
        'INVALID_DATE_RANGE',
        '"from" darf nicht nach "to" liegen.',
      );
    }

    // Formular inkl. Feldern im Tenant-Scope laden
    const form = await prisma.form.findFirst({
      where: {
        id: formId,
        tenantId: auth.tenant.id,
      },
      include: {
        fields: true,
      },
    });

    if (!form) {
      return jsonError(
        404,
        'FORM_NOT_FOUND',
        'Formular wurde nicht gefunden.',
      );
    }

    // Leads-Filter aufbauen
    const where: Prisma.LeadWhereInput = {
      formId: form.id,
      tenantId: auth.tenant.id,
    };

    if (fromDate || toDate) {
      where.createdAt = {
        ...(fromDate ? { gte: fromDate } : {}),
        ...(toDate ? { lte: toDate } : {}),
      };
    }

    // Größe prüfen
    const totalLeads = await prisma.lead.count({ where });

    if (totalLeads > MAX_EXPORT_ROWS) {
      return jsonError(
        413,
        'EXPORT_TOO_LARGE',
        'Der Export ist zu groß. Bitte Zeitraum oder Formular eingrenzen.',
        {
          maxRows: MAX_EXPORT_ROWS,
          actualRows: totalLeads,
        },
      );
    }

    // Leads laden
    const leads = await prisma.lead.findMany({
      where,
      orderBy: {
        createdAt: 'asc',
      },
    });

    // CSV bauen
    const csv = buildLeadsCsv({
      form,
      fields: form.fields,
      leads,
    });

    // Dateiname: leads-form-<id>-YYYYMMDD-HHMM.csv (UTC)
    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');

    const fileName = `leads-form-${formId}-${now.getUTCFullYear()}${pad(
      now.getUTCMonth() + 1,
    )}${pad(now.getUTCDate())}-${pad(now.getUTCHours())}${pad(
      now.getUTCMinutes(),
    )}.csv`;

    return new Response(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${fileName}"`,
      },
    });
  } catch (err) {
    console.error('Error in /api/admin/forms/[id]/leads/export', err);
    return jsonError(
      500,
      'UNEXPECTED_ERROR',
      'Beim Export ist ein unerwarteter Fehler aufgetreten.',
    );
  }
}
