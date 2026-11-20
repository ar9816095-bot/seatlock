import type { ThemePresetId } from '../types';

export interface ThemePresetDefinition {
  id: ThemePresetId;
  name: string;
  tagline: string;
  polarity: 'dark' | 'light';
  bg: string;
  surface: string;
  surfaceElevated: string;
  border: string;
  primary: string;
  primaryBright: string;
  secondary: string;
  accent: string;
  text: string;
  textMuted: string;
}

export const THEME_PRESETS: ThemePresetDefinition[] = [
  {
    id: 'midnight-indigo',
    name: 'Midnight Indigo',
    tagline: 'Signature deep navy & electric indigo',
    polarity: 'dark',
    bg: '#090E1C',
    surface: '#151D30',
    surfaceElevated: '#1C2640',
    border: 'rgba(148, 163, 184, 0.16)',
    primary: '#6366F1',
    primaryBright: '#818CF8',
    secondary: '#8B5CF6',
    accent: '#22D3EE',
    text: '#F8FAFC',
    textMuted: '#94A3B8',
  },
  {
    id: 'daylight-pearl',
    name: 'Daylight Pearl',
    tagline: 'Crisp studio white & cobalt ink',
    polarity: 'light',
    bg: '#F8FAFC',
    surface: '#FFFFFF',
    surfaceElevated: '#F1F5F9',
    border: 'rgba(15, 23, 42, 0.10)',
    primary: '#4F46E5',
    primaryBright: '#6366F1',
    secondary: '#7C3AED',
    accent: '#0891B2',
    text: '#0F172A',
    textMuted: '#475569',
  },
  {
    id: 'emerald-forest',
    name: 'Emerald Forest',
    tagline: 'Deep botanical dark & jade accents',
    polarity: 'dark',
    bg: '#061511',
    surface: '#0D2620',
    surfaceElevated: '#13352D',
    border: 'rgba(110, 231, 183, 0.18)',
    primary: '#10B981',
    primaryBright: '#34D399',
    secondary: '#14B8A6',
    accent: '#6EE7B7',
    text: '#ECFDF5',
    textMuted: '#A7F3D0',
  },
  {
    id: 'royal-velvet',
    name: 'Royal Velvet',
    tagline: 'Amethyst stage night & orchid glow',
    polarity: 'dark',
    bg: '#13091F',
    surface: '#211234',
    surfaceElevated: '#2D1947',
    border: 'rgba(216, 180, 254, 0.18)',
    primary: '#A855F7',
    primaryBright: '#C084FC',
    secondary: '#EC4899',
    accent: '#F472B6',
    text: '#FAF5FF',
    textMuted: '#D8B4FE',
  },
  {
    id: 'sunset-ember',
    name: 'Sunset Ember',
    tagline: 'Warm obsidian hall & amber copper',
    polarity: 'dark',
    bg: '#180D09',
    surface: '#281711',
    surfaceElevated: '#382018',
    border: 'rgba(253, 186, 116, 0.18)',
    primary: '#F97316',
    primaryBright: '#FB923C',
    secondary: '#EF4444',
    accent: '#FBBF24',
    text: '#FFF7ED',
    textMuted: '#FED7AA',
  },
  {
    id: 'nordic-sand',
    name: 'Nordic Sand',
    tagline: 'Warm editorial paper & pine teal',
    polarity: 'light',
    bg: '#F4F1EA',
    surface: '#FFFDF8',
    surfaceElevated: '#EAE4D7',
    border: 'rgba(41, 37, 36, 0.12)',
    primary: '#0F766E',
    primaryBright: '#14B8A6',
    secondary: '#B45309',
    accent: '#D97706',
    text: '#1C1917',
    textMuted: '#57534E',
  },
];

export interface BackgroundSwatch {
  name: string;
  hex: string;
  polarity: 'dark' | 'light';
}

export const BACKGROUND_SWATCHES: BackgroundSwatch[] = [
  { name: 'Midnight Navy', hex: '#090E1C', polarity: 'dark' },
  { name: 'Deep Forest', hex: '#061511', polarity: 'dark' },
  { name: 'Royal Plum', hex: '#13091F', polarity: 'dark' },
  { name: 'Warm Obsidian', hex: '#180D09', polarity: 'dark' },
  { name: 'Abyssal Ocean', hex: '#071626', polarity: 'dark' },
  { name: 'Carbon Graphite', hex: '#111217', polarity: 'dark' },
  { name: 'Studio Pearl', hex: '#F8FAFC', polarity: 'light' },
  { name: 'Warm Sand', hex: '#F4F1EA', polarity: 'light' },
  { name: 'Mint Mist', hex: '#EEFBF6', polarity: 'light' },
  { name: 'Soft Lavender', hex: '#F5F0FF', polarity: 'light' },
  { name: 'Apricot Cream', hex: '#FFF5EB', polarity: 'light' },
  { name: 'Glacier Sky', hex: '#EEF6FF', polarity: 'light' },
];

export interface RadiusPreset {
  id: string;
  label: string;
  token: string;
  px: number;
}

export const RADIUS_PRESETS: RadiusPreset[] = [
  { id: 'sharp', label: 'Sharp', token: '0px', px: 0 },
  { id: 'subtle', label: 'Subtle', token: 'rounded-lg', px: 8 },
  { id: 'classic', label: 'Classic', token: 'rounded-xl', px: 12 },
  { id: 'rounded', label: 'Rounded', token: 'rounded-2xl', px: 16 },
  { id: 'soft', label: 'Soft', token: 'rounded-3xl', px: 24 },
];

export function getThemePresetById(id: ThemePresetId): ThemePresetDefinition {
  return THEME_PRESETS.find((p) => p.id === id) ?? THEME_PRESETS[0];
}

/**
 * Determines whether a hex color is dark using WCAG relative luminance.
 */
export function isHexColorDark(hex: string): boolean {
  const clean = hex.trim().replace('#', '');
  if (!/^[0-9a-fA-F]{6}$/.test(clean)) return true;
  const r = parseInt(clean.slice(0, 2), 16) / 255;
  const g = parseInt(clean.slice(2, 4), 16) / 255;
  const b = parseInt(clean.slice(4, 6), 16) / 255;

  const toLinear = (c: number) =>
    c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  const luminance = 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
  return luminance < 0.35;
}

/**
 * Computes a harmonious surface shade from any custom background hex color.
 */
export function deriveSurfaceFromBg(hex: string): { surface: string; elevated: string } {
  const clean = hex.trim().replace('#', '');
  if (!/^[0-9a-fA-F]{6}$/.test(clean)) {
    return { surface: '#151D30', elevated: '#1C2640' };
  }
  const dark = isHexColorDark(hex);
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);

  const shift = (value: number, delta: number) =>
    Math.max(0, Math.min(255, Math.round(value + delta)))
      .toString(16)
      .padStart(2, '0');

  if (dark) {
    return {
      surface: `#${shift(r, 15)}${shift(g, 16)}${shift(b, 20)}`,
      elevated: `#${shift(r, 26)}${shift(g, 28)}${shift(b, 34)}`,
    };
  }
  return {
    surface: '#FFFFFF',
    elevated: `#${shift(r, -10)}${shift(g, -10)}${shift(b, -10)}`,
  };
}

/**
 * Computes Tailwind v4 `--radius-*` CSS variable values from a base pixel radius (0..28).
 */
export function computeRadiusScale(basePx: number): Record<string, string> {
  const clamped = Math.max(0, Math.min(28, Math.round(basePx)));
  if (clamped === 0) {
    return {
      '--radius-xs': '0px',
      '--radius-sm': '0px',
      '--radius-md': '0px',
      '--radius-lg': '0px',
      '--radius-xl': '0px',
      '--radius-2xl': '0px',
      '--radius-3xl': '0px',
    };
  }
  const scale = clamped / 16;
  return {
    '--radius-xs': `${Math.max(1, Math.round(2 * scale))}px`,
    '--radius-sm': `${Math.max(2, Math.round(4 * scale))}px`,
    '--radius-md': `${Math.max(3, Math.round(6 * scale))}px`,
    '--radius-lg': `${Math.max(4, Math.round(8 * scale))}px`,
    '--radius-xl': `${Math.max(6, Math.round(12 * scale))}px`,
    '--radius-2xl': `${clamped}px`,
    '--radius-3xl': `${Math.round(24 * scale)}px`,
  };
}
