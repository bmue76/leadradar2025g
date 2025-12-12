// backend/lib/types/mobile.ts
// LeadRadar2025g – Mobile API Contracts (v1)
// Intentionally decoupled from Prisma models (DTO layer)

export type ISODateString = string;

/**
 * "Open" string enums:
 * - We provide a known set for IntelliSense
 * - but allow future / backend-specific values without breaking clients
 */
export type MobileEventStatus =
  | "DRAFT"
  | "PLANNED"
  | "ACTIVE"
  | "COMPLETED"
  | "CANCELLED"
  | (string & {});

export type MobileFormFieldType =
  | "TEXT"
  | "TEXTAREA"
  | "EMAIL"
  | "PHONE"
  | "NUMBER"
  | "CHECKBOX"
  | "SELECT"
  | "MULTISELECT"
  | "RADIO"
  | "DATE"
  | (string & {});

export type MobileListResponse<T> = {
  items: T[];
};

export type MobileEventDTO = {
  id: string;
  name: string;
  status: MobileEventStatus;
  startDate: ISODateString | null;
  endDate: ISODateString | null;
  location: string | null;
  description?: string | null;
};

export type MobileFormFieldOptionDTO = {
  label: string;
  value: string;
};

export type MobileFormFieldDTO = {
  id: string;
  key: string;
  label: string;
  type: MobileFormFieldType;

  required: boolean;

  placeholder?: string | null;
  helpText?: string | null;

  /**
   * For fields like SELECT/MULTISELECT/RADIO.
   * Kept optional for lean payloads.
   */
  options?: MobileFormFieldOptionDTO[];

  /**
   * Optional ordering for rendering, if you want to expose it.
   * Client should not rely on it blindly; fields are already returned sorted.
   */
  order?: number;
};

export type MobileFormDTO = {
  id: string;
  name: string;
  description?: string | null;

  /**
   * Mobile clients can render directly with this list.
   * Fields are expected to be pre-sorted (server-side).
   */
  fields: MobileFormFieldDTO[];
};

export type MobileLeadCreateRequest = {
  formId: string;
  eventId?: string | null;

  /**
   * key = FormField.key
   * value = user input (string/number/boolean/array/...)
   */
  values: Record<string, unknown>;

  /**
   * optional info for analytics & debugging
   * e.g. "expo", "kiosk", "webview"
   */
  source?: string | null;

  /**
   * optional metadata (device, app version, utm, etc.)
   */
  meta?: Record<string, unknown> | null;
};

export type MobileLeadCreateResponseDTO = {
  id: string;
  formId: string;
  eventId?: string | null;
  createdAt: ISODateString;
};
