import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiKeyContext } from "@/lib/api-keys";
import { checkDualRateLimit } from "@/lib/api-rate-limit";

function parseId(param: string | undefined): number | null {
  if (!param) return null;
  const n = Number(param);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { tenantId, apiKeyId } = await requireApiKeyContext(req);

    const { id } = await context.params;
    const formId = parseId(id);

    if (!formId) {
      return NextResponse.json({ error: "Invalid form id" }, { status: 400 });
    }

    // Rate Limit (API-Key + IP) – etwas höher, weil App evtl. öfter Formdefinition lädt
    const rl = checkDualRateLimit(req, {
      routeKey: "GET:/api/forms/:id",
      windowMs: 60_000,
      tenantId,
      apiKeyId,
      maxRequestsPerApiKey: 240,
      maxRequestsPerIp: 480,
    });

    if (!rl.allowed) {
      return NextResponse.json(
        {
          error: "Too many requests",
          code: "RATE_LIMITED",
          details: {
            limitedBy: rl.limitedBy,
            retryAfterMs: rl.retryAfterMs,
            retryAfterSeconds: rl.retryAfterSeconds,
          },
        },
        {
          status: 429,
          headers: { "Retry-After": rl.retryAfterSeconds.toString() },
        }
      );
    }

    const form = await prisma.form.findFirst({
      where: { id: formId, tenantId },
    });

    if (!form) {
      return NextResponse.json({ error: "Form not found" }, { status: 404 });
    }

    const fields = await prisma.formField.findMany({
      where: { formId },
    });

    return NextResponse.json({ form, fields }, { status: 200 });
  } catch (error: any) {
    if (error?.status && error?.message) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error("[GET /api/forms/[id]] Unexpected error", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
