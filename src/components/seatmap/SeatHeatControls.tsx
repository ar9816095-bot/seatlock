import { Eye, Flame, Sparkles } from 'lucide-react';
import { usePreferences } from '../../context/PreferencesContext';
import type { SeatViewMode } from '../../types';
import type { PriceTierThresholds } from '../../utils/seatLogic';

interface SeatHeatControlsProps {
  mode: SeatViewMode;
  onChangeMode: (mode: SeatViewMode) => void;
  thresholds: PriceTierThresholds;
  recommendedCount: number;
}

export function SeatHeatControls({
  mode,
  onChangeMode,
  thresholds,
  recommendedCount,
}: SeatHeatControlsProps) {
  const { t } = usePreferences();

  const modes: { id: SeatViewMode; label: string; Icon: typeof Eye }[] = [
    { id: 'availability', label: t.availabilityView, Icon: Eye },
    { id: 'heatmap', label: t.priceHeatmap, Icon: Flame },
    { id: 'ai', label: t.aiRecommendedView, Icon: Sparkles },
  ];

  return (
    <div className="space-y-3">
      <div
        role="tablist"
        aria-label="SeatHeat viewing modes"
        className="flex flex-wrap items-center gap-1.5 rounded-2xl border border-slate-200 bg-slate-100/80 p-1.5 dark:border-slate-800 dark:bg-[#090E1C]"
      >
        {modes.map(({ id, label, Icon }) => {
          const active = mode === id;
          return (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onChangeMode(id)}
              className={`flex min-h-[40px] flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-xl px-3.5 py-2 text-xs font-semibold transition sm:flex-none sm:text-sm ${
                active
                  ? 'bg-white text-[#4F46E5] shadow-sm dark:bg-[#151D30] dark:text-[#22D3EE]'
                  : 'text-slate-600 hover:text-slate-900 dark:text-[#94A3B8] dark:hover:text-[#F8FAFC]'
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>{label}</span>
              {id === 'ai' && recommendedCount > 0 && (
                <span className="font-mono-num text-xs opacity-80">({recommendedCount})</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Mode-specific Legend */}
      {mode === 'heatmap' ? (
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-slate-600 dark:text-[#94A3B8]">
          <span className="font-semibold text-slate-800 dark:text-slate-200">
            SeatHeat Price Tiers:
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="h-3.5 w-3.5 rounded border border-cyan-500 bg-cyan-500/25" />
            <span>
              Budget (≤ ₹{thresholds.budgetMax})
            </span>
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="h-3.5 w-3.5 rounded border border-indigo-500 bg-indigo-500/25" />
            <span>
              Mid-range (₹{thresholds.budgetMax + 1}–₹{thresholds.midMax})
            </span>
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="h-3.5 w-3.5 rounded border border-violet-500 bg-violet-500/30" />
            <span>
              Premium (≥ ₹{thresholds.midMax + 1})
            </span>
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="h-3.5 w-3.5 rounded border border-red-500/70 bg-red-500/20" />
            <span>Unavailable (Held / Booked / Blocked)</span>
          </span>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-600 dark:text-[#94A3B8]">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-3.5 w-3.5 rounded border border-[#10B981] bg-[#10B981]/20" />
            <span>Available</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-3.5 w-3.5 rounded border border-[#6366F1] bg-[#6366F1]" />
            <span>Selected</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-3.5 w-3.5 rounded border border-[#F59E0B] bg-[#F59E0B]/20" />
            <span>Held</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-3.5 w-3.5 rounded border border-[#EF4444] bg-[#EF4444]/20" />
            <span>Booked</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-3.5 w-3.5 rounded border border-slate-400 bg-slate-400/20" />
            <span>Blocked</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-3.5 w-3.5 rounded border-2 border-[#8B5CF6] bg-[#8B5CF6]/15" />
            <span>AI Recommended</span>
          </span>
        </div>
      )}
    </div>
  );
}
