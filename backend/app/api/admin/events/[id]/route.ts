import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

type RouteContext = {
  params: Promise<{ id: string }>;
};

function parseEventId(idRaw: string): number | null {
  const id = Number(idRaw);
  if (!id || Number.isNaN(id)) {
    return null;
  }
  return id;
}

/**
 * Einzelnes Event lesen
 */
export async function GET(req: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const eventId = parseEventId(id);

  if (eventId === null) {
    return NextResponse.json(
      { error: 'Invalid event id.' },
      { status: 400 },
    );
  }

  const event = await prisma.event.findUnique({
    where: { id: eventId },
  });

  if (!event) {
    return NextResponse.json(
      { error: 'Event not found.' },
      { status: 404 },
    );
  }

  return NextResponse.json({ event });
}

/**
 * Event updaten (Name, Zeitraum, Status)
 */
export async function PATCH(req: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const eventId = parseEventId(id);

  if (eventId === null) {
    return NextResponse.json(
      { error: 'Invalid event id.' },
      { status: 400 },
    );
  }

  const body = (await req.json().catch(() => ({}))) as {
    name?: string;
    startDate?: string | null;
    endDate?: string | null;
    status?: string;
  };

  const data: any = {};

  if (typeof body.name === 'string') {
    data.name = body.name.trim();
  }

  if (typeof body.status === 'string') {
    data.status = body.status;
  }

  if (Object.prototype.hasOwnProperty.call(body, 'startDate')) {
    data.startDate = body.startDate ? new Date(body.startDate) : null;
  }

  if (Object.prototype.hasOwnProperty.call(body, 'endDate')) {
    data.endDate = body.endDate ? new Date(body.endDate) : null;
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json(
      { error: 'No valid fields to update.' },
      { status: 400 },
    );
  }

  const existing = await prisma.event.findUnique({
    where: { id: eventId },
  });

  if (!existing) {
    return NextResponse.json(
      { error: 'Event not found.' },
      { status: 404 },
    );
  }

  const updated = await prisma.event.update({
    where: { id: eventId },
    data,
  });

  return NextResponse.json({ event: updated });
}
