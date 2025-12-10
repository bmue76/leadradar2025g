// app/api/admin/leads/route.ts
import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
// ⬇️ WICHTIG: diesen Import ggf. an andere Routen anpassen
// Falls du z. B. in /app/api/admin/events/route.ts einen anderen Pfad nutzt,
// bitte den gleichen Pfad verwenden.
import { prisma } from "@/lib/prisma";
import { requireAuthContext } from "@/lib/auth-context";

type LeadListItemDTO = {
  id: string;
  createdAt: string;
  eventId: number | null;
  eventName: string | null;
  formId: number | null;
  formName: string | null;
  source: string | null;
  name: string | null;
  company: string | null;
  email: string | null;
  valuesPreview: string;
};

type LeadsResponseDTO = {
  items: LeadListItemDTO[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

// Prisma-Hilfstyp für das Resultat mit Relations
type LeadWithRelations = Prisma.LeadGetPayload<{
  include: { event: true; form: true };
}>;

function parseIntSafe(value: string | null, fallback: number): number {
  const n = value ? parseInt(value, 10) : NaN;
  return Number.isNaN(n) || n <= 0 ? fallback : n;
}

function parseOptionalInt(value: string | null): number | null {
  if (!value) return null;
  const n = parseInt(value, 10);
  return Number.isNaN(n) ? null : n;
}

function parseOptionalDate(value: string | null): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function extractStringFromValues(
  values: unknown,
  possibleKeys: string[]
): string | null {
  if (!values || typeof values !== "object") return null;
  const obj = values as Record<string, unknown>;
  for (const key of possibleKeys) {
    const foundKey = Object.keys(obj).find(
      (k) => k.toLowerCase() === key.toLowerCase()
    );
    if (foundKey && typeof obj[foundKey] === "string") {
      const v = (obj[foundKey] as string).trim();
      if (v) return v;
    }
  }
  return null;
}

function buildValuesPreview(values: unknown, maxPairs = 4): string {
  if (!values || typeof values !== "object") return "";
  const obj = values as Record<string, unknown>;
  const entries = Object.entries(obj)
    .filter(([_, v]) => v != null && v !== "")
    .slice(0, maxPairs)
    .map(([k, v]) => `${k}: ${String(v)}`);
  return entries.join(" | ");
}

export async function GET(
  req: NextRequest
): Promise<NextResponse<LeadsResponseDTO | { error: string }>> {
  try {
    const auth = await requireAuthContext(req);

    // 🔐 Tenant sauber aus dem AuthContext holen – robust gegen unterschiedliche Shapes
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const anyAuth = auth as any;
    const rawTenantId = anyAuth.tenantId ?? anyAuth.tenant?.id;

    if (!rawTenantId) {
      console.error("AuthContext has no tenantId or tenant.id", auth);
      return NextResponse.json(
        { error: "Tenant context missing" },
        { status: 500 }
      );
    }

    const tenantId: number = Number(rawTenantId);

    const url = new URL(req.url);
    const searchParams = url.searchParams;

    const page = parseIntSafe(searchParams.get("page"), 1);
    let limit = parseIntSafe(searchParams.get("limit"), 25);
    if (limit > 200) limit = 200;

    const eventId = parseOptionalInt(searchParams.get("eventId"));
    const formId = parseOptionalInt(searchParams.get("formId"));
    const fromDate = parseOptionalDate(searchParams.get("from"));
    const toDate = parseOptionalDate(searchParams.get("to"));

    const where: any = {
      tenantId,
    };

    if (eventId !== null) {
      where.eventId = eventId;
    }

    if (formId !== null) {
      where.formId = formId;
    }

    if (fromDate || toDate) {
      where.createdAt = {};
      if (fromDate) {
        where.createdAt.gte = fromDate;
      }
      if (toDate) {
        // To inklusiv machen: +1 Tag und < nextDay
        const nextDay = new Date(toDate);
        nextDay.setDate(nextDay.getDate() + 1);
        where.createdAt.lt = nextDay;
      }
    }

    const skip = (page - 1) * limit;

    const leads: LeadWithRelations[] = await prisma.lead.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      include: {
        event: true,
        form: true,
      },
    });

    const total = await prisma.lead.count({ where });
    const totalPages = total === 0 ? 1 : Math.ceil(total / limit);

    const items: LeadListItemDTO[] = leads.map((lead) => {
      const values = lead.values as unknown;

      const name =
        extractStringFromValues(values, [
          "name",
          "fullName",
          "vornameNachname",
          "kontaktName",
          "vorname",
          "nachname",
        ]) ?? null;

      const company =
        extractStringFromValues(values, [
          "company",
          "firma",
          "unternehmen",
          "firmenname",
        ]) ?? null;

      const email =
        extractStringFromValues(values, [
          "email",
          "e-mail",
          "mail",
        ]) ?? null;

      const valuesPreview = buildValuesPreview(values);

      return {
        id: String(lead.id),
        createdAt: lead.createdAt.toISOString(),
        eventId: lead.eventId ?? null,
        eventName: lead.event ? lead.event.name : null,
        formId: lead.formId ?? null,
        formName: lead.form ? lead.form.name : null,
        // falls du im Prisma-Schema ein Feld "source" hast, wird es hier mitgenommen,
        // sonst bleibt es einfach null.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        source: (lead as any).source ?? null,
        name,
        company,
        email,
        valuesPreview,
      };
    });

    const response: LeadsResponseDTO = {
      items,
      page,
      limit,
      total,
      totalPages,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Failed to load admin leads", error);
    return NextResponse.json(
      { error: "Failed to load leads" },
      { status: 500 }
    );
  }
}
