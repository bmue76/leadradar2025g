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
 * Formular-Zuordnungen für ein Event (Admin-Ansicht)
 *
 * Rückgabe ist ein Array, das direkt von der Admin-UI konsumiert wird.
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

  const eventForms = await prisma.eventForm.findMany({
    where: {
      eventId: event.id,
    },
    include: {
      form: {
        select: {
          id: true,
          name: true,
        },
      },
    },
    orderBy: [
      { isPrimary: 'desc' }, // Prisma-Feld heisst isPrimary
      { formId: 'asc' },
    ],
  });

  // Auf das DTO-Format der Admin-UI mappen (primary statt isPrimary)
  const result = eventForms.map((ef) => ({
    eventId: ef.eventId,
    formId: ef.formId,
    primary: (ef as any).isPrimary ?? false,
    form: ef.form,
  }));

  return NextResponse.json(result);
}
