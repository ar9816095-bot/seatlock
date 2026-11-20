import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type {
  AppPreferences,
  EventCategory,
  LanguageCode,
  TextSize,
  ThemeMode,
  ThemePresetId,
} from '../types';
import { getDictionary, type TranslationDictionary } from '../utils/i18n';
import {
  computeRadiusScale,
  deriveSurfaceFromBg,
  getThemePresetById,
  isHexColorDark,
  type ThemePresetDefinition,
} from '../utils/themePresets';

const STORAGE_KEY = 'seatlock_preferences_v1';

const DEFAULT_PREFERENCES: AppPreferences = {
  theme: 'system',
  themePreset: 'midnight-indigo',
  customBgColor: null,
  borderRadiusPx: 16,
  language: 'en',
  highContrast: false,
  textSize: 'md',
  reducedMotion: false,
  favoriteEventIds: ['evt-music-fest', 'evt-ai-summit'],
  recentlyViewedIds: [],
  preferredCategories: ['Music', 'Technology'],
};

function loadPreferences(): AppPreferences {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_PREFERENCES;
    const parsed = JSON.parse(raw) as Partial<AppPreferences>;
    return {
      ...DEFAULT_PREFERENCES,
      ...parsed,
      themePreset: parsed.themePreset ?? DEFAULT_PREFERENCES.themePreset,
      customBgColor:
        typeof parsed.customBgColor === 'string' && /^#[0-9a-fA-F]{6}$/.test(parsed.customBgColor)
          ? parsed.customBgColor
          : null,
      borderRadiusPx:
        typeof parsed.borderRadiusPx === 'number' && !Number.isNaN(parsed.borderRadiusPx)
          ? Math.max(0, Math.min(28, Math.round(parsed.borderRadiusPx)))
          : DEFAULT_PREFERENCES.borderRadiusPx,
      favoriteEventIds: Array.isArray(parsed.favoriteEventIds)
        ? parsed.favoriteEventIds
        : DEFAULT_PREFERENCES.favoriteEventIds,
      recentlyViewedIds: Array.isArray(parsed.recentlyViewedIds) ? parsed.recentlyViewedIds : [],
      preferredCategories: Array.isArray(parsed.preferredCategories)
        ? parsed.preferredCategories
        : DEFAULT_PREFERENCES.preferredCategories,
    };
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

interface PreferencesContextValue {
  preferences: AppPreferences;
  resolvedTheme: 'dark' | 'light';
  activeThemePreset: ThemePresetDefinition;
  activeBgHex: string;
  t: TranslationDictionary;
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;
  setThemePreset: (presetId: ThemePresetId) => void;
  setCustomBgColor: (hex: string | null) => void;
  setBorderRadiusPx: (px: number) => void;
  resetAppearance: () => void;
  setLanguage: (lang: LanguageCode) => void;
  setHighContrast: (enabled: boolean) => void;
  setTextSize: (size: TextSize) => void;
  setReducedMotion: (enabled: boolean) => void;
  toggleFavorite: (eventId: string, category?: EventCategory) => void;
  recordRecentlyViewed: (eventId: string, category?: EventCategory) => void;
}

const PreferencesContext = createContext<PreferencesContextValue | null>(null);

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const [preferences, setPreferences] = useState<AppPreferences>(loadPreferences);
  const [systemPrefersDark, setSystemPrefersDark] = useState<boolean>(() =>
    typeof window !== 'undefined' && window.matchMedia
      ? window.matchMedia('(prefers-color-scheme: dark)').matches
      : true
  );

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => setSystemPrefersDark(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const activeThemePreset = getThemePresetById(preferences.themePreset);

  // Determine effective dark/light polarity:
  // 1. If a custom background hex is set, respect its luminance automatically for readability
  // 2. Otherwise if theme === 'system', follow OS preference; else follow explicit preset/mode
  const resolvedTheme: 'dark' | 'light' = preferences.customBgColor
    ? isHexColorDark(preferences.customBgColor)
      ? 'dark'
      : 'light'
    : preferences.theme === 'system'
      ? systemPrefersDark
        ? 'dark'
        : 'light'
      : preferences.theme;

  // Choose the effective preset palette matching current polarity when in default system mode
  const effectivePreset: ThemePresetDefinition =
    preferences.theme === 'system' &&
    !preferences.customBgColor &&
    (preferences.themePreset === 'midnight-indigo' || preferences.themePreset === 'daylight-pearl')
      ? getThemePresetById(resolvedTheme === 'dark' ? 'midnight-indigo' : 'daylight-pearl')
      : activeThemePreset;

  const activeBgHex = preferences.customBgColor ?? effectivePreset.bg;

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('dark', resolvedTheme === 'dark');
    root.classList.toggle('high-contrast', preferences.highContrast);
    root.classList.toggle('reduce-motion', preferences.reducedMotion);
    root.dataset.textSize = preferences.textSize;
    root.dataset.themePreset = effectivePreset.id;
    root.lang = preferences.language;

    const isCustomThemeActive =
      Boolean(preferences.customBgColor) ||
      (effectivePreset.id !== 'midnight-indigo' && effectivePreset.id !== 'daylight-pearl');
    root.dataset.customTheme = isCustomThemeActive ? 'true' : 'false';

    // Apply live theme & custom background CSS custom properties
    if (preferences.customBgColor) {
      const derived = deriveSurfaceFromBg(preferences.customBgColor);
      const isDarkBg = isHexColorDark(preferences.customBgColor);
      root.style.setProperty('--sl-bg', preferences.customBgColor);
      root.style.setProperty('--sl-surface', derived.surface);
      root.style.setProperty('--sl-surface-elevated', derived.elevated);
      root.style.setProperty('--sl-text', isDarkBg ? '#F8FAFC' : '#0F172A');
      root.style.setProperty('--sl-text-muted', isDarkBg ? '#94A3B8' : '#475569');
      root.style.setProperty(
        '--sl-border',
        isDarkBg ? 'rgba(148, 163, 184, 0.20)' : 'rgba(15, 23, 42, 0.12)'
      );
      root.style.setProperty('--sl-primary', effectivePreset.primary);
      root.style.setProperty('--sl-primary-bright', effectivePreset.primaryBright);
      root.style.setProperty('--sl-secondary', effectivePreset.secondary);
      root.style.setProperty('--sl-accent', effectivePreset.accent);
    } else if (isCustomThemeActive) {
      root.style.setProperty('--sl-bg', effectivePreset.bg);
      root.style.setProperty('--sl-surface', effectivePreset.surface);
      root.style.setProperty('--sl-surface-elevated', effectivePreset.surfaceElevated);
      root.style.setProperty('--sl-border', effectivePreset.border);
      root.style.setProperty('--sl-primary', effectivePreset.primary);
      root.style.setProperty('--sl-primary-bright', effectivePreset.primaryBright);
      root.style.setProperty('--sl-secondary', effectivePreset.secondary);
      root.style.setProperty('--sl-accent', effectivePreset.accent);
      root.style.setProperty('--sl-text', effectivePreset.text);
      root.style.setProperty('--sl-text-muted', effectivePreset.textMuted);
    } else {
      // Clear inline overrides so standard Midnight Indigo / Daylight Pearl tokens take over cleanly
      [
        '--sl-bg',
        '--sl-surface',
        '--sl-surface-elevated',
        '--sl-border',
        '--sl-primary',
        '--sl-primary-bright',
        '--sl-secondary',
        '--sl-accent',
        '--sl-text',
        '--sl-text-muted',
      ].forEach((prop) => root.style.removeProperty(prop));
    }

    // Apply live Tailwind v4 border-radius variables globally across every card, button, input, and modal
    const radiusVars = computeRadiusScale(preferences.borderRadiusPx);
    Object.entries(radiusVars).forEach(([cssVar, val]) => {
      root.style.setProperty(cssVar, val);
    });
    root.style.setProperty('--sl-radius-base', `${preferences.borderRadiusPx}px`);

    const themeMeta = document.querySelector('meta[name="theme-color"]');
    if (themeMeta) {
      themeMeta.setAttribute('content', activeBgHex);
    }

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
    } catch {
      // Ignore storage quota errors
    }
  }, [preferences, resolvedTheme, effectivePreset, activeBgHex]);

  const setTheme = (theme: ThemeMode) =>
    setPreferences((p) => ({
      ...p,
      theme,
      customBgColor: null,
      themePreset:
        theme === 'light'
          ? 'daylight-pearl'
          : theme === 'dark'
            ? p.themePreset === 'daylight-pearl' || p.themePreset === 'nordic-sand'
              ? 'midnight-indigo'
              : p.themePreset
            : p.themePreset,
    }));

  const toggleTheme = () =>
    setPreferences((p) => {
      const nextPolarity = resolvedTheme === 'dark' ? 'light' : 'dark';
      return {
        ...p,
        theme: nextPolarity,
        customBgColor: null,
        themePreset: nextPolarity === 'dark' ? 'midnight-indigo' : 'daylight-pearl',
      };
    });

  const setThemePreset = (presetId: ThemePresetId) => {
    const preset = getThemePresetById(presetId);
    setPreferences((p) => ({
      ...p,
      themePreset: presetId,
      theme: preset.polarity,
      customBgColor: null,
    }));
  };

  const setCustomBgColor = (hex: string | null) =>
    setPreferences((p) => ({
      ...p,
      customBgColor: hex,
      theme: hex ? (isHexColorDark(hex) ? 'dark' : 'light') : p.theme,
    }));

  const setBorderRadiusPx = (px: number) =>
    setPreferences((p) => ({
      ...p,
      borderRadiusPx: Math.max(0, Math.min(28, Math.round(px))),
    }));

  const resetAppearance = () =>
    setPreferences((p) => ({
      ...p,
      theme: 'dark',
      themePreset: 'midnight-indigo',
      customBgColor: null,
      borderRadiusPx: 16,
      highContrast: false,
      textSize: 'md',
    }));

  const setLanguage = (language: LanguageCode) => setPreferences((p) => ({ ...p, language }));
  const setHighContrast = (highContrast: boolean) =>
    setPreferences((p) => ({ ...p, highContrast }));
  const setTextSize = (textSize: TextSize) => setPreferences((p) => ({ ...p, textSize }));
  const setReducedMotion = (reducedMotion: boolean) =>
    setPreferences((p) => ({ ...p, reducedMotion }));

  const toggleFavorite = (eventId: string, category?: EventCategory) => {
    setPreferences((p) => {
      const exists = p.favoriteEventIds.includes(eventId);
      const favoriteEventIds = exists
        ? p.favoriteEventIds.filter((id) => id !== eventId)
        : [eventId, ...p.favoriteEventIds];
      const preferredCategories =
        !exists && category && !p.preferredCategories.includes(category)
          ? [category, ...p.preferredCategories].slice(0, 4)
          : p.preferredCategories;
      return { ...p, favoriteEventIds, preferredCategories };
    });
  };

  const recordRecentlyViewed = (eventId: string, category?: EventCategory) => {
    setPreferences((p) => {
      const recentlyViewedIds = [
        eventId,
        ...p.recentlyViewedIds.filter((id) => id !== eventId),
      ].slice(0, 6);
      const preferredCategories =
        category && !p.preferredCategories.includes(category)
          ? [category, ...p.preferredCategories].slice(0, 4)
          : p.preferredCategories;
      return { ...p, recentlyViewedIds, preferredCategories };
    });
  };

  const value: PreferencesContextValue = {
    preferences,
    resolvedTheme,
    activeThemePreset: effectivePreset,
    activeBgHex,
    t: getDictionary(preferences.language),
    setTheme,
    toggleTheme,
    setThemePreset,
    setCustomBgColor,
    setBorderRadiusPx,
    resetAppearance,
    setLanguage,
    setHighContrast,
    setTextSize,
    setReducedMotion,
    toggleFavorite,
    recordRecentlyViewed,
  };

  return <PreferencesContext value={value}>{children}</PreferencesContext>;
}

export function usePreferences(): PreferencesContextValue {
  const ctx = useContext(PreferencesContext);
  if (!ctx) throw new Error('usePreferences must be used within PreferencesProvider');
  return ctx;
}
