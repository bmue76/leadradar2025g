// backend/app/api/admin/events/[id]/forms/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuthContext } from '@/lib/auth';
import { toEventWithFormsDTO } from '@/lib/types/events';

type BindFormBody = {
  formId: number;
  isPrimary?: boolean;
};

// Lokaler Any-Cast, um TS-Probleme mit (noch) nicht aktualisierten Prisma-Typen zu umgehen.
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
    console.error('[GET /api/admin/events/[id]/forms] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error.' },
      { status: 500 }
    );
  }
}

export async function POST(
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

    let body: BindFormBody;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON body.' },
        { status: 400 }
      );
    }

    const { formId, isPrimary } = body;

    if (!formId || !Number.isFinite(formId)) {
      return NextResponse.json(
        { error: 'Missing or invalid formId.' },
        { status: 400 }
      );
    }

    // Sicherstellen, dass das Formular zum selben Tenant gehört
    const form = await prismaAny.form.findFirst({
      where: {
        id: formId,
        tenantId: tenant.id,
      },
    });

    if (!form) {
      return NextResponse.json(
        { error: 'Form not found for this tenant.' },
        { status: 404 }
      );
    }

    // EventForm-Verknüpfung erstellen/aktualisieren
    const binding = await prismaAny.eventForm.upsert({
      where: {
        eventId_formId: {
          eventId: event.id,
          formId: form.id,
        },
      },
      update: {
        isPrimary: isPrimary ?? false,
      },
      create: {
        eventId: event.id,
        formId: form.id,
        isPrimary: isPrimary ?? false,
      },
    });

    // Wenn dieses Binding primary ist, alle anderen für das Event auf false setzen
    if (binding.isPrimary) {
      await prismaAny.eventForm.updateMany({
        where: {
          eventId: event.id,
          id: {
            not: binding.id,
          },
        },
        data: {
          isPrimary: false,
        },
      });
    }

    // Event inkl. aktueller Bindungen neu laden
    const updatedEvent = await prismaAny.event.findFirst({
      where: {
        id: event.id,
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

    return NextResponse.json({
      event: toEventWithFormsDTO(updatedEvent),
    });
  } catch (error: any) {
    console.error('[POST /api/admin/events/[id]/forms] Error:', error);

    if (
      error &&
      typeof error === 'object' &&
      'code' in error &&
      error.code === 'P2002'
    ) {
      return NextResponse.json(
        {
          error: 'Form is already bound to this event.',
          code: 'EVENT_FORM_UNIQUE',
        },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error.' },
      { status: 500 }
    );
  }
}
