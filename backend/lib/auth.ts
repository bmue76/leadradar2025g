// backend/lib/auth.ts

import { NextRequest } from 'next/server';
import type { Tenant, User } from '@prisma/client';
import { prisma } from './prisma';

/**
 * Fehlerklasse für Auth-Probleme (z. B. fehlender Header, ungültiger User).
 */
export class AuthError extends Error {
  status: number;
  code: 'UNAUTHORIZED' | 'FORBIDDEN';

  constructor(message: string, status: number = 401, code: 'UNAUTHORIZED' | 'FORBIDDEN' = 'UNAUTHORIZED') {
    super(message);
    this.name = 'AuthError';
    this.status = status;
    this.code = code;
  }
}

/**
 * Kontext, den wir aus dem Auth-/Tenant-Handling gewinnen.
 */
export type AuthContext = {
  user: User;
  tenant: Tenant;
};

/**
 * Liest den Header `x-user-id`, lädt den User inkl. Tenant
 * und gibt den AuthContext zurück.
 *
 * Wirft eine AuthError-Exception mit Status 401, wenn:
 * - der Header fehlt
 * - der Header-Wert keine gültige Zahl ist
 * - der User (oder sein Tenant) nicht gefunden wird
 */
export async function requireAuthContext(req: NextRequest): Promise<AuthContext> {
  const headerValue = req.headers.get('x-user-id');

  if (!headerValue) {
    throw new AuthError('Missing x-user-id header', 401, 'UNAUTHORIZED');
  }

  const parsedId = Number(headerValue);

  if (!Number.isInteger(parsedId) || parsedId <= 0) {
    throw new AuthError('Invalid x-user-id header value', 401, 'UNAUTHORIZED');
  }

  const user = await prisma.user.findUnique({
    where: { id: parsedId },
    include: { tenant: true },
  });

  if (!user || !user.tenant) {
    throw new AuthError('User or tenant not found', 401, 'UNAUTHORIZED');
  }

  return {
    user,
    tenant: user.tenant,
  };
}
