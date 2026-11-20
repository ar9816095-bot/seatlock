import { Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { usePreferences } from '../context/PreferencesContext';

export type BookingStepIndex = 0 | 1 | 2 | 3;

interface BookingStepperProps {
  currentStep: BookingStepIndex;
  eventId?: string;
}

export function BookingStepper({ currentStep, eventId }: BookingStepperProps) {
  const { t } = usePreferences();
  const navigate = useNavigate();

  const steps = [
    { index: 0 as const, label: t.stepDiscover, path: '/events' },
    {
      index: 1 as const,
      label: t.stepSelect,
      path: eventId ? `/events/${eventId}` : null,
    },
    { index: 2 as const, label: t.stepCheckout, path: null },
    { index: 3 as const, label: t.stepTicket, path: null },
  ];

  return (
    <nav
      aria-label="Booking progress"
      className="no-print mb-6 rounded-2xl border border-slate-200/90 bg-white/85 px-4 py-3 backdrop-blur-sm dark:border-slate-800 dark:bg-[#151D30]/85"
    >
      <ol className="flex items-center justify-between gap-2">
        {steps.map((step, idx) => {
          const isCompleted = step.index < currentStep;
          const isCurrent = step.index === currentStep;
          // Only allow navigating backwards to valid completed steps (never skip ahead)
          const canNavigateBack = isCompleted && step.path !== null && currentStep < 3;

          return (
            <li key={step.index} className="flex flex-1 items-center last:flex-none">
              <div className="flex items-center gap-2.5">
                {canNavigateBack ? (
                  <button
                    type="button"
                    onClick={() => step.path && navigate(step.path)}
                    className="flex items-center gap-2 rounded-lg text-left transition hover:opacity-80"
                    aria-label={`Return to ${step.label}`}
                  >
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#10B981] text-white">
                      <Check className="h-4 w-4" aria-hidden="true" />
                    </span>
                    <span className="hidden text-xs font-semibold text-slate-700 dark:text-slate-200 sm:inline">
                      {step.label}
                    </span>
                  </button>
                ) : (
                  <div
                    aria-current={isCurrent ? 'step' : undefined}
                    className="flex items-center gap-2"
                  >
                    <span
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold tabular-nums transition-colors ${
                        isCompleted
                          ? 'bg-[#10B981] text-white'
                          : isCurrent
                            ? 'bg-[#6366F1] text-white ring-4 ring-[#6366F1]/20'
                            : 'border border-slate-300 bg-slate-100 text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400'
                      }`}
                    >
                      {isCompleted ? (
                        <Check className="h-4 w-4" aria-hidden="true" />
                      ) : (
                        step.index + 1
                      )}
                    </span>
                    <span
                      className={`text-xs font-semibold whitespace-nowrap ${
                        isCurrent
                          ? 'text-[#4F46E5] dark:text-[#818CF8]'
                          : isCompleted
                            ? 'hidden text-slate-700 dark:text-slate-300 sm:inline'
                            : 'hidden text-slate-500 dark:text-slate-400 sm:inline'
                      }`}
                    >
                      {step.label}
                    </span>
                  </div>
                )}
              </div>

              {idx < steps.length - 1 && (
                <div
                  aria-hidden="true"
                  className={`mx-2 h-0.5 flex-1 rounded-full transition-colors sm:mx-3 ${
                    step.index < currentStep
                      ? 'bg-[#10B981]'
                      : 'bg-slate-200 dark:bg-slate-800'
                  }`}
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
