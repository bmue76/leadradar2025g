import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuthContext } from "@/lib/auth";
import { buildLeadsCsv } from "@/lib/export";

type LeadDTO = {
  id: number;
  createdAt: string;
  source: string | null;
  formId: number | null;
  eventId: number | null;
  values: Record<string, unknown>;
};

const MAX_EXPORT_ROWS = 50000;

function mapLeadToDTO(lead: any): LeadDTO {
  return {
    id: lead.id,
    createdAt: lead.createdAt.toISOString(),
    source: lead.source ?? null,
    formId: lead.formId ?? null,
    eventId: lead.eventId ?? null,
    values: lead.values ?? {},
  };
}

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuthContext(req);
  const tenantId = auth.tenant.id;

  const { id } = await context.params;
  const eventId = Number(id);

  if (!eventId || Number.isNaN(eventId)) {
    return NextResponse.json(
      { error: "Invalid event id" },
      { status: 400 }
    );
  }

  const url = new URL(req.url);
  const searchParams = url.searchParams;

  const format = (searchParams.get("format") ?? "json").toLowerCase();

  // ----------------------------------------
  // CSV-Export-Branch: ?format=csv
  // ----------------------------------------
  if (format === "csv") {
    const fromParam = searchParams.get("from");
    const toParam = searchParams.get("to");

    let fromDate: Date | undefined;
    let toDate: Date | undefined;

    if (fromParam) {
      const d = new Date(fromParam);
      if (Number.isNaN(d.getTime())) {
        return NextResponse.json(
          {
            error: 'Parameter "from" ist kein gültiges Datum.',
            code: "INVALID_DATE_RANGE",
          },
          { status: 400 }
        );
      }
      fromDate = d;
    }

    if (toParam) {
      const d = new Date(toParam);
      if (Number.isNaN(d.getTime())) {
        return NextResponse.json(
          {
            error: 'Parameter "to" ist kein gültiges Datum.',
            code: "INVALID_DATE_RANGE",
          },
          { status: 400 }
        );
      }
      toDate = d;
    }

    if (fromDate && toDate && fromDate > toDate) {
      return NextResponse.json(
        {
          error: '"from" darf nicht nach "to" liegen.',
          code: "INVALID_DATE_RANGE",
        },
        { status: 400 }
      );
    }

    // Event inkl. Formular-Verknüpfungen im Tenant-Scope laden
    const event = await prisma.event.findFirst({
      where: {
        id: eventId,
        tenantId,
      },
      include: {
        eventForms: {
          include: {
            form: {
              include: {
                fields: true,
              },
            },
          },
        },
      },
    });

    if (!event) {
      return NextResponse.json(
        {
          error: "Event wurde nicht gefunden.",
          code: "EVENT_NOT_FOUND",
        },
        { status: 404 }
      );
    }

    if (!event.eventForms || event.eventForms.length === 0) {
      return NextResponse.json(
        {
          error:
            "Dem Event sind keine Formulare zugeordnet. Es gibt nichts zu exportieren.",
          code: "EVENT_HAS_NO_FORMS",
        },
        { status: 400 }
      );
    }

    // Primäres Formular ermitteln (oder Fallback auf erstes Formular)
    const primaryEventForm =
      event.eventForms.find((ef) => ef.isPrimary) ?? event.eventForms[0];

    const form = primaryEventForm.form;
    if (!form) {
      return NextResponse.json(
        {
          error:
            "Das primäre Formular für dieses Event konnte nicht geladen werden.",
          code: "PRIMARY_FORM_NOT_FOUND",
        },
        { status: 400 }
      );
    }

    const where = {
      eventId: event.id,
      formId: form.id,
      tenantId,
      ...(fromDate || toDate
        ? {
            createdAt: {
              ...(fromDate ? { gte: fromDate } : {}),
              ...(toDate ? { lte: toDate } : {}),
            },
          }
        : {}),
    };

    const totalLeads = await prisma.lead.count({ where });

    if (totalLeads === 0) {
      return NextResponse.json(
        {
          error:
            "Für dieses Event und das zugehörige Formular wurden keine Leads gefunden.",
          code: "NO_LEADS_FOR_EVENT",
        },
        { status: 400 }
      );
    }

    if (totalLeads > MAX_EXPORT_ROWS) {
      return NextResponse.json(
        {
          error:
            "Der Export ist zu groß. Bitte Zeitraum einschränken.",
          code: "EXPORT_TOO_LARGE",
          details: {
            maxRows: MAX_EXPORT_ROWS,
            actualRows: totalLeads,
          },
        },
        { status: 413 }
      );
    }

    const leads = await prisma.lead.findMany({
      where,
      orderBy: {
        createdAt: "asc",
      },
    });

    const csv = buildLeadsCsv({
      form,
      fields: form.fields,
      leads,
    });

    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, "0");

    const fileName = `leads-event-${eventId}-${now.getUTCFullYear()}${pad(
      now.getUTCMonth() + 1
    )}${pad(now.getUTCDate())}-${pad(now.getUTCHours())}${pad(
      now.getUTCMinutes()
    )}.csv`;

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${fileName}"`,
      },
    });
  }

  // ----------------------------------------
  // Standard-JSON-Branch (Admin-UI)
  // ----------------------------------------

  const pageParam = searchParams.get("page") ?? "1";
  const limitParam = searchParams.get("limit") ?? "25";

  const page = Math.max(parseInt(pageParam, 10) || 1, 1);
  const limit = Math.min(
    Math.max(parseInt(limitParam, 10) || 25, 1),
    200
  );

  const skip = (page - 1) * limit;

  // Prüfen, ob Event zum Tenant gehört
  const event = await prisma.event.findFirst({
    where: {
      id: eventId,
      tenantId,
    },
  });

  if (!event) {
    return NextResponse.json(
      { error: "Event not found" },
      { status: 404 }
    );
  }

  const where = {
    tenantId,
    eventId,
  };

  const [total, leads] = await Promise.all([
    prisma.lead.count({ where }),
    prisma.lead.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
  ]);

  const totalPages = Math.max(Math.ceil(total / limit), 1);
  const items = leads.map(mapLeadToDTO);

  return NextResponse.json({
    items,
    page,
    limit,
    total,
    totalPages,
  });
}
