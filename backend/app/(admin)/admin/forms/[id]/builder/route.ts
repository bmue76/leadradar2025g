// app/(admin)/admin/forms/[id]/builder/route.ts

import { NextRequest, NextResponse } from 'next/server';

/**
 * Legacy-Route:
 * /admin/forms/[id]/builder ist ab Teilprojekt 2.6 nur noch
 * ein Redirect auf den zentralen Formbuilder-Workspace:
 * /admin/forms/[id]
 *
 * Die ID wird robust aus dem Pfad extrahiert:
 * /admin/forms/123/builder -> 123
 */
export function GET(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Beispiel: "/admin/forms/123/builder" -> ["", "admin", "forms", "123", "builder"]
  const segments = pathname.split('/').filter(Boolean);
  // segments: ["admin", "forms", "123", "builder"]

  let target = '/admin/forms';

  const builderIndex = segments.lastIndexOf('builder');
  if (builderIndex > 0) {
    const id = segments[builderIndex - 1];
    if (id && id !== 'builder') {
      target = `/admin/forms/${id}`;
    }
  }

  return NextResponse.redirect(new URL(target, request.url));
}