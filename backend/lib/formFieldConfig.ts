// backend/lib/formFieldConfig.ts

import {
  CHOICE_FIELD_TYPES,
  ChoiceFieldType,
  FieldWithConfigLike,
  SelectFieldConfig,
  SelectOptionConfig,
} from './types/forms';

/**
 * Prüft, ob ein Feldtyp ein Choice-/Select-Feld ist (SELECT, MULTISELECT, RADIO).
 */
export function isChoiceFieldType(type: string | null | undefined): type is ChoiceFieldType {
  if (!type) return false;
  return CHOICE_FIELD_TYPES.includes(type as ChoiceFieldType);
}

/**
 * Liefert eine leere, aber gültige Select-Config zurück.
 */
export function createEmptySelectConfig(): SelectFieldConfig {
  return {
    options: [],
  };
}

/**
 * Normalisiert eine rohe config (z. B. aus der DB),
 * sodass wir garantiert eine SelectFieldConfig erhalten.
 *
 * Rückwärtskompatibel:
 * - null, undefined oder andere Formen → leere Config
 * - fehlende id/label/value werden sinnvoll aufgefüllt
 */
export function normalizeSelectFieldConfig(raw: unknown): SelectFieldConfig {
  if (!raw || typeof raw !== 'object') {
    return createEmptySelectConfig();
  }

  const obj = raw as { [key: string]: unknown };
  const rawOptions = Array.isArray(obj.options) ? obj.options : [];

  const options: SelectOptionConfig[] = rawOptions.map((rawOpt, index) => {
    const opt = (rawOpt ?? {}) as { [key: string]: unknown };

    const label =
      typeof opt.label === 'string'
        ? opt.label
        : typeof opt.value === 'string'
        ? String(opt.value)
        : '';

    const value =
      typeof opt.value === 'string'
        ? opt.value
        : label;

    const id =
      typeof opt.id === 'string' && opt.id.trim().length > 0
        ? opt.id
        : `opt-${index + 1}`;

    const isDefault = opt.isDefault === true;

    return {
      id,
      label,
      value,
      isDefault,
    };
  });

  return {
    options,
  };
}

/**
 * Erzeugt aus einer SelectFieldConfig ein "sauberes" JSON-Objekt,
 * das direkt in FormField.config gespeichert werden kann.
 */
export function serializeSelectFieldConfig(
  config: SelectFieldConfig | null | undefined,
): Record<string, unknown> {
  const safeConfig = config ?? createEmptySelectConfig();

  return {
    options: safeConfig.options.map((opt, index): SelectOptionConfig => {
      const id = opt.id && opt.id.trim().length > 0 ? opt.id : `opt-${index + 1}`;
      const label = opt.label ?? '';
      const value = opt.value ?? label;

      return {
        id,
        label,
        value,
        isDefault: opt.isDefault === true ? true : undefined,
      };
    }),
  };
}

/**
 * Convenience-Helper:
 * Gibt für ein beliebiges Feld (DTO/Prisma) eine SelectFieldConfig zurück,
 * falls es sich um einen Choice-Typ handelt.
 *
 * Andernfalls wird null zurückgegeben.
 */
export function getSelectConfigForField(field: FieldWithConfigLike): SelectFieldConfig | null {
  if (!isChoiceFieldType(field.type)) {
    return null;
  }

  return normalizeSelectFieldConfig(field.config ?? undefined);
}
