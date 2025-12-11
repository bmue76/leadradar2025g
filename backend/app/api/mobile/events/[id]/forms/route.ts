// backend/app/api/mobile/events/[id]/forms/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { toEventWithFormsDTO } from '@/lib/types/events';
import { getClientIp, checkRateLimit } from '@/lib/rate-limit';

// public/mobile – kein requireAuthContext
const prismaAny = prisma as any;

export async function GET(
  req: NextRequest,
  context: any,
) {
  // Rate Limiting: 60 Requests pro Minute pro Client (API-Key oder IP)
  const clientId = req.headers.get('x-api-key') ?? getClientIp(req);

  const rlResult = checkRateLimit({
    key: `${clientId}:GET:/api/mobile/events/[id]/forms`,
    windowMs: 60_000, // 1 Minute
    maxRequests: 60,
  });

  if (!rlResult.allowed) {
    const retryAfterSeconds = Math.ceil((rlResult.retryAfterMs ?? 0) / 1000);

    return NextResponse.json(
      {
        error: 'Too many requests',
        code: 'RATE_LIMITED',
        details: {
          retryAfterMs: rlResult.retryAfterMs ?? 0,
          retryAfterSeconds,
        },
      },
      {
        status: 429,
        headers: {
          'Retry-After': retryAfterSeconds.toString(),
        },
      },
    );
  }

  try {
    // In Next 15 ist context.params ein Promise -> wir müssen es awaiten
    const { id: rawId } = await context.params;
    const eventId = Number.parseInt(rawId, 10);

    if (!Number.isFinite(eventId) || eventId <= 0) {
      return NextResponse.json(
        { error: 'Invalid event id.' },
        { status: 400 },
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
        { status: 404 },
      );
    }

    return NextResponse.json({
      event: toEventWithFormsDTO(event),
    });
  } catch (error) {
    console.error('[GET /api/mobile/events/[id]/forms] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error.' },
      { status: 500 },
    );
  }
}
