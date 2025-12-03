// backend/lib/types/forms.ts

/**
 * Enum-Typen für Forms & Fields auf API-/UI-Ebene.
 * Entsprechen den Prisma-Enums im Schema:
 * enum FormStatus { DRAFT, ACTIVE, ARCHIVED }
 * enum FormFieldType { TEXT, TEXTAREA, EMAIL, PHONE, NUMBER, SELECT, MULTISELECT, CHECKBOX, RADIO, DATE, DATETIME, TIME, NOTE }
 */

export type FormStatus = 'DRAFT' | 'ACTIVE' | 'ARCHIVED';

export type FormFieldType =
  | 'TEXT'
  | 'TEXTAREA'
  | 'EMAIL'
  | 'PHONE'
  | 'NUMBER'
  | 'SELECT'
  | 'MULTISELECT'
  | 'CHECKBOX'
  | 'RADIO'
  | 'DATE'
  | 'DATETIME'
  | 'TIME'
  | 'NOTE';

/**
 * Repräsentiert ein einzelnes Feld eines Formulars auf API-/UI-Ebene.
 * Basierend auf dem Prisma-Model FormField, aber bewusst schlank gehalten.
 */
export interface FormFieldDTO {
  id: number;
  formId: number;

  key: string;
  label: string;
  type: FormFieldType;

  placeholder?: string | null;
  helpText?: string | null;
  required: boolean;
  order: number;

  // JSON-Konfiguration aus Prisma (z. B. options für SELECT/MULTISELECT)
  config?: unknown | null;

  isActive: boolean;
}

/**
 * Repräsentiert ein Formular-Kopfobjekt inkl. seiner Felder.
 * Ideal für Admin-UI und Mobile-App.
 */
export interface FormDTO {
  id: number;
  tenantId: number;

  name: string;
  description?: string | null;
  status: FormStatus;
  slug?: string | null;
  version: number;

  createdAt: string; // ISO-String auf API-Ebene
  updatedAt: string; // ISO-String auf API-Ebene

  fields: FormFieldDTO[];
}

/**
 * Erlaubte Wertetypen für Leads.
 * Wir bleiben bewusst pragmatisch:
 * - string / number / boolean / null
 * - Arrays davon (z. B. MULTISELECT)
 */
export type LeadValue =
  | string
  | number
  | boolean
  | null
  | string[]
  | number[]
  | boolean[];

/**
 * Map von FormField.key → konkreter Wert.
 */
export type LeadValueMap = Record<string, LeadValue>;

/**
 * Lead-Darstellung auf API-/UI-Ebene.
 */
export interface LeadDTO {
  id: number;
  tenantId: number;
  formId: number;

  source?: string | null;

  values: LeadValueMap;

  createdByUserId?: number | null;

  createdAt: string; // ISO-String
  updatedAt: string; // ISO-String
}

/**
 * Request-Shape für das Anlegen eines Leads über eine API.
 */
export interface CreateLeadRequest {
  formId: number;
  values: LeadValueMap;
  source?: string;
}
