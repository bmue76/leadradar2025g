// backend/lib/rate-limit.ts

import type { NextRequest } from "next/server";

type RateLimitOptions = {
  /**
   * Eindeutiger Schlüssel für diese Rate-Limit-Bucket,
   * z. B. `${ip}:${routeId}` oder `${apiKey}:${routeId}`.
   */
  key: string;
  /**
   * Fenstergröße in Millisekunden (z. B. 60_000 für 1 Minute).
   */
  windowMs: number;
  /**
   * Maximale Anzahl Requests innerhalb des Fensters.
   */
  maxRequests: number;
};

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  retryAfterMs?: number;
};

/**
 * Interner Eintrag pro Key im Rate-Limit-Store.
 */
type RateLimitEntry = {
  count: number;
  windowStart: number;
};

/**
 * Globaler in-memory Store für das Rate Limiting.
 * Über globalThis, damit er Hot-Reloads in dev überlebt.
 *
 * Wichtig:
 * - Für lokale Entwicklung und Single-Node-Betrieb gedacht.
 * - In verteilten Umgebungen später durch Redis/KV ersetzbar.
 */
const globalRateLimitStore: Map<string, RateLimitEntry> =
  (globalThis as any).__LR_RATE_LIMIT_STORE__ ??
  new Map<string, RateLimitEntry>();

if (!(globalThis as any).__LR_RATE_LIMIT_STORE__) {
  (globalThis as any).__LR_RATE_LIMIT_STORE__ = globalRateLimitStore;
}

/**
 * Zentrale Rate-Limit-Funktion.
 *
 * Beispiel:
 *   const result = checkRateLimit({
 *     key: `${ip}:POST:/api/leads`,
 *     windowMs: 60_000,
 *     maxRequests: 30,
 *   });
 */
export function checkRateLimit(
  options: RateLimitOptions
): RateLimitResult {
  const { key, windowMs, maxRequests } = options;
  const now = Date.now();

  const existing = globalRateLimitStore.get(key);

  // Kein Eintrag oder Fenster abgelaufen → neues Fenster starten
  if (!existing || now - existing.windowStart > windowMs) {
    globalRateLimitStore.set(key, {
      count: 1,
      windowStart: now,
    });

    return {
      allowed: true,
      remaining: Math.max(0, maxRequests - 1),
    };
  }

  // Fenster aktiv und Limit bereits erreicht
  if (existing.count >= maxRequests) {
    const retryAfterMs = existing.windowStart + windowMs - now;

    return {
      allowed: false,
      remaining: 0,
      retryAfterMs: Math.max(0, retryAfterMs),
    };
  }

  // Fenster aktiv, aber noch unter dem Limit → Count erhöhen
  const newCount = existing.count + 1;

  globalRateLimitStore.set(key, {
    ...existing,
    count: newCount,
  });

  return {
    allowed: true,
    remaining: Math.max(0, maxRequests - newCount),
  };
}

/**
 * Hilfsfunktion, um aus einem NextRequest eine möglichst stabile
 * Client-IP zu ermitteln.
 *
 * In Produktion:
 * - bevorzugt `x-forwarded-for` (erstes IP-Element)
 * - fallback auf `x-real-ip`
 *
 * In dev kann das z. B. "::1" sein – für unseren Zweck okay.
 */
export function getClientIp(req: NextRequest): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first) return first;
  }

  const realIp = req.headers.get("x-real-ip");
  if (realIp) {
    return realIp;
  }

  // Fallback: Host-Header als pseudo-ident
  const host = req.headers.get("host");
  if (host) {
    return `host:${host}`;
  }

  // Worst case – alle ohne erkennbare IP landen in einem Bucket
  return "unknown";
}
