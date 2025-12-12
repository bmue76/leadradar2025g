// backend/lib/formTheme.ts

import type { FormTheme } from './types/forms';

export interface NormalizedFormTheme {
  background: string;
  surface: string;
  primary: string;
  text: string;
  muted: string;
  border: string;
  fontFamily: string;
  logoUrl?: string;
}

/**
 * Default Theme (neutral, modern)
 * - background: App Hintergrund
 * - surface: Panels/Cards
 * - primary: Buttons/Highlights
 * - text: Primärtext
 * - muted: Secondary/Hint Text
 * - border: Linien/Trennungen
 */
export const DEFAULT_FORM_THEME: NormalizedFormTheme = {
  background: '#f8fafc', // slate-50
  surface: '#ffffff',
  primary: '#0ea5e9', // sky-500
  text: '#0f172a', // slate-900
  muted: '#64748b', // slate-500
  border: '#e2e8f0', // slate-200
  fontFamily: 'System',
};

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function normalizeHexMaybe(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const t = value.trim();
  if (!t) return null;
  const withHash = t.startsWith('#') ? t : `#${t}`;
  const s = withHash.toLowerCase();
  if (!/^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/.test(s)) return null;
  return s;
}

function normalizeStringMaybe(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const t = value.trim();
  if (!t) return null;
  return t;
}

/**
 * Defensive Normalizer:
 * - akzeptiert kaputte/unerwartete Shapes
 * - liefert IMMER ein vollständiges Theme zurück (mit Defaults)
 */
export function normalizeTheme(raw: unknown): NormalizedFormTheme {
  const base: NormalizedFormTheme = { ...DEFAULT_FORM_THEME };

  if (!isPlainObject(raw)) return base;

  const o = raw as Record<string, unknown>;

  const background = normalizeHexMaybe(o.background);
  const surface = normalizeHexMaybe(o.surface);
  const primary = normalizeHexMaybe(o.primary);
  const text = normalizeHexMaybe(o.text);
  const muted = normalizeHexMaybe(o.muted);
  const border = normalizeHexMaybe(o.border);

  const fontFamily = normalizeStringMaybe(o.fontFamily);
  const logoUrl = normalizeStringMaybe(o.logoUrl);

  if (background) base.background = background;
  if (surface) base.surface = surface;
  if (primary) base.primary = primary;
  if (text) base.text = text;
  if (muted) base.muted = muted;
  if (border) base.border = border;
  if (fontFamily) base.fontFamily = fontFamily;

  if (logoUrl) {
    base.logoUrl = logoUrl;
  }

  return base;
}

/**
 * Optional: helper um ein Theme-Partial sauber zu bauen (z. B. für UI).
 * (Noch nicht zwingend verwendet, aber praktisch für Block 3/4.)
 */
export function toThemePatch(input: unknown): FormTheme {
  if (!isPlainObject(input)) return {};

  const o = input as Record<string, unknown>;

  const out: FormTheme = {};

  const setHex = (key: keyof Pick<FormTheme, 'background' | 'surface' | 'primary' | 'text' | 'muted' | 'border'>) => {
    const v = normalizeHexMaybe(o[key]);
    if (v) (out as any)[key] = v;
  };

  setHex('background');
  setHex('surface');
  setHex('primary');
  setHex('text');
  setHex('muted');
  setHex('border');

  const fontFamily = normalizeStringMaybe(o.fontFamily);
  if (fontFamily) out.fontFamily = fontFamily;

  const logoUrl = normalizeStringMaybe(o.logoUrl);
  if (logoUrl) out.logoUrl = logoUrl;

  return out;
}
