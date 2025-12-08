import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuthContext } from "@/lib/auth";

type RouteContext = {
  params: Promise<{ id: string }>;
};

// GET /api/admin/events/[id]/forms
// Liefert alle Formular-Bindungen inkl. Form-Metadaten
export async function GET(req: Request, context: RouteContext) {
  try {
    // Nur zur Auth-Prüfung – Inhalt brauchen wir hier nicht
    await requireAuthContext(req as any);

    const { id } = await context.params;
    const eventId = Number(id);

    if (!eventId || Number.isNaN(eventId)) {
      return NextResponse.json(
        { error: "Invalid event id" },
        { status: 400 },
      );
    }

    const forms = await prisma.eventForm.findMany({
      where: {
        eventId,
      },
      orderBy: [
        { isPrimary: "desc" },
        { id: "asc" },
      ],
      include: {
        form: {
          select: {
            id: true,
            name: true,
            description: true,
          },
        },
      },
    });

    return NextResponse.json({ forms });
  } catch (err) {
    console.error("[GET /api/admin/events/[id]/forms] error", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// POST /api/admin/events/[id]/forms
// Body: { formId: number }
// Fügt dem Event ein Formular hinzu (falls noch nicht vorhanden) und gibt die aktualisierte Liste zurück
export async function POST(req: Request, context: RouteContext) {
  try {
    await requireAuthContext(req as any);

    const { id } = await context.params;
    const eventId = Number(id);

    if (!eventId || Number.isNaN(eventId)) {
      return NextResponse.json(
        { error: "Invalid event id" },
        { status: 400 },
      );
    }

    const body = (await req.json().catch(() => null)) as { formId?: number } | null;
    const formId = body?.formId;

    if (!formId || typeof formId !== "number") {
      return NextResponse.json(
        { error: "Missing or invalid formId" },
        { status: 400 },
      );
    }

    // Event muss existieren
    const event = await prisma.event.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      return NextResponse.json(
        { error: "Event not found" },
        { status: 404 },
      );
    }

    // Formular muss existieren
    const form = await prisma.form.findUnique({
      where: { id: formId },
    });

    if (!form) {
      return NextResponse.json(
        { error: "Form not found" },
        { status: 404 },
      );
    }

    // Prüfen, ob Formular bereits zugeordnet ist
    const existingBinding = await prisma.eventForm.findFirst({
      where: {
        eventId: event.id,
        formId,
      },
    });

    if (!existingBinding) {
      // Prüfen, ob bereits ein primäres Formular existiert
      const existingPrimary = await prisma.eventForm.findFirst({
        where: {
          eventId: event.id,
          isPrimary: true,
        },
      });

      await prisma.eventForm.create({
        data: {
          eventId: event.id,
          formId,
          // erstes Formular wird automatisch primär, falls noch keines gesetzt ist
          isPrimary: !existingPrimary,
        },
      });
    }

    const forms = await prisma.eventForm.findMany({
      where: {
        eventId: event.id,
      },
      orderBy: [
        { isPrimary: "desc" },
        { id: "asc" },
      ],
      include: {
        form: {
          select: {
            id: true,
            name: true,
            description: true,
          },
        },
      },
    });

    return NextResponse.json({ forms });
  } catch (err) {
    console.error("[POST /api/admin/events/[id]/forms] error", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// PATCH /api/admin/events/[id]/forms
// Body: { primaryFormId: number }
// Setzt das angegebene Formular als primär, alle anderen auf false
export async function PATCH(req: Request, context: RouteContext) {
  try {
    await requireAuthContext(req as any);

    const { id } = await context.params;
    const eventId = Number(id);

    if (!eventId || Number.isNaN(eventId)) {
      return NextResponse.json(
        { error: "Invalid event id" },
        { status: 400 },
      );
    }

    const body = (await req.json().catch(() => null)) as { primaryFormId?: number } | null;
    const primaryFormId = body?.primaryFormId;

    if (!primaryFormId || typeof primaryFormId !== "number") {
      return NextResponse.json(
        { error: "Missing or invalid primaryFormId" },
        { status: 400 },
      );
    }

    const event = await prisma.event.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      return NextResponse.json(
        { error: "Event not found" },
        { status: 404 },
      );
    }

    // Prüfen, ob die Bindung existiert
    const targetBinding = await prisma.eventForm.findFirst({
      where: {
        eventId: event.id,
        formId: primaryFormId,
      },
    });

    if (!targetBinding) {
      return NextResponse.json(
        { error: "Form binding not found for this event" },
        { status: 404 },
      );
    }

    await prisma.$transaction(async (tx) => {
      // Alle auf false
      await tx.eventForm.updateMany({
        where: {
          eventId: event.id,
        },
        data: {
          isPrimary: false,
        },
      });

      // Ziel auf true
      await tx.eventForm.updateMany({
        where: {
          eventId: event.id,
          formId: primaryFormId,
        },
        data: {
          isPrimary: true,
        },
      });
    });

    const forms = await prisma.eventForm.findMany({
      where: {
        eventId: event.id,
      },
      orderBy: [
        { isPrimary: "desc" },
        { id: "asc" },
      ],
      include: {
        form: {
          select: {
            id: true,
            name: true,
            description: true,
          },
        },
      },
    });

    return NextResponse.json({ forms });
  } catch (err) {
    console.error("[PATCH /api/admin/events/[id]/forms] error", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
