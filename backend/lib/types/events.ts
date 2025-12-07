// backend/lib/types/events.ts

// String-Unions statt Prisma-Enums, damit wir von @prisma/client-Typen entkoppelt sind.
export type EventStatusDTO = 'PLANNED' | 'ACTIVE' | 'FINISHED';
export type FormStatusDTO = 'DRAFT' | 'ACTIVE' | 'ARCHIVED';

export type EventDTO = {
  id: number;
  tenantId: number;
  name: string;
  slug: string;
  description: string | null;
  startDate: string;
  endDate: string | null;
  location: string | null;
  status: EventStatusDTO;
  createdAt: string;
  updatedAt: string;
};

export type EventFormBindingDTO = {
  id: number;
  eventId: number;
  formId: number;
  isPrimary: boolean;
  createdAt: string;
  updatedAt: string;
  form?: {
    id: number;
    name: string;
    slug: string | null;
    status: FormStatusDTO;
    version: number;
  };
};

export type EventWithFormsDTO = EventDTO & {
  forms: EventFormBindingDTO[];
};

// Minimal-Shapes, wie sie Prisma zurückliefert – ohne harte Abhängigkeit zu @prisma/client

type EventLike = {
  id: number;
  tenantId: number;
  name: string;
  slug: string;
  description: string | null;
  startDate: Date;
  endDate: Date | null;
  location: string | null;
  status: EventStatusDTO | string;
  createdAt: Date;
  updatedAt: Date;
};

type EventFormWithFormLike = {
  id: number;
  eventId: number;
  formId: number;
  isPrimary: boolean;
  createdAt: Date;
  updatedAt: Date;
  form: {
    id: number;
    name: string;
    slug: string | null;
    status: FormStatusDTO | string;
    version: number;
  };
};

export function toEventDTO(event: EventLike): EventDTO {
  return {
    id: event.id,
    tenantId: event.tenantId,
    name: event.name,
    slug: event.slug,
    description: event.description ?? null,
    startDate: event.startDate.toISOString(),
    endDate: event.endDate ? event.endDate.toISOString() : null,
    location: event.location ?? null,
    status: (event.status as EventStatusDTO) ?? 'PLANNED',
    createdAt: event.createdAt.toISOString(),
    updatedAt: event.updatedAt.toISOString(),
  };
}

export function toEventWithFormsDTO(
  event: EventLike & {
    eventForms: EventFormWithFormLike[];
  }
): EventWithFormsDTO {
  return {
    ...toEventDTO(event),
    forms: event.eventForms.map((ef: EventFormWithFormLike) => ({
      id: ef.id,
      eventId: ef.eventId,
      formId: ef.formId,
      isPrimary: ef.isPrimary,
      createdAt: ef.createdAt.toISOString(),
      updatedAt: ef.updatedAt.toISOString(),
      form: {
        id: ef.form.id,
        name: ef.form.name,
        slug: ef.form.slug,
        status: (ef.form.status as FormStatusDTO) ?? 'DRAFT',
        version: ef.form.version,
      },
    })),
  };
}
