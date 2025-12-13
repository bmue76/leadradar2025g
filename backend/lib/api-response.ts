// backend/lib/api-response.ts

import { NextResponse } from "next/server";

export type ApiErrorCode =
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "RATE_LIMITED"
  | "VALIDATION_ERROR"
  | "INVALID_JSON"
  | "NOT_FOUND"
  | "BAD_REQUEST"
  | "CONFLICT"
  | "INTERNAL_ERROR"
  // Preset Versioning (2.22)
  | "PRESET_NOT_FOUND"
  | "FORM_NOT_FOUND"
  | "TENANT_MISMATCH"
  | "UNEXPECTED_ERROR";

export function jsonError(
  status: number,
  code: ApiErrorCode,
  message: string,
  details?: unknown,
  headers?: Record<string, string>,
) {
  return NextResponse.json(
    {
      error: message,
      code,
      ...(details ? { details } : {}),
    },
    { status, headers },
  );
}

export function jsonOk<T>(data: T, status = 200, headers?: Record<string, string>) {
  return NextResponse.json(data, { status, headers });
}
