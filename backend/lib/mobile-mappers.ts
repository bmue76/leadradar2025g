// backend/lib/mobile-mappers.ts
// LeadRadar2025g – Prisma -> Mobile DTO mappers (no `any`)
// This layer is defensive to keep DTOs stable even if the DB schema evolves.

import type { Event, Form, FormField } from "@prisma/client";
import type {
  MobileEventDTO,
  MobileEventStatus,
  MobileFormDTO,
  MobileFormFieldDTO,
  MobileFormFieldOptionDTO,
  MobileFormFieldType,
} from "./types/mobile";

type Obj = Record<string, unknown>;

function isObj(v: unknown): v is Obj {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function asObj(v: unknown): Obj {
  return isObj(v) ? v : {};
}

function toIsoOrNull(d: unknown): string | null {
  if (!d) return null;
  if (d instanceof Date) return d.toISOString();
  const s = String(d);
  return s.length ? s : null;
}

function asStringOrNull(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  const s = String(v);
  return s.length ? s : null;
}

function asBoolean(v: unknown, fallback = false): boolean {
  if (typeof v === "boolean") return v;
  if (v === "true") return true;
  if (v === "false") return false;
  return fallback;
}

function asNumberOrNull(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim().length) {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

function getNested(obj: unknown, path: string[]): unknown {
  let cur: unknown = obj;
  for (const key of path) {
    if (!isObj(cur)) return undefined;
    cur = cur[key];
  }
  return cur;
}

function normalizeFieldType(t: unknown): MobileFormFieldType {
  const s = String(t || "").trim();
  return (s || "TEXT") as MobileFormFieldType;
}

function normalizeEventStatus(s: unknown): MobileEventStatus {
  const v = String(s || "").trim();
  return (v || "PLANNED") as MobileEventStatus;
}

/**
 * Extracts options from common storage patterns:
 * - field.options (array)
 * - field.config.options (array)
 * - field.config.select.options (array)
 * - field.config.radio.options (array)
 */
function extractOptions(field: FormField): MobileFormFieldOptionDTO[] | undefined {
  const f = asObj(field);

  const candidates: unknown[] = [
    f["options"],
    getNested(f["config"], ["options"]),
    getNested(f["config"], ["select", "options"]),
    getNested(f["config"], ["radio", "options"]),
  ];

  for (const cand of candidates) {
    if (!Array.isArray(cand)) continue;

    const normalized = cand
      .map((o: unknown): MobileFormFieldOptionDTO | null => {
        if (typeof o === "string") {
          const v = o.trim();
          return v ? { label: v, value: v } : null;
        }

        if (!isObj(o)) return null;

        const label =
          (typeof o["label"] === "string" ? o["label"] : null) ??
          (typeof o["text"] === "string" ? o["text"] : null) ??
          (typeof o["name"] === "string" ? o["name"] : null);

        const value =
          typeof o["value"] === "string"
            ? o["value"]
            : typeof label === "string"
              ? label
              : null;

        if (!label || !value) return null;
        return { label, value };
      })
      .filter((x): x is MobileFormFieldOptionDTO => Boolean(x));

    if (normalized.length) return normalized;
  }

  return undefined;
}

function getFieldOrder(field: FormField): number {
  const f = asObj(field);
  const order = asNumberOrNull(f["order"]) ?? asNumberOrNull(f["sortOrder"]) ?? 0;
  return order;
}

function isFieldEnabled(field: FormField): boolean {
  const f = asObj(field);

  const isActive = f["isActive"];
  if (typeof isActive === "boolean") return isActive;

  const enabled = f["enabled"];
  if (typeof enabled === "boolean") return enabled;

  return true;
}

export function toMobileEventDTO(event: Event): MobileEventDTO {
  const e = asObj(event);

  return {
    id: String(e["id"] ?? ""),
    name: String(e["name"] ?? ""),
    status: normalizeEventStatus(e["status"]),
    startDate: toIsoOrNull(e["startDate"]),
    endDate: toIsoOrNull(e["endDate"]),
    location: asStringOrNull(e["location"]),
    description: asStringOrNull(e["description"]),
  };
}

export function toMobileFormFieldDTO(field: FormField): MobileFormFieldDTO {
  const f = asObj(field);

  const type = normalizeFieldType(f["type"]);
  const options = extractOptions(field);

  const dto: MobileFormFieldDTO = {
    id: String(f["id"] ?? ""),
    key: String(f["key"] ?? ""),
    label: String(f["label"] ?? ""),
    type,

    required: asBoolean(f["required"], false),

    placeholder: asStringOrNull(f["placeholder"]),
    helpText: asStringOrNull(f["helpText"]),

    order: getFieldOrder(field),
  };

  if (options && options.length) dto.options = options;
  return dto;
}

export function toMobileFormDTO(form: Form & { fields: FormField[] }): MobileFormDTO {
  const fm = asObj(form);

  const fields = [...(form.fields ?? [])]
    .filter(isFieldEnabled)
    .sort((a, b) => getFieldOrder(a) - getFieldOrder(b))
    .map(toMobileFormFieldDTO);

  return {
    id: String(fm["id"] ?? ""),
    name: String(fm["name"] ?? ""),
    description: asStringOrNull(fm["description"]),
    fields,
  };
}
