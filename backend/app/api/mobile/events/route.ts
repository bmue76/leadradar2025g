// backend/app/api/mobile/events/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { toEventDTO } from '@/lib/types/events';
import { getClientIp, checkRateLimit } from '@/lib/rate-limit';

// public/mobile – kein requireAuthContext
const prismaAny = prisma as any;

export async function GET(req: NextRequest) {
  // Rate Limiting: 120 Requests pro Minute pro Client (API-Key oder IP)
  const clientId = req.headers.get('x-api-key') ?? getClientIp(req);

  const rlResult = checkRateLimit({
    key: `${clientId}:GET:/api/mobile/events`,
    windowMs: 60_000, // 1 Minute
    maxRequests: 120,
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
    const url = new URL(req.url);
    const tenantSlug = url.searchParams.get('tenantSlug');

    if (!tenantSlug) {
      return NextResponse.json(
        { error: 'tenantSlug query parameter is required.' },
        { status: 400 },
      );
    }

    const tenant = await prismaAny.tenant.findUnique({
      where: { slug: tenantSlug },
    });

    if (!tenant) {
      return NextResponse.json(
        { error: 'Tenant not found.' },
        { status: 404 },
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
      { status: 500 },
    );
  }
}
