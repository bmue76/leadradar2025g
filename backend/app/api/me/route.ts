// backend/app/api/me/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { requireAuthContext, AuthError } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const { user, tenant } = await requireAuthContext(req);

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        tenantId: user.tenantId,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
      tenant: {
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
        createdAt: tenant.createdAt,
        updatedAt: tenant.updatedAt,
      },
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json(
        {
          error: error.message,
          code: error.code,
        },
        { status: error.status },
      );
    }

    console.error('Unexpected error in /api/me:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
      },
      { status: 500 },
    );
  }
}
