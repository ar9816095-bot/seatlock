import { ArrowRight, ShieldAlert, X } from 'lucide-react';
import { usePreferences } from '../../context/PreferencesContext';
import type { SeatConflict } from '../../types';
import { Button } from '../FormControls';

interface SeatShieldBannerProps {
  conflicts: SeatConflict[];
  onSwitchAlternative: (conflict: SeatConflict) => void;
  onDismiss: (conflictId: string) => void;
}

export function SeatShieldBanner({
  conflicts,
  onSwitchAlternative,
  onDismiss,
}: SeatShieldBannerProps) {
  const { t } = usePreferences();

  if (conflicts.length === 0) return null;

  return (
    <section
      role="alert"
      aria-label={t.seatShieldTitle}
      className="space-y-3 rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4 text-slate-900 dark:text-[#F8FAFC]"
    >
      <div className="flex items-center gap-2 text-sm font-bold text-amber-800 dark:text-amber-300">
        <ShieldAlert className="h-5 w-5 shrink-0" aria-hidden="true" />
        <span>{t.seatShieldTitle}</span>
      </div>

      <div className="space-y-3">
        {conflicts.map((conflict) => (
          <div
            key={conflict.id}
            className="rounded-xl border border-amber-500/30 bg-white p-4 dark:bg-[#151D30]"
          >
            <div className="flex items-start justify-between gap-3">
              <p className="text-sm font-medium leading-relaxed text-slate-800 dark:text-slate-100">
                {conflict.message}
              </p>
              <button
                type="button"
                onClick={() => onDismiss(conflict.id)}
                aria-label={`Dismiss conflict warning for seat ${conflict.originalSeat.id}`}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Side-by-side comparison */}
            <div className="mt-3 grid grid-cols-1 items-center gap-3 sm:grid-cols-[1fr_auto_1fr]">
              <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-3">
                <p className="text-[11px] font-semibold text-red-600 dark:text-red-400">
                  Unavailable Original
                </p>
                <p className="font-mono-num mt-0.5 text-base font-bold line-through opacity-75">
                  Seat {conflict.originalSeat.id} · ₹{conflict.originalSeat.price}
                </p>
                <p className="text-xs text-slate-500 dark:text-[#94A3B8]">
                  {conflict.originalSeat.section}
                </p>
              </div>

              <div className="hidden justify-center sm:flex">
                <ArrowRight className="h-5 w-5 text-amber-500" aria-hidden="true" />
              </div>

              {conflict.alternativeSeat ? (
                <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-3">
                  <p className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
                    Nearby Alternative Available
                  </p>
                  <p className="font-mono-num mt-0.5 text-base font-bold text-slate-900 dark:text-white">
                    Seat {conflict.alternativeSeat.id} · ₹{conflict.alternativeSeat.price}
                  </p>
                  <p className="text-xs text-slate-600 dark:text-[#94A3B8]">
                    {conflict.alternativeSeat.section} · View {conflict.alternativeSeat.viewScore}%
                  </p>
                </div>
              ) : (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-300">
                  No nearby single seat available. Pick another open seat from the map.
                </div>
              )}
            </div>

            {conflict.alternativeSeat && (
              <div className="mt-3 flex flex-wrap items-center justify-end gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => onDismiss(conflict.id)}
                >
                  Skip
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="primary"
                  onClick={() => onSwitchAlternative(conflict)}
                >
                  {t.switchToAlternative} ({conflict.alternativeSeat.id})
                </Button>
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
