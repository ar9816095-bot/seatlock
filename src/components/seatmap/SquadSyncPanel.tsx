import { useState } from 'react';
import { Check, Sparkles, Users } from 'lucide-react';
import { usePreferences } from '../../context/PreferencesContext';
import { ApiError, seatlockApi } from '../../services/api';
import type { AiRecommendation, Seat, SeatSection, SquadSyncCriteria } from '../../types';
import { AccessibleModal } from '../AccessibleModal';
import { Button } from '../FormControls';

interface SquadSyncPanelProps {
  open: boolean;
  onClose: () => void;
  eventId: string;
  seats: Seat[];
  maxSeatPrice: number;
  onHighlight: (seatIds: string[]) => void;
  onApplySeats: (seatIds: string[]) => void;
}

export function SquadSyncPanel({
  open,
  onClose,
  eventId,
  seats,
  maxSeatPrice,
  onHighlight,
  onApplySeats,
}: SquadSyncPanelProps) {
  const { t } = usePreferences();
  const [criteria, setCriteria] = useState<SquadSyncCriteria>({
    peopleCount: 3,
    maxBudgetPerPerson: maxSeatPrice,
    preferredSection: 'Any',
    nearStage: false,
    bestView: true,
    cheapest: false,
    aislePreferred: false,
    adjacentPreferred: true,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [results, setResults] = useState<AiRecommendation[]>([]);

  const handleFindSquad = async () => {
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const response = await seatlockApi.requestAiAssist({
        eventId,
        prompt: `SquadSync group search for ${criteria.peopleCount} people under ₹${criteria.maxBudgetPerPerson}`,
        seats,
        squadCriteria: criteria,
      });
      setResults(response.recommendations);
      setMessage(response.message);
      if (response.recommendations[0]) {
        onHighlight(response.recommendations[0].seatIds);
      }
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : 'SquadSync could not evaluate group options right now.'
      );
    } finally {
      setLoading(false);
    }
  };

  const sections: (SeatSection | 'Any')[] = [
    'Any',
    'Orchestra Front',
    'Mezzanine Center',
    'Balcony',
  ];

  return (
    <AccessibleModal
      open={open}
      onClose={onClose}
      title={t.squadSyncTitle}
      description="Find verified adjacent group seats matched to your squad size, budget, and sightline preferences."
      maxWidthClass="max-w-2xl"
    >
      <div className="space-y-5">
        {/* Number of People (1–4) */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <span className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Number of People (1–4)
            </span>
            <div className="mt-2 grid grid-cols-4 gap-2">
              {[1, 2, 3, 4].map((num) => (
                <button
                  key={num}
                  type="button"
                  aria-pressed={criteria.peopleCount === num}
                  onClick={() => setCriteria((c) => ({ ...c, peopleCount: num }))}
                  className={`min-h-[44px] rounded-xl border font-mono-num text-sm font-bold transition ${
                    criteria.peopleCount === num
                      ? 'border-[#6366F1] bg-[#6366F1] text-white'
                      : 'border-slate-200 bg-slate-50 text-slate-800 hover:border-[#6366F1] dark:border-slate-700 dark:bg-[#090E1C] dark:text-slate-200'
                  }`}
                >
                  {num}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label
              htmlFor="squad-budget"
              className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300"
            >
              <span>Max Budget / Person</span>
              <span className="font-mono-num text-sm font-bold text-[#4F46E5] dark:text-[#22D3EE]">
                ₹{criteria.maxBudgetPerPerson}
              </span>
            </label>
            <input
              id="squad-budget"
              type="range"
              min={120}
              max={Math.max(600, maxSeatPrice)}
              step={10}
              value={criteria.maxBudgetPerPerson}
              onChange={(e) =>
                setCriteria((c) => ({ ...c, maxBudgetPerPerson: Number(e.target.value) }))
              }
              className="mt-3.5 h-2 w-full cursor-pointer accent-[#6366F1]"
            />
          </div>
        </div>

        {/* Section Selector */}
        <div>
          <span className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
            Preferred Section
          </span>
          <div className="mt-2 flex flex-wrap gap-2">
            {sections.map((sec) => (
              <button
                key={sec}
                type="button"
                aria-pressed={criteria.preferredSection === sec}
                onClick={() => setCriteria((c) => ({ ...c, preferredSection: sec }))}
                className={`min-h-[40px] rounded-xl border px-3.5 text-xs font-semibold transition ${
                  criteria.preferredSection === sec
                    ? 'border-[#6366F1] bg-[#6366F1]/15 text-[#4F46E5] dark:text-[#818CF8]'
                    : 'border-slate-200 text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800'
                }`}
              >
                {sec}
              </button>
            ))}
          </div>
        </div>

        {/* Seating Preferences Toggles */}
        <div>
          <span className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
            Seating Priorities
          </span>
          <div className="mt-2 flex flex-wrap gap-2">
            {(
              [
                ['adjacentPreferred', 'Adjacent Seats Together'],
                ['nearStage', 'Near Stage'],
                ['bestView', 'Best View'],
                ['cheapest', 'Cheapest Seats'],
                ['aislePreferred', 'Aisle Access'],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                aria-pressed={criteria[key]}
                onClick={() => setCriteria((c) => ({ ...c, [key]: !c[key] }))}
                className={`min-h-[40px] rounded-xl border px-3.5 text-xs font-semibold transition ${
                  criteria[key]
                    ? 'border-[#8B5CF6] bg-[#8B5CF6]/15 text-[#6D28D9] dark:text-violet-300'
                    : 'border-slate-200 text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex justify-end">
          <Button type="button" loading={loading} onClick={() => void handleFindSquad()}>
            <Users className="h-4 w-4" aria-hidden="true" />
            <span>Find Squad Seats</span>
          </Button>
        </div>

        {error && (
          <p role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-700 dark:text-red-300">
            {error}
          </p>
        )}

        {message && (
          <div className="space-y-3 border-t border-slate-200 pt-4 dark:border-slate-800">
            <p className="flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-[#94A3B8]">
              <Sparkles className="h-3.5 w-3.5 text-[#8B5CF6]" aria-hidden="true" />
              <span>{message}</span>
            </p>

            {results.map((rec) => (
              <div
                key={rec.id}
                className="rounded-xl border border-violet-500/30 bg-violet-500/5 p-4 dark:bg-violet-500/10"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-bold text-slate-900 dark:text-white">{rec.label}</p>
                    <p className="text-xs text-slate-600 dark:text-[#94A3B8]">{rec.reason}</p>
                  </div>
                  <span className="font-mono-num text-base font-extrabold text-[#4F46E5] dark:text-[#22D3EE]">
                    ₹{rec.totalPrice}
                  </span>
                </div>

                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  {rec.seats.map((s) => (
                    <span
                      key={s.id}
                      className="font-mono-num rounded-lg border border-violet-500/40 bg-white px-2.5 py-1 text-xs font-bold dark:bg-[#090E1C]"
                    >
                      {s.id} · ₹{s.price}
                    </span>
                  ))}
                </div>

                {rec.warningNote && (
                  <p className="mt-2 text-xs font-medium text-amber-700 dark:text-amber-300">
                    {rec.warningNote}
                  </p>
                )}

                <div className="mt-3 flex justify-end gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="primary"
                    onClick={() => {
                      onApplySeats(rec.seatIds);
                      onClose();
                    }}
                  >
                    <Check className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>{t.useTheseSeats}</span>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AccessibleModal>
  );
}
