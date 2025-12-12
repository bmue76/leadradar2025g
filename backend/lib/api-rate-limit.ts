// backend/lib/api-rate-limit.ts

import { NextRequest } from "next/server";
import { getClientIp, checkRateLimit } from "@/lib/rate-limit";

export type DualRateLimitPolicy = {
  routeKey: string; // z. B. "GET:/api/mobile/events"
  windowMs: number;

  // API-Key Scope
  tenantId: number;
  apiKeyId: number;
  maxRequestsPerApiKey: number;

  // Optional: zusätzlicher IP Scope (empfohlen)
  maxRequestsPerIp?: number;
};

export type DualRateLimitResult =
  | { allowed: true }
  | {
      allowed: false;
      retryAfterMs: number;
      retryAfterSeconds: number;
      limitedBy: "apiKey" | "ip";
    };

export function checkDualRateLimit(req: NextRequest, policy: DualRateLimitPolicy): DualRateLimitResult {
  const ip = getClientIp(req);

  // 1) API-Key Scope
  const apiKeyResult = checkRateLimit({
    key: `ak:${policy.tenantId}:${policy.apiKeyId}:${policy.routeKey}`,
    windowMs: policy.windowMs,
    maxRequests: policy.maxRequestsPerApiKey,
  });

  if (!apiKeyResult.allowed) {
    const retryAfterMs = apiKeyResult.retryAfterMs ?? 0;
    const retryAfterSeconds = Math.ceil(retryAfterMs / 1000);
    return {
      allowed: false,
      retryAfterMs,
      retryAfterSeconds,
      limitedBy: "apiKey",
    };
  }

  // 2) Optional: IP Scope zusätzlich
  if (policy.maxRequestsPerIp != null) {
    const ipResult = checkRateLimit({
      key: `ip:${ip}:${policy.routeKey}`,
      windowMs: policy.windowMs,
      maxRequests: policy.maxRequestsPerIp,
    });

    if (!ipResult.allowed) {
      const retryAfterMs = ipResult.retryAfterMs ?? 0;
      const retryAfterSeconds = Math.ceil(retryAfterMs / 1000);
      return {
        allowed: false,
        retryAfterMs,
        retryAfterSeconds,
        limitedBy: "ip",
      };
    }
  }

  return { allowed: true };
}
