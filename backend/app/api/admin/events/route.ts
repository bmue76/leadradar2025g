// backend/app/api/admin/events/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuthContext } from '@/lib/auth';
import { toEventDTO, EventStatusDTO } from '@/lib/types/events';

type CreateEventBody = {
  name: string;
  slug?: string;
  description?: string | null;
  startDate: string; // ISO-String
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

// Lokaler Any-Cast, um TS-Probleme mit noch nicht aktualisierten Prisma-Typen zu umgehen.
const prismaAny = prisma as any;

export async function GET(req: NextRequest) {
  try {
    const { tenant } = await requireAuthContext(req);

    const events = await prismaAny.event.findMany({
      where: {
        tenantId: tenant.id,
      },
      orderBy: {
        startDate: 'desc',
      },
    });

    return NextResponse.json({
      events: events.map(toEventDTO),
    });
  } catch (error) {
    console.error('[GET /api/admin/events] Error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error.',
      },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const { tenant } = await requireAuthContext(req);

    let body: CreateEventBody;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON body.' },
        { status: 400 }
      );
    }

    const { name, slug, description, startDate, endDate, location, status } = body;

    if (!name || !startDate) {
      return NextResponse.json(
        {
          error: 'Missing required fields: name, startDate.',
        },
        { status: 400 }
      );
    }

    const generatedSlug = normalizeSlug(slug || name);

    const startDateObj = new Date(startDate);
    if (Number.isNaN(startDateObj.getTime())) {
      return NextResponse.json(
        { error: 'Invalid startDate. Must be a valid ISO date string.' },
        { status: 400 }
      );
    }

    let endDateObj: Date | null = null;
    if (endDate) {
      endDateObj = new Date(endDate);
      if (Number.isNaN(endDateObj.getTime())) {
        return NextResponse.json(
          { error: 'Invalid endDate. Must be a valid ISO date string.' },
          { status: 400 }
        );
      }
    }

    let statusEnum: EventStatusDTO = 'PLANNED';
    if (status && typeof status === 'string') {
      const upper = status.toUpperCase() as EventStatusDTO;
      if (['PLANNED', 'ACTIVE', 'FINISHED'].includes(upper)) {
        statusEnum = upper;
      }
    }

    const event = await prismaAny.event.create({
      data: {
        tenantId: tenant.id,
        name,
        slug: generatedSlug,
        description: description ?? null,
        startDate: startDateObj,
        endDate: endDateObj,
        location: location ?? null,
        status: statusEnum as any, // Prisma-Enum, aber hier bewusst losgetypt
      },
    });

    return NextResponse.json(
      {
        event: toEventDTO(event),
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('[POST /api/admin/events] Error:', error);

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
