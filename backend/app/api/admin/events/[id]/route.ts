// backend/app/api/admin/events/[id]/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuthContext } from '@/lib/auth';
import {
  toEventWithFormsDTO,
  EventStatusDTO,
} from '@/lib/types/events';

type UpdateEventBody = {
  name?: string;
  slug?: string;
  description?: string | null;
  startDate?: string; // ISO-String
  endDate?: string | null;
  location?: string | null;
  status?: EventStatusDTO | string;
};

function normalizeSlug(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9\-]/g, '');
}

// Lokaler Any-Cast, um TS-Probleme mit nicht synchronisierten Prisma-Typen zu umgehen.
const prismaAny = prisma as any;

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { tenant } = await requireAuthContext(req);

    const eventId = Number(params.id);
    if (!Number.isFinite(eventId)) {
      return NextResponse.json(
        { error: 'Invalid event id.' },
        { status: 400 }
      );
    }

    const event = await prismaAny.event.findFirst({
      where: {
        id: eventId,
        tenantId: tenant.id,
      },
      include: {
        eventForms: {
          include: {
            form: true,
          },
        },
      },
    });

    if (!event) {
      return NextResponse.json(
        { error: 'Event not found.' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      event: toEventWithFormsDTO(event),
    });
  } catch (error) {
    console.error('[GET /api/admin/events/[id]] Error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error.',
      },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { tenant } = await requireAuthContext(req);

    const eventId = Number(params.id);
    if (!Number.isFinite(eventId)) {
      return NextResponse.json(
        { error: 'Invalid event id.' },
        { status: 400 }
      );
    }

    // Sicherstellen, dass das Event zum Tenant gehört
    const existing = await prismaAny.event.findFirst({
      where: {
        id: eventId,
        tenantId: tenant.id,
      },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Event not found.' },
        { status: 404 }
      );
    }

    let body: UpdateEventBody;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON body.' },
        { status: 400 }
      );
    }

    const data: any = {};

    if (typeof body.name === 'string') {
      data.name = body.name;
    }

    if (typeof body.slug === 'string') {
      data.slug = normalizeSlug(body.slug);
    }

    if ('description' in body) {
      data.description = body.description ?? null;
    }

    if (typeof body.startDate === 'string') {
      const startDateObj = new Date(body.startDate);
      if (Number.isNaN(startDateObj.getTime())) {
        return NextResponse.json(
          { error: 'Invalid startDate. Must be a valid ISO date string.' },
          { status: 400 }
        );
      }
      data.startDate = startDateObj;
    }

    if ('endDate' in body) {
      if (body.endDate === null) {
        data.endDate = null;
      } else if (typeof body.endDate === 'string') {
        const endDateObj = new Date(body.endDate);
        if (Number.isNaN(endDateObj.getTime())) {
          return NextResponse.json(
            { error: 'Invalid endDate. Must be a valid ISO date string.' },
            { status: 400 }
          );
        }
        data.endDate = endDateObj;
      }
    }

    if ('location' in body) {
      data.location = body.location ?? null;
    }

    if (body.status && typeof body.status === 'string') {
      const upper = body.status.toUpperCase() as EventStatusDTO;
      if (['PLANNED', 'ACTIVE', 'FINISHED'].includes(upper)) {
        // Prisma-Enum – hier bewusst als any getypt
        data.status = upper as any;
      }
    }

    const updated = await prismaAny.event.update({
      where: {
        id: eventId,
      },
      data,
      include: {
        eventForms: {
          include: {
            form: true,
          },
        },
      },
    });

    return NextResponse.json({
      event: toEventWithFormsDTO(updated),
    });
  } catch (error: any) {
    console.error('[PATCH /api/admin/events/[id]] Error:', error);

    // Unique-Constraint (tenantId, slug)
    if (
      error &&
      typeof error === 'object' &&
      'code' in error &&
      error.code === 'P2002'
    ) {
      return NextResponse.json(
        {
          error: 'Slug must be unique per tenant.',
          code: 'EVENT_SLUG_UNIQUE',
        },
        { status: 409 }
      );
    }

    return NextResponse.json(
      {
        error: 'Internal server error.',
      },
      { status: 500 }
    );
  }
}
