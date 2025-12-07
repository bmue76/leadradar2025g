// backend/app/api/mobile/events/[id]/forms/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { toEventWithFormsDTO } from '@/lib/types/events';

// public/mobile – kein requireAuthContext
const prismaAny = prisma as any;

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
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
        // optional: nur aktive Events für Mobile
        status: 'ACTIVE',
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
        { error: 'Event not found or not active.' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      event: toEventWithFormsDTO(event),
    });
  } catch (error) {
    console.error('[GET /api/mobile/events/[id]/forms] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error.' },
      { status: 500 }
    );
  }
}
