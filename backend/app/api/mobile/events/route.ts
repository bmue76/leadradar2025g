import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiKeyContext } from "@/lib/api-keys";
import { checkDualRateLimit } from "@/lib/api-rate-limit";
import { jsonError, jsonOk } from "@/lib/api-response";

export async function GET(req: NextRequest) {
  try {
    const { tenantId, apiKeyId } = await requireApiKeyContext(req);

    const rl = checkDualRateLimit(req, {
      routeKey: "GET:/api/mobile/events",
      windowMs: 60_000,
      tenantId,
      apiKeyId,
      maxRequestsPerApiKey: 120,
      maxRequestsPerIp: 240,
    });

    if (!rl.allowed) {
      return jsonError(
        429,
        "RATE_LIMITED",
        "Too many requests",
        {
          limitedBy: rl.limitedBy,
          retryAfterMs: rl.retryAfterMs,
          retryAfterSeconds: rl.retryAfterSeconds,
        },
        { "Retry-After": rl.retryAfterSeconds.toString() }
      );
    }

    const events = await prisma.event.findMany({
      where: { tenantId },
      orderBy: { startDate: "asc" },
      select: {
        id: true,
        name: true,
        location: true,
        startDate: true,
        endDate: true,
      },
    });

    return jsonOk({ events }, 200);
  } catch (error: any) {
    if (error?.status && error?.message) {
      const code = (error.code as any) ?? "UNAUTHORIZED";
      return jsonError(error.status, code, error.message);
    }

    console.error("[GET /api/mobile/events] Unexpected error", error);
    return jsonError(500, "INTERNAL_ERROR", "Internal server error");
  }
}
