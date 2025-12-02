// app/api/health/db/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    // Einfacher Check, ob die DB erreichbar ist
    await prisma.$queryRaw`SELECT 1`;

    return NextResponse.json({
      status: 'ok',
      db: 'reachable',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('DB healthcheck error', error);

    return NextResponse.json(
      {
        status: 'error',
        db: 'unreachable',
        // Nur eine kompakte Fehlermeldung zurückgeben
        error: (error as Error).message,
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    );
  }
}
