// backend/app/api/mobile/events/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { toEventDTO } from '@/lib/types/events';

// public/mobile – kein requireAuthContext
const prismaAny = prisma as any;

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const tenantSlug = url.searchParams.get('tenantSlug');

    if (!tenantSlug) {
      return NextResponse.json(
        { error: 'tenantSlug query parameter is required.' },
        { status: 400 }
      );
    }

    const tenant = await prismaAny.tenant.findUnique({
      where: { slug: tenantSlug },
    });

    if (!tenant) {
      return NextResponse.json(
        { error: 'Tenant not found.' },
        { status: 404 }
      );
    }

    const events = await prismaAny.event.findMany({
      where: {
        tenantId: tenant.id,
        status: 'ACTIVE', // nur aktive Events für Mobile
      },
      orderBy: {
        startDate: 'asc',
      },
    });

    return NextResponse.json({
      events: events.map(toEventDTO),
    });
  } catch (error) {
    console.error('[GET /api/mobile/events] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error.' },
      { status: 500 }
    );
  }
}
