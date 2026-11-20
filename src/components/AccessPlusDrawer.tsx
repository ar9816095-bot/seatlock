import {
  Check,
  Contrast,
  Globe,
  Keyboard,
  Palette,
  RotateCcw,
  Sparkles,
  SquareRoundCorner,
  Type,
} from 'lucide-react';
import { usePreferences } from '../context/PreferencesContext';
import type { LanguageCode, TextSize } from '../types';
import {
  BACKGROUND_SWATCHES,
  RADIUS_PRESETS,
  THEME_PRESETS,
} from '../utils/themePresets';
import { AccessibleModal } from './AccessibleModal';
import { Button } from './FormControls';

export function AccessPlusDrawer({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const {
    preferences,
    activeThemePreset,
    activeBgHex,
    t,
    setThemePreset,
    setCustomBgColor,
    setBorderRadiusPx,
    resetAppearance,
    setLanguage,
    setHighContrast,
    setTextSize,
    setReducedMotion,
  } = usePreferences();

  const languages: { id: LanguageCode; label: string }[] = [
    { id: 'en', label: 'English' },
    { id: 'hi', label: 'हिन्दी (Hindi)' },
  ];

  const textSizes: { id: TextSize; label: string }[] = [
    { id: 'sm', label: 'Compact' },
    { id: 'md', label: 'Standard' },
    { id: 'lg', label: 'Large' },
  ];

  return (
    <AccessibleModal
      open={open}
      onClose={onClose}
      title="Theme Studio & Access+"
      description="Switch unique themes, customize background colours, adjust live border radius, and configure accessibility."
      maxWidthClass="max-w-2xl"
    >
      <div className="space-y-6">
        {/* Unique Themes */}
        <div>
          <div className="mb-2.5 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Palette className="h-4 w-4 text-[#6366F1]" aria-hidden="true" />
              <span>Unique Themes</span>
            </div>
            <span className="text-xs font-medium text-slate-500 dark:text-[#94A3B8]">
              Active: {activeThemePreset.name}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
            {THEME_PRESETS.map((preset) => {
              const selected =
                activeThemePreset.id === preset.id && !preferences.customBgColor;
              return (
                <button
                  key={preset.id}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => setThemePreset(preset.id)}
                  className={`flex flex-col items-start gap-2 rounded-xl border p-3 text-left transition ${
                    selected
                      ? 'border-[#6366F1] ring-2 ring-[#6366F1]/30'
                      : 'border-slate-200 hover:border-slate-300 dark:border-slate-700 dark:hover:border-slate-600'
                  }`}
                >
                  <div className="flex w-full items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <span
                        className="h-4 w-4 rounded-full border border-black/15"
                        style={{ backgroundColor: preset.bg }}
                      />
                      <span
                        className="h-4 w-4 rounded-full border border-black/15"
                        style={{ backgroundColor: preset.primary }}
                      />
                      <span
                        className="h-4 w-4 rounded-full border border-black/15"
                        style={{ backgroundColor: preset.accent }}
                      />
                    </div>
                    {selected && (
                      <Check className="h-3.5 w-3.5 text-[#6366F1]" aria-hidden="true" />
                    )}
                  </div>
                  <div>
                    <p className="text-xs font-bold">{preset.name}</p>
                    <p className="text-[11px] text-slate-500 dark:text-[#94A3B8]">
                      {preset.polarity === 'dark' ? 'Dark' : 'Light'}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Custom Background Colour */}
        <div>
          <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
            <span className="text-sm font-semibold">Background Colour</span>
            <div className="flex items-center gap-2">
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-medium dark:border-slate-700">
                <input
                  type="color"
                  aria-label="Pick custom background colour"
                  value={activeBgHex}
                  onChange={(e) => setCustomBgColor(e.target.value)}
                  className="h-5 w-6 cursor-pointer border-0 bg-transparent p-0"
                />
                <span className="font-mono-num uppercase">{activeBgHex}</span>
              </label>
              {preferences.customBgColor && (
                <button
                  type="button"
                  onClick={() => setCustomBgColor(null)}
                  className="text-xs font-semibold text-[#6366F1] hover:underline"
                >
                  Clear custom
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-6 gap-2 sm:grid-cols-12">
            {BACKGROUND_SWATCHES.map((swatch) => {
              const isSelected = activeBgHex.toLowerCase() === swatch.hex.toLowerCase();
              return (
                <button
                  key={swatch.hex}
                  type="button"
                  title={`${swatch.name} (${swatch.hex})`}
                  aria-label={`Set background colour to ${swatch.name}`}
                  aria-pressed={isSelected}
                  onClick={() => setCustomBgColor(swatch.hex)}
                  style={{ backgroundColor: swatch.hex }}
                  className={`flex h-9 w-full items-center justify-center rounded-lg border transition ${
                    isSelected
                      ? 'scale-105 border-[#6366F1] ring-2 ring-[#6366F1]'
                      : 'border-slate-400/40 hover:scale-105'
                  }`}
                >
                  {isSelected && (
                    <Check
                      className={`h-3.5 w-3.5 ${
                        swatch.polarity === 'dark' ? 'text-white' : 'text-slate-900'
                      }`}
                      aria-hidden="true"
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Live Border Radius Controls */}
        <div>
          <div className="mb-2.5 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <SquareRoundCorner className="h-4 w-4 text-[#6366F1]" aria-hidden="true" />
              <span>Border Radius (Live)</span>
            </div>
            <span className="font-mono-num rounded-lg bg-[#6366F1]/10 px-2 py-0.5 text-xs font-bold text-[#4F46E5] dark:text-[#818CF8]">
              {preferences.borderRadiusPx}px
            </span>
          </div>

          <div className="grid grid-cols-5 gap-2">
            {RADIUS_PRESETS.map((preset) => {
              const active = preferences.borderRadiusPx === preset.px;
              return (
                <button
                  key={preset.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setBorderRadiusPx(preset.px)}
                  className={`flex min-h-[42px] flex-col items-center justify-center rounded-xl border px-2 py-1.5 text-xs font-semibold transition ${
                    active
                      ? 'border-[#6366F1] bg-[#6366F1]/10 text-[#4F46E5] dark:text-[#818CF8]'
                      : 'border-slate-200 text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800/60'
                  }`}
                >
                  <span>{preset.label}</span>
                  <span className="font-mono-num text-[10px] opacity-75">{preset.px}px</span>
                </button>
              );
            })}
          </div>

          <div className="mt-3 flex items-center gap-3">
            <span className="font-mono-num text-[11px] text-slate-500">0px</span>
            <input
              type="range"
              min={0}
              max={28}
              step={2}
              aria-label="Adjust global border radius in pixels"
              value={preferences.borderRadiusPx}
              onChange={(e) => setBorderRadiusPx(Number(e.target.value))}
              className="h-2 flex-1 cursor-pointer accent-[#6366F1]"
            />
            <span className="font-mono-num text-[11px] text-slate-500">28px</span>
          </div>
        </div>

        {/* Language & Text Size */}
        <div className="grid grid-cols-1 gap-4 border-t border-slate-200 pt-4 dark:border-slate-800 sm:grid-cols-2">
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
              <Globe className="h-4 w-4 text-[#6366F1]" aria-hidden="true" />
              <span>{t.languageLabel}</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {languages.map((lang) => (
                <button
                  key={lang.id}
                  type="button"
                  aria-pressed={preferences.language === lang.id}
                  onClick={() => setLanguage(lang.id)}
                  className={`min-h-[42px] rounded-xl border px-3 py-2 text-xs font-semibold transition ${
                    preferences.language === lang.id
                      ? 'border-[#6366F1] bg-[#6366F1]/10 text-[#4F46E5] dark:text-[#818CF8]'
                      : 'border-slate-200 text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800/60'
                  }`}
                >
                  {lang.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
              <Type className="h-4 w-4 text-[#6366F1]" aria-hidden="true" />
              <span>{t.textSizeLabel}</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {textSizes.map((sz) => (
                <button
                  key={sz.id}
                  type="button"
                  aria-pressed={preferences.textSize === sz.id}
                  onClick={() => setTextSize(sz.id)}
                  className={`min-h-[42px] rounded-xl border px-2 py-2 text-xs font-semibold transition ${
                    preferences.textSize === sz.id
                      ? 'border-[#6366F1] bg-[#6366F1]/10 text-[#4F46E5] dark:text-[#818CF8]'
                      : 'border-slate-200 text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800/60'
                  }`}
                >
                  {sz.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Accessibility Toggles */}
        <div className="space-y-3 border-t border-slate-200 pt-4 dark:border-slate-800">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <Contrast className="h-4 w-4 text-[#6366F1]" aria-hidden="true" />
              <div>
                <p className="text-sm font-semibold">{t.highContrastLabel}</p>
                <p className="text-xs text-slate-500 dark:text-[#94A3B8]">
                  Increases border visibility and foreground contrast ratios.
                </p>
              </div>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={preferences.highContrast}
              aria-label={t.highContrastLabel}
              onClick={() => setHighContrast(!preferences.highContrast)}
              className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors ${
                preferences.highContrast ? 'bg-[#6366F1]' : 'bg-slate-300 dark:bg-slate-700'
              }`}
            >
              <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                  preferences.highContrast ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <Sparkles className="h-4 w-4 text-[#6366F1]" aria-hidden="true" />
              <div>
                <p className="text-sm font-semibold">{t.reducedMotionLabel}</p>
                <p className="text-xs text-slate-500 dark:text-[#94A3B8]">
                  Minimizes transitions, confetti, and animated effects.
                </p>
              </div>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={preferences.reducedMotion}
              aria-label={t.reducedMotionLabel}
              onClick={() => setReducedMotion(!preferences.reducedMotion)}
              className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors ${
                preferences.reducedMotion ? 'bg-[#6366F1]' : 'bg-slate-300 dark:bg-slate-700'
              }`}
            >
              <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                  preferences.reducedMotion ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Keyboard navigation cheat sheet */}
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-xs text-slate-600 dark:border-slate-800 dark:bg-[#090E1C] dark:text-[#94A3B8]">
          <div className="mb-1.5 flex items-center gap-1.5 font-semibold text-slate-800 dark:text-slate-200">
            <Keyboard className="h-3.5 w-3.5 text-[#22D3EE]" aria-hidden="true" />
            <span>Keyboard-Only Booking Controls</span>
          </div>
          <p>
            Use{' '}
            <kbd className="rounded border border-slate-300 px-1 py-0.5 font-mono dark:border-slate-700">
              Arrow Keys
            </kbd>{' '}
            inside the seat map,{' '}
            <kbd className="rounded border border-slate-300 px-1 py-0.5 font-mono dark:border-slate-700">
              Space
            </kbd>{' '}
            or{' '}
            <kbd className="rounded border border-slate-300 px-1 py-0.5 font-mono dark:border-slate-700">
              Enter
            </kbd>{' '}
            to toggle seats, and{' '}
            <kbd className="rounded border border-slate-300 px-1 py-0.5 font-mono dark:border-slate-700">
              Esc
            </kbd>{' '}
            to close dialogs.
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <Button type="button" variant="outline" size="sm" onClick={resetAppearance}>
            <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Reset Default Theme</span>
          </Button>
          <Button type="button" onClick={onClose}>
            Done
          </Button>
        </div>
      </div>
    </AccessibleModal>
  );
}
