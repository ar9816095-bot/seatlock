import { useState } from 'react';
import {
  Ban,
  Check,
  Clock,
  Copy,
  Loader2,
  Moon,
  Palette,
  RotateCcw,
  Sparkles,
  SquareRoundCorner,
  Sun,
  X,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { AccessibleModal } from '../components/AccessibleModal';
import { Button, InputField } from '../components/FormControls';
import { SeatLockLogo } from '../components/SeatLockLogo';
import { usePreferences } from '../context/PreferencesContext';
import { useToast } from '../context/ToastContext';
import { DEMO_EVENTS } from '../data/demoEvents';
import {
  BACKGROUND_SWATCHES,
  RADIUS_PRESETS,
  THEME_PRESETS,
} from '../utils/themePresets';
import { EventCard } from './ExploreEventsPage';

const SPACING_TOKENS = [
  { token: 'space-2', px: '8px', className: 'w-2' },
  { token: 'space-4', px: '16px', className: 'w-4' },
  { token: 'space-6', px: '24px', className: 'w-6' },
  { token: 'space-8', px: '32px', className: 'w-8' },
  { token: 'space-12', px: '48px', className: 'w-12' },
  { token: 'space-16', px: '64px', className: 'w-16' },
];

export function DesignSystemPage() {
  const {
    preferences,
    resolvedTheme,
    activeThemePreset,
    activeBgHex,
    toggleTheme,
    setThemePreset,
    setCustomBgColor,
    setBorderRadiusPx,
    resetAppearance,
    toggleFavorite,
  } = usePreferences();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const [modalOpen, setModalOpen] = useState(false);
  const [demoInput, setDemoInput] = useState('');
  const [simLoading, setSimLoading] = useState(false);
  const [selectedSeatPreview, setSelectedSeatPreview] = useState<string>('Selected');

  const liveColorTokens = [
    { name: 'Main Background', hex: activeBgHex, usage: 'Active page canvas (click to copy)' },
    { name: 'Card Surface', hex: activeThemePreset.surface, usage: 'Elevated containers & panels' },
    { name: 'Primary', hex: activeThemePreset.primary, usage: 'Primary CTAs, selected seats' },
    { name: 'Secondary', hex: activeThemePreset.secondary, usage: 'AI highlights, secondary actions' },
    { name: 'Accent', hex: activeThemePreset.accent, usage: 'Focus rings, highlights, figures' },
    { name: 'Primary Text', hex: activeThemePreset.text, usage: 'Headings and body typography' },
    { name: 'Secondary Text', hex: activeThemePreset.textMuted, usage: 'Supporting metadata & hints' },
    { name: 'Success', hex: '#10B981', usage: 'Available seats & refunds' },
    { name: 'Warning', hex: '#F59E0B', usage: 'Held seats & 1-min hold warning' },
    { name: 'Error', hex: '#EF4444', usage: 'Booked seats & error alerts' },
  ];

  const handleCopyHex = async (name: string, hex: string) => {
    try {
      await navigator.clipboard?.writeText(hex);
    } catch {
      // fallback toast still shown
    }
    addToast({
      title: `Copied ${hex}`,
      description: `${name} colour token copied to clipboard.`,
      variant: 'success',
    });
  };

  const triggerSimulatedHold = () => {
    setSimLoading(true);
    window.setTimeout(() => {
      setSimLoading(false);
      addToast({
        title: 'Live button demo complete',
        description: 'Seats held cleanly with loading feedback.',
        variant: 'success',
      });
    }, 900);
  };

  const featuredEvent = DEMO_EVENTS[0];
  const isFeaturedFav = preferences.favoriteEventIds.includes(featuredEvent.id);

  return (
    <div className="space-y-10 pb-20">
      <title>Theme Studio &amp; Design System — SEATLOCK UI</title>
      <meta
        name="description"
        content="Interactive Theme Studio, custom background colours, live border radius controls, and WCAG 2.2 AA design system for SEATLOCK UI."
      />

      {/* Header */}
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-slate-200 pb-6 dark:border-slate-800">
        <div>
          <SeatLockLogo size="md" />
          <h1 className="mt-4 font-heading text-3xl font-extrabold tracking-tight text-slate-900 dark:text-[#F8FAFC]">
            SEATLOCK Theme Studio &amp; Design System
          </h1>
          <p className="mt-1.5 max-w-2xl text-sm text-slate-600 dark:text-[#94A3B8]">
            Every theme preset, background colour, border radius control, and component below is
            live — changes apply immediately across the entire application and persist automatically.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Button type="button" variant="outline" size="sm" onClick={toggleTheme}>
            {resolvedTheme === 'dark' ? (
              <>
                <Sun className="h-4 w-4 text-amber-400" aria-hidden="true" />
                <span>Quick Light Mode</span>
              </>
            ) : (
              <>
                <Moon className="h-4 w-4 text-[#6366F1]" aria-hidden="true" />
                <span>Quick Dark Mode</span>
              </>
            )}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              resetAppearance();
              addToast({
                title: 'Appearance reset',
                description: 'Restored default Midnight Indigo theme and 16px border radius.',
                variant: 'info',
              });
            }}
          >
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            <span>Reset Defaults</span>
          </Button>
        </div>
      </header>

      {/* Interactive Theme Presets & Background Colour Studio */}
      <section className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Palette className="h-5 w-5 text-[#6366F1]" aria-hidden="true" />
            <h2 className="font-heading text-xl font-bold">
              00. Unique Themes &amp; Custom Background Colours
            </h2>
          </div>
          <span className="font-mono-num text-xs font-semibold text-slate-500 dark:text-[#94A3B8]">
            Active: {activeThemePreset.name} · Canvas {activeBgHex.toUpperCase()}
          </span>
        </div>

        {/* 6 Unique Themes */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {THEME_PRESETS.map((preset) => {
            const isSelected =
              activeThemePreset.id === preset.id && !preferences.customBgColor;
            return (
              <button
                key={preset.id}
                type="button"
                aria-pressed={isSelected}
                onClick={() => {
                  setThemePreset(preset.id);
                  addToast({
                    title: `${preset.name} theme applied`,
                    description: preset.tagline,
                    variant: 'success',
                  });
                }}
                className={`group flex flex-col overflow-hidden rounded-2xl border text-left transition ${
                  isSelected
                    ? 'border-[#6366F1] ring-2 ring-[#6366F1]/40'
                    : 'border-slate-200 hover:border-[#6366F1]/60 dark:border-slate-800'
                }`}
              >
                <div
                  style={{ backgroundColor: preset.bg }}
                  className="flex h-20 w-full items-center justify-between px-4"
                >
                  <div
                    style={{ backgroundColor: preset.surface }}
                    className="flex items-center gap-2 rounded-xl border border-white/10 px-3 py-2 shadow-sm"
                  >
                    <span
                      style={{ backgroundColor: preset.primary }}
                      className="h-3.5 w-3.5 rounded-full"
                    />
                    <span
                      style={{ backgroundColor: preset.secondary }}
                      className="h-3.5 w-3.5 rounded-full"
                    />
                    <span
                      style={{ backgroundColor: preset.accent }}
                      className="h-3.5 w-3.5 rounded-full"
                    />
                  </div>
                  <span
                    style={{ color: preset.text }}
                    className="rounded-lg bg-black/20 px-2.5 py-1 text-[11px] font-semibold backdrop-blur-xs"
                  >
                    {isSelected ? 'Active Theme' : preset.polarity === 'dark' ? 'Dark' : 'Light'}
                  </span>
                </div>
                <div className="flex flex-1 items-center justify-between gap-3 bg-white p-4 dark:bg-[#151D30]">
                  <div>
                    <p className="text-sm font-bold text-slate-900 dark:text-white">
                      {preset.name}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-600 dark:text-[#94A3B8]">
                      {preset.tagline}
                    </p>
                  </div>
                  {isSelected && (
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#6366F1] text-white">
                      <Check className="h-4 w-4" aria-hidden="true" />
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Background Colour Swatches + Custom Color Picker */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-[#151D30]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Custom Background Colour Studio
              </h3>
              <p className="mt-0.5 text-xs text-slate-600 dark:text-[#94A3B8]">
                Click any curated canvas swatch or pick any hex colour — text &amp; card contrast
                automatically adapt for readability.
              </p>
            </div>
            <div className="flex items-center gap-2.5">
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold dark:border-slate-700 dark:bg-[#090E1C]">
                <input
                  type="color"
                  aria-label="Choose custom background hex colour"
                  value={activeBgHex}
                  onChange={(e) => setCustomBgColor(e.target.value)}
                  className="h-5 w-7 cursor-pointer border-0 bg-transparent p-0"
                />
                <span className="font-mono-num uppercase">{activeBgHex}</span>
              </label>
              {preferences.customBgColor && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setCustomBgColor(null)}
                >
                  Use Theme Default
                </Button>
              )}
            </div>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2.5 sm:grid-cols-6 lg:grid-cols-12">
            {BACKGROUND_SWATCHES.map((swatch) => {
              const active = activeBgHex.toLowerCase() === swatch.hex.toLowerCase();
              return (
                <button
                  key={swatch.hex}
                  type="button"
                  aria-pressed={active}
                  onClick={() => {
                    setCustomBgColor(swatch.hex);
                    addToast({
                      title: `Background set to ${swatch.name}`,
                      description: `Canvas colour ${swatch.hex} applied across SEATLOCK.`,
                      variant: 'success',
                    });
                  }}
                  className="flex flex-col items-center gap-1.5 text-center"
                >
                  <span
                    style={{ backgroundColor: swatch.hex }}
                    className={`flex h-11 w-full items-center justify-center rounded-xl border transition ${
                      active
                        ? 'scale-105 border-[#6366F1] ring-2 ring-[#6366F1]'
                        : 'border-slate-400/40 hover:scale-105'
                    }`}
                  >
                    {active && (
                      <Check
                        className={`h-4 w-4 ${
                          swatch.polarity === 'dark' ? 'text-white' : 'text-slate-900'
                        }`}
                        aria-hidden="true"
                      />
                    )}
                  </span>
                  <span className="truncate text-[10px] font-medium text-slate-600 dark:text-[#94A3B8]">
                    {swatch.name.split(' ')[0]}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* 1. Active Colour Palette */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-heading text-xl font-bold">01. Active Theme Colour Palette</h2>
          <span className="text-xs text-slate-500 dark:text-[#94A3B8]">
            Click any swatch to copy its hex value
          </span>
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {liveColorTokens.map((c) => (
            <button
              key={c.name}
              type="button"
              onClick={() => void handleCopyHex(c.name, c.hex)}
              className="group overflow-hidden rounded-2xl border border-slate-200 bg-white text-left transition hover:border-[#6366F1] dark:border-slate-800 dark:bg-[#151D30]"
            >
              <div
                style={{ backgroundColor: c.hex }}
                className="flex h-20 w-full items-end justify-end border-b border-black/10 p-2"
              >
                <span className="rounded-md bg-black/35 p-1 text-white opacity-0 transition group-hover:opacity-100">
                  <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                </span>
              </div>
              <div className="p-3">
                <p className="text-xs font-bold text-slate-900 dark:text-white">{c.name}</p>
                <p className="font-mono-num text-xs text-[#4F46E5] dark:text-[#22D3EE]">
                  {c.hex.toUpperCase()}
                </p>
                <p className="mt-1 text-[11px] text-slate-500 dark:text-[#94A3B8]">{c.usage}</p>
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* 2. Typography */}
      <section className="space-y-4">
        <h2 className="font-heading text-xl font-bold">02. Typography</h2>
        <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-[#151D30]">
          <div className="border-b border-slate-100 pb-4 dark:border-slate-800">
            <p className="text-xs font-semibold text-[#4F46E5] dark:text-[#22D3EE]">
              Display Heading · Plus Jakarta Sans · ExtraBold
            </p>
            <p className="mt-1 font-heading text-4xl font-extrabold tracking-tight">
              Your Seat. Your Choice. Zero Chaos.
            </p>
          </div>
          <div className="border-b border-slate-100 pb-4 dark:border-slate-800">
            <p className="text-xs font-semibold text-[#4F46E5] dark:text-[#22D3EE]">
              Section Heading · Plus Jakarta Sans · Bold
            </p>
            <p className="mt-1 font-heading text-2xl font-bold">
              Interactive Auditorium Seat Map
            </p>
          </div>
          <div className="border-b border-slate-100 pb-4 dark:border-slate-800">
            <p className="text-xs font-semibold text-[#4F46E5] dark:text-[#22D3EE]">
              Body Copy · Inter · Regular (15–16px, 1.6 line-height)
            </p>
            <p className="mt-1 max-w-2xl text-sm leading-relaxed text-slate-600 dark:text-[#94A3B8]">
              SEATLOCK combines real-time auditorium availability, SeatSense AI recommendations, and
              SeatShield conflict protection so every university event booking feels effortless.
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold text-[#4F46E5] dark:text-[#22D3EE]">
              Tabular Figures &amp; Identifiers · JetBrains Mono
            </p>
            <p className="font-mono-num mt-1 text-lg font-bold">
              SL-2026-9012 · Seats A4, A5 · 04:59 · ₹1,040
            </p>
          </div>
        </div>
      </section>

      {/* 3. Spacing & Live Working Border Radius */}
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-[#151D30]">
          <h2 className="font-heading text-xl font-bold">03. Spacing Tokens</h2>
          <div className="space-y-2.5">
            {SPACING_TOKENS.map((sp) => (
              <button
                key={sp.token}
                type="button"
                onClick={() => void handleCopyHex(sp.token, sp.px)}
                className="flex w-full items-center gap-4 rounded-lg px-2 py-1 text-xs transition hover:bg-slate-100 dark:hover:bg-slate-800/60"
              >
                <span className="font-mono-num w-20 text-left font-semibold text-slate-600 dark:text-[#94A3B8]">
                  {sp.token}
                </span>
                <span className="font-mono-num w-12 text-left text-slate-500">{sp.px}</span>
                <div className={`h-4 rounded bg-[#6366F1] ${sp.className}`} />
              </button>
            ))}
          </div>
        </div>

        {/* LIVE WORKING BORDER RADIUS STUDIO */}
        <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-[#151D30]">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <SquareRoundCorner className="h-5 w-5 text-[#6366F1]" aria-hidden="true" />
              <h2 className="font-heading text-xl font-bold">04. Live Border Radius</h2>
            </div>
            <span className="font-mono-num rounded-lg bg-[#6366F1]/15 px-2.5 py-1 text-xs font-bold text-[#4F46E5] dark:text-[#818CF8]">
              Active: {preferences.borderRadiusPx}px
            </span>
          </div>
          <p className="text-xs text-slate-600 dark:text-[#94A3B8]">
            Click any radius tile or drag the slider below to reshape cards, buttons, modals, and
            inputs live across every page.
          </p>

          <div className="flex flex-wrap gap-3">
            {RADIUS_PRESETS.map((rad) => {
              const isSelected = preferences.borderRadiusPx === rad.px;
              return (
                <button
                  key={rad.id}
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => {
                    setBorderRadiusPx(rad.px);
                    addToast({
                      title: `Border radius set to ${rad.label} (${rad.px}px)`,
                      description: 'All cards, buttons, and panels updated live.',
                      variant: 'success',
                    });
                  }}
                  className="flex flex-col items-center gap-2"
                >
                  <div
                    style={{ borderRadius: `${rad.px}px` }}
                    className={`flex h-16 w-16 flex-col items-center justify-center border-2 font-mono-num text-[11px] font-bold transition ${
                      isSelected
                        ? 'border-[#6366F1] bg-[#6366F1] text-white shadow-md'
                        : 'border-[#6366F1]/60 bg-[#6366F1]/10 text-slate-900 hover:bg-[#6366F1]/20 dark:text-white'
                    }`}
                  >
                    <span>{rad.px}px</span>
                    <span className="text-[9px] font-medium opacity-85">{rad.label}</span>
                  </div>
                  <span className="text-[11px] text-slate-600 dark:text-[#94A3B8]">
                    {rad.token}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-3 pt-1">
            <span className="font-mono-num text-xs text-slate-500">0px</span>
            <input
              type="range"
              min={0}
              max={28}
              step={2}
              aria-label="Global border radius slider"
              value={preferences.borderRadiusPx}
              onChange={(e) => setBorderRadiusPx(Number(e.target.value))}
              className="h-2 flex-1 cursor-pointer accent-[#6366F1]"
            />
            <span className="font-mono-num text-xs text-slate-500">28px</span>
          </div>
        </div>
      </section>

      {/* 4. Buttons & Input Fields */}
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-[#151D30]">
          <h2 className="font-heading text-xl font-bold">05. Interactive Buttons</h2>
          <div className="flex flex-wrap gap-3">
            <Button
              type="button"
              variant="primary"
              onClick={() =>
                addToast({
                  title: 'Primary CTA triggered',
                  description: `Styled with ${activeThemePreset.name} primary accent.`,
                  variant: 'success',
                })
              }
            >
              Primary CTA
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() =>
                addToast({
                  title: 'Secondary AI action triggered',
                  description: 'SeatSense AI action style verified.',
                  variant: 'info',
                })
              }
            >
              Secondary AI
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                addToast({
                  title: 'Outline button clicked',
                  variant: 'info',
                })
              }
            >
              Outline
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() =>
                addToast({
                  title: 'Ghost button clicked',
                  variant: 'info',
                })
              }
            >
              Ghost
            </Button>
            <Button
              type="button"
              variant="danger"
              onClick={() => navigate('/bookings')}
            >
              Manage / Cancel Tickets
            </Button>
            <Button
              type="button"
              variant="primary"
              loading={simLoading}
              onClick={triggerSimulatedHold}
            >
              {simLoading ? 'Holding...' : 'Test Hold State'}
            </Button>
          </div>
        </div>

        <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-[#151D30]">
          <h2 className="font-heading text-xl font-bold">06. Input Fields</h2>
          <div className="space-y-4">
            <InputField
              id="ds-email"
              label="Gmail or University Email"
              placeholder="akash.rana@gmail.com"
              value={demoInput}
              onChange={(e) => setDemoInput(e.target.value)}
              hint="Live border radius & theme styling applied automatically."
            />
            <InputField
              id="ds-error"
              label="Validation Error State"
              defaultValue="invalid-email"
              error="Please enter a valid Gmail or university email address."
            />
          </div>
        </div>
      </section>

      {/* 5. All 6 Accessible Seat States */}
      <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-[#151D30]">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-heading text-xl font-bold">07. Accessible Seat States</h2>
          <span className="text-xs font-semibold text-[#4F46E5] dark:text-[#22D3EE]">
            Inspecting: {selectedSeatPreview}
          </span>
        </div>
        <p className="text-xs text-slate-600 dark:text-[#94A3B8]">
          Click any seat state below to inspect how semantic color pairs with distinct icons for
          WCAG 2.2 AA accessibility.
        </p>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {[
            {
              label: 'Available',
              id: 'A1',
              desc: 'Open for instant selection and 5-minute checkout hold.',
              cls: 'border border-[#10B981]/80 bg-[#10B981]/15 text-emerald-900 dark:text-emerald-200',
              icon: null,
            },
            {
              label: 'Selected',
              id: 'A2',
              desc: 'Chosen by you (up to 4 seats per booking).',
              cls: 'border-2 border-[#6366F1] bg-[#6366F1] text-white',
              icon: <Check className="h-3.5 w-3.5" aria-hidden="true" />,
            },
            {
              label: 'Held',
              id: 'A3',
              desc: 'Temporarily locked during a 5-minute checkout timer.',
              cls: 'border border-[#F59E0B]/70 bg-[#F59E0B]/15 text-amber-800 dark:text-amber-300',
              icon: <Clock className="h-3 w-3" aria-hidden="true" />,
            },
            {
              label: 'Booked',
              id: 'A4',
              desc: 'Confirmed ticket — releases automatically if cancelled within 2h.',
              cls: 'border border-[#EF4444]/60 bg-[#EF4444]/15 text-red-700 dark:text-red-300',
              icon: <X className="h-3 w-3" aria-hidden="true" />,
            },
            {
              label: 'Blocked',
              id: 'A5',
              desc: 'Reserved for venue production, cameras, or accessibility buffer.',
              cls: 'border border-slate-400/50 bg-slate-300/40 text-slate-500 dark:border-slate-700 dark:bg-slate-800',
              icon: <Ban className="h-3 w-3" aria-hidden="true" />,
            },
            {
              label: 'AI Pick',
              id: 'A6',
              desc: 'Recommended by SeatSense AI for sightline & budget value.',
              cls: 'border border-[#10B981]/80 bg-[#10B981]/15 text-emerald-900 dark:text-emerald-200 ring-2 ring-[#8B5CF6] ring-offset-2 ring-offset-white dark:ring-offset-[#151D30]',
              icon: <Sparkles className="h-3 w-3 text-[#8B5CF6] dark:text-[#C4B5FD]" aria-hidden="true" />,
            },
          ].map((s) => (
            <button
              key={s.label}
              type="button"
              onClick={() => {
                setSelectedSeatPreview(`${s.label} (${s.id}) — ${s.desc}`);
                addToast({ title: `Seat State: ${s.label}`, description: s.desc, variant: 'info' });
              }}
              className={`flex flex-col items-center gap-2 rounded-xl border p-4 transition ${
                selectedSeatPreview.startsWith(s.label)
                  ? 'border-[#6366F1] bg-[#6366F1]/5'
                  : 'border-slate-200 hover:border-[#6366F1]/50 dark:border-slate-800'
              }`}
            >
              <div
                className={`flex h-11 w-11 flex-col items-center justify-center rounded-xl font-mono-num text-[11px] font-bold ${s.cls}`}
              >
                <span>{s.id}</span>
                {s.icon}
              </div>
              <span className="text-xs font-semibold">{s.label}</span>
            </button>
          ))}
        </div>
      </section>

      {/* 6. Loading Indicators, Toasts & Modal */}
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-[#151D30]">
          <h2 className="font-heading text-lg font-bold">08. Loading States</h2>
          <div className="flex items-center gap-4">
            <Loader2 className="h-6 w-6 animate-spin text-[#6366F1]" aria-hidden="true" />
            <div className="flex-1 space-y-2">
              <div className="h-3 w-3/4 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
              <div className="h-3 w-1/2 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
            </div>
          </div>
        </div>

        <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-[#151D30]">
          <h2 className="font-heading text-lg font-bold">09. Toast Notifications</h2>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              onClick={() =>
                addToast({
                  title: 'Seats held for 5 minutes',
                  description: 'A4 & A5 locked for checkout.',
                  variant: 'success',
                })
              }
            >
              Success
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() =>
                addToast({
                  title: 'SeatShield Alert',
                  description: 'Seat A5 was reserved; A6 suggested.',
                  variant: 'warning',
                })
              }
            >
              Warning
            </Button>
            <Button
              type="button"
              size="sm"
              variant="danger"
              onClick={() =>
                addToast({
                  title: 'Hold Expired',
                  description: 'Please re-select available seats.',
                  variant: 'error',
                })
              }
            >
              Error
            </Button>
          </div>
        </div>

        <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-[#151D30]">
          <h2 className="font-heading text-lg font-bold">10. Accessible Modal</h2>
          <p className="text-xs text-slate-600 dark:text-[#94A3B8]">
            Focus-trapped dialog with Escape close and automatic focus restoration.
          </p>
          <Button type="button" variant="secondary" onClick={() => setModalOpen(true)}>
            Open Sample Modal
          </Button>
        </div>
      </section>

      {/* 7. Live Event Card & Theme Specimens */}
      <section className="space-y-4">
        <h2 className="font-heading text-xl font-bold">
          11. Live Event Card &amp; Quick Theme Switchers
        </h2>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <EventCard
            event={featuredEvent}
            isFavorite={isFeaturedFav}
            onToggleFavorite={() => {
              toggleFavorite(featuredEvent.id, featuredEvent.category);
              addToast({
                title: isFeaturedFav ? 'Removed from favorites' : 'Saved to favorites',
                description: featuredEvent.title,
                variant: 'info',
              });
            }}
            onShare={async () => {
              const url = `${window.location.origin}/events/${featuredEvent.id}`;
              try {
                await navigator.clipboard?.writeText(url);
              } catch {
                // ignore
              }
              addToast({
                title: 'Event link copied',
                description: url,
                variant: 'success',
              });
            }}
            onSelect={() => navigate(`/events/${featuredEvent.id}`)}
          />

          <button
            type="button"
            onClick={() => setThemePreset('emerald-forest')}
            className="rounded-2xl border border-emerald-500/30 bg-[#061511] p-6 text-left text-[#ECFDF5] transition hover:border-emerald-400"
          >
            <p className="text-xs font-semibold text-[#34D399]">Emerald Forest (Click to Apply)</p>
            <h3 className="mt-2 font-heading text-lg font-bold">Botanical Night Surface</h3>
            <p className="mt-1.5 text-xs leading-relaxed text-[#A7F3D0]/80">
              Deep evergreen canvas #061511 paired with #0D2620 card containers and crisp jade
              accents.
            </p>
            <div className="mt-4 rounded-xl border border-emerald-500/20 bg-[#0D2620] p-4">
              <span className="font-mono-num text-sm font-bold text-[#34D399]">
                Orchestra Front · ₹520
              </span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setThemePreset('nordic-sand')}
            className="rounded-2xl border border-stone-300 bg-[#F4F1EA] p-6 text-left text-[#1C1917] transition hover:border-teal-700"
          >
            <p className="text-xs font-semibold text-[#0F766E]">Nordic Sand (Click to Apply)</p>
            <h3 className="mt-2 font-heading text-lg font-bold">Warm Editorial Paper</h3>
            <p className="mt-1.5 text-xs leading-relaxed text-[#57534E]">
              Warm sand canvas #F4F1EA paired with ivory #FFFDF8 cards and deep pine-teal primary
              actions.
            </p>
            <div className="mt-4 rounded-xl border border-stone-200 bg-[#FFFDF8] p-4">
              <span className="font-mono-num text-sm font-bold text-[#0F766E]">
                Orchestra Front · ₹520
              </span>
            </div>
          </button>
        </div>
      </section>

      <AccessibleModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Accessible SEATLOCK Dialog"
        description="Notice how this dialog automatically inherits your active theme, background colour, and live border radius!"
      >
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={() => {
              setModalOpen(false);
              addToast({ title: 'Dialog confirmed', variant: 'success' });
            }}
          >
            Confirm
          </Button>
        </div>
      </AccessibleModal>
    </div>
  );
}
