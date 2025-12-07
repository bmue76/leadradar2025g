// backend/prisma/seed.cjs

// .env laden (DATABASE_URL)
require('dotenv').config();

const { PrismaClient, FormStatus, FormFieldType, EventStatus } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');

// Sicherstellen, dass DATABASE_URL vorhanden ist
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL is not set. Please define it in your .env file.');
}

// Driver Adapter für PostgreSQL initialisieren
const pool = new Pool({
  connectionString,
});

const adapter = new PrismaPg(pool);

// WICHTIG: PrismaClient mit adapter (Engine-Typ "client" benötigt das)
const prisma = new PrismaClient({
  adapter,
});

async function main() {
  console.log('🌱 Seeding database...');

  // 1) Demo-Tenant anlegen oder wiederverwenden
  const demoTenantSlug = 'demo-tenant';

  const tenant = await prisma.tenant.upsert({
    where: { slug: demoTenantSlug },
    update: {},
    create: {
      name: 'Demo Tenant',
      slug: demoTenantSlug,
    },
  });

  console.log('✅ Tenant:', tenant.slug, `(id: ${tenant.id})`);

  // 2) Demo-User anlegen oder wiederverwenden
  const demoUserEmail = 'demo@leadradar.local';

  const user = await prisma.user.upsert({
    where: { email: demoUserEmail },
    update: {},
    create: {
      email: demoUserEmail,
      name: 'Demo User',
      tenantId: tenant.id,
    },
  });

  console.log('✅ User:', user.email, `(id: ${user.id})`);

  // 3) Demo-Formular anlegen oder wiederverwenden
  const demoFormSlug = 'demo-lead-form';

  const form = await prisma.form.upsert({
    where: {
      // basiert auf @@unique([tenantId, slug]) in schema.prisma
      tenantId_slug: {
        tenantId: tenant.id,
        slug: demoFormSlug,
      },
    },
    update: {},
    create: {
      tenantId: tenant.id,
      name: 'Demo Lead-Formular',
      description: 'Beispiel-Formular für Messen, um Leads zu erfassen.',
      status: FormStatus.ACTIVE,
      slug: demoFormSlug,
      version: 1,
      createdByUserId: user.id,
      updatedByUserId: user.id,
      fields: {
        create: [
          {
            tenantId: tenant.id,
            key: 'firstName',
            label: 'Vorname',
            type: FormFieldType.TEXT,
            required: true,
            order: 1,
          },
          {
            tenantId: tenant.id,
            key: 'lastName',
            label: 'Nachname',
            type: FormFieldType.TEXT,
            required: true,
            order: 2,
          },
          {
            tenantId: tenant.id,
            key: 'email',
            label: 'E-Mail',
            type: FormFieldType.EMAIL,
            required: true,
            order: 3,
          },
          {
            tenantId: tenant.id,
            key: 'company',
            label: 'Firma',
            type: FormFieldType.TEXT,
            required: false,
            order: 4,
          },
          {
            tenantId: tenant.id,
            key: 'phone',
            label: 'Telefon',
            type: FormFieldType.PHONE,
            required: false,
            order: 5,
          },
          {
            tenantId: tenant.id,
            key: 'notes',
            label: 'Notizen',
            type: FormFieldType.TEXTAREA,
            required: false,
            order: 6,
          },
          {
            tenantId: tenant.id,
            key: 'newsletterOptIn',
            label: 'Newsletter erhalten',
            type: FormFieldType.CHECKBOX,
            required: false,
            order: 7,
          },
        ],
      },
    },
    include: {
      fields: true,
    },
  });

  console.log('✅ Form:', form.name, `(id: ${form.id}, slug: ${form.slug})`);
  console.log('   Fields:', form.fields.map((f) => `${f.key} (${f.type})`).join(', '));

  // 4) Demo-Event anlegen oder wiederverwenden
  const demoEventSlug = 'demo-messe-2026';

  const event = await prisma.event.upsert({
    where: {
      // basiert auf @@unique([tenantId, slug]) in schema.prisma
      tenantId_slug: {
        tenantId: tenant.id,
        slug: demoEventSlug,
      },
    },
    update: {},
    create: {
      tenantId: tenant.id,
      name: 'Demo-Messe 2026',
      slug: demoEventSlug,
      description: 'Beispiel-Messe für den Demo-Tenant.',
      startDate: new Date('2026-01-15T09:00:00.000Z'),
      endDate: new Date('2026-01-18T17:00:00.000Z'),
      location: 'Messezentrum Demo City',
      status: EventStatus.PLANNED,
    },
  });

  console.log('✅ Event:', event.name, `(id: ${event.id}, slug: ${event.slug})`);

  // 5) EventForm-Verknüpfung: Demo-Messe 2026 ↔ Demo-Formular
  const eventForm = await prisma.eventForm.upsert({
    where: {
      eventId_formId: {
        eventId: event.id,
        formId: form.id,
      },
    },
    update: {},
    create: {
      eventId: event.id,
      formId: form.id,
      isPrimary: true,
    },
  });

  console.log(
    '✅ EventForm-Verknüpfung erstellt/gefunden:',
    `Event ${event.id} ↔ Form ${form.id}, isPrimary=${eventForm.isPrimary}`
  );

  // 6) Beispiel-Lead anlegen oder mit Event verknüpfen
  const existingSeedLead = await prisma.lead.findFirst({
    where: {
      tenantId: tenant.id,
      formId: form.id,
      source: 'seed',
    },
  });

  if (!existingSeedLead) {
    const lead = await prisma.lead.create({
      data: {
        tenantId: tenant.id,
        formId: form.id,
        eventId: event.id,
        source: 'seed',
        createdByUserId: user.id,
        values: {
          firstName: 'Beat',
          lastName: 'Müller',
          email: 'beat@example.com',
          company: 'PopUp Piazza',
          phone: '+41 79 000 00 00',
          notes: 'Demo-Lead aus Seed-Skript.',
          newsletterOptIn: true,
        },
      },
    });

    console.log('✅ Demo-Lead erstellt:', lead.id, `mit eventId=${lead.eventId}`);
  } else {
    // Falls der Lead schon existiert, aber noch kein Event gesetzt ist, nachziehen
    if (!existingSeedLead.eventId) {
      const updatedLead = await prisma.lead.update({
        where: { id: existingSeedLead.id },
        data: {
          eventId: event.id,
        },
      });
      console.log(
        'ℹ️ Bestehender Demo-Lead aktualisiert:',
        updatedLead.id,
        `jetzt mit eventId=${updatedLead.eventId}`
      );
    } else {
      console.log(
        'ℹ️ Demo-Lead mit source "seed" existiert bereits und ist bereits einem Event zugeordnet, nichts zu tun.'
      );
    }
  }

  console.log('🌱 Seeding finished.');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
