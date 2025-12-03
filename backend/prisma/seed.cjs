// backend/prisma/seed.cjs

require('dotenv/config');

const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');

// Prisma 7: Adapter-basiertes Setup für PostgreSQL
const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Seeding demo data...');

  const tenantSlug = 'demo-tenant';
  const tenantName = 'Demo Tenant';
  const userEmail = 'demo@leadradar.test';
  const userName = 'Demo User';

  // 1) Tenant upserten (ON CONFLICT auf slug) – mit createdAt/updatedAt
  await prisma.$executeRaw`
    INSERT INTO "Tenant" ("name", "slug", "createdAt", "updatedAt")
    VALUES (${tenantName}, ${tenantSlug}, NOW(), NOW())
    ON CONFLICT ("slug")
    DO UPDATE SET
      "name" = EXCLUDED."name",
      "updatedAt" = NOW();
  `;

  const [demoTenant] = await prisma.$queryRaw`
    SELECT "id", "name", "slug", "createdAt", "updatedAt"
    FROM "Tenant"
    WHERE "slug" = ${tenantSlug}
    LIMIT 1;
  `;

  if (!demoTenant) {
    throw new Error('Demo Tenant not found after insert.');
  }

  console.log('Tenant ready:', demoTenant);

  // 2) User upserten (ON CONFLICT auf email) – mit createdAt/updatedAt
  await prisma.$executeRaw`
    INSERT INTO "User" ("email", "name", "tenantId", "createdAt", "updatedAt")
    VALUES (${userEmail}, ${userName}, ${demoTenant.id}, NOW(), NOW())
    ON CONFLICT ("email")
    DO UPDATE SET
      "name" = EXCLUDED."name",
      "tenantId" = EXCLUDED."tenantId",
      "updatedAt" = NOW();
  `;

  const [demoUser] = await prisma.$queryRaw`
    SELECT "id", "email", "name", "tenantId", "createdAt", "updatedAt"
    FROM "User"
    WHERE "email" = ${userEmail}
    LIMIT 1;
  `;

  if (!demoUser) {
    throw new Error('Demo User not found after insert.');
  }

  console.log('User ready:', demoUser);

  console.log('✅ Seeding completed.');
}

main()
  .catch((error) => {
    console.error('❌ Seeding error:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
