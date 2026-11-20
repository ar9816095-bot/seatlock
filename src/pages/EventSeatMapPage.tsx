import {
  startTransition,
  Suspense,
  use,
  useActionState,
  useCallback,
  useEffect,
  useMemo,
  useOptimistic,
  useRef,
  useState,
} from 'react';
import {
  ArrowLeft,
  Bot,
  Calendar,
  Clock,
  Lock,
  MapPin,
  RefreshCw,
  ShieldAlert,
  Sparkles,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { usePreferences } from '../context/PreferencesContext';
import { useToast } from '../context/ToastContext';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { ApiError, seatlockApi } from '../services/api';
import {
  getEventSeatMapResource,
  invalidateEventSeatMapResource,
} from '../services/resources';
import type {
  EventItem,
  EventSeatsResponse,
  Seat,
  SeatConflict,
  SeatViewMode,
} from '../types';
import {
  calculateTotalPrice,
  computePriceTierThresholds,
  detectSeatConflicts,
  MAX_SEATS_PER_BOOKING,
  toggleSeatSelection,
} from '../utils/seatLogic';
import { BookingStepper } from '../components/BookingStepper';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { EventPoster } from '../components/EventPoster';
import { Button, SubmitButton } from '../components/FormControls';
import { SeatMapSkeleton } from '../components/Skeletons';
import { AuditoriumSeatMap } from '../components/seatmap/AuditoriumSeatMap';
import { SeatHeatControls } from '../components/seatmap/SeatHeatControls';
import { SeatSensePanel } from '../components/seatmap/SeatSensePanel';
import { SeatShieldBanner } from '../components/seatmap/SeatShieldBanner';
import { SquadSyncPanel } from '../components/seatmap/SquadSyncPanel';

interface HoldActionState {
  error?: string;
}

function SeatMapWorkspace({
  bundlePromise,
}: {
  bundlePromise: Promise<{ event: EventItem; seatsResponse: EventSeatsResponse }>;
}) {
  // React 19 `use()` reads initial event & seat map through Suspense
  const { event, seatsResponse } = use(bundlePromise);

  const { setActiveHold } = useAuth();
  const { t, recordRecentlyViewed } = usePreferences();
  const { addToast } = useToast();
  const isOnline = useOnlineStatus();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [seats, setSeats] = useState<Seat[]>(seatsResponse.seats);
  const [lastSyncedAt, setLastSyncedAt] = useState<string>(seatsResponse.updatedAt);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [selectedSeatIds, setSelectedSeatIds] = useState<string[]>([]);
  // React 19 `useOptimistic` for instantaneous optimistic seat toggle feedback
  const [optimisticSeatIds, setOptimisticSeatIds] = useOptimistic<string[], string[]>(
    selectedSeatIds,
    (_current, nextIds) => nextIds
  );

  const [viewMode, setViewMode] = useState<SeatViewMode>('availability');
  const [aiRecommendedIds, setAiRecommendedIds] = useState<string[]>([]);
  const [conflicts, setConflicts] = useState<SeatConflict[]>([]);
  const [squadOpen, setSquadOpen] = useState(false);
  const [mobileAiOpen, setMobileAiOpen] = useState(searchParams.get('ai') === '1');

  const seatsRef = useRef(seats);
  seatsRef.current = seats;
  const selectedRef = useRef(selectedSeatIds);
  selectedRef.current = selectedSeatIds;

  // Track recently viewed event in preferences
  useEffect(() => {
    recordRecentlyViewed(event.id, event.category);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event.id]);

  // Apply fresh seat snapshot & run SeatShield conflict detection
  const applyRefreshedSeats = useCallback(
    (freshSeats: Seat[], updatedAt: string) => {
      const prevSeats = seatsRef.current;
      const currentSelected = selectedRef.current;

      if (currentSelected.length > 0) {
        const { remainingValidSeatIds, conflicts: found } = detectSeatConflicts(
          currentSelected,
          prevSeats,
          freshSeats
        );
        if (found.length > 0) {
          setSelectedSeatIds(remainingValidSeatIds);
          setConflicts((prev) => [...found, ...prev].slice(0, 4));
          addToast({
            title: 'SeatShield detected a conflict',
            description: found[0].message,
            variant: 'warning',
          });
        }
      }

      setSeats(freshSeats);
      setLastSyncedAt(updatedAt);
    },
    [addToast]
  );

  const refreshSeats = useCallback(async () => {
    if (!isOnline) return;
    setIsRefreshing(true);
    try {
      const res = await seatlockApi.getEventSeats(event.id);
      applyRefreshedSeats(res.seats, res.updatedAt);
    } catch {
      // Keep manual selection usable; surface gentle warning only on explicit refresh
    } finally {
      setIsRefreshing(false);
    }
  }, [applyRefreshedSeats, event.id, isOnline]);

  // Automatic periodic availability refresh every 8 seconds + immediate refresh on reconnect
  useEffect(() => {
    if (!isOnline) return;
    const interval = window.setInterval(() => {
      void refreshSeats();
    }, 8000);
    return () => window.clearInterval(interval);
  }, [isOnline, refreshSeats]);

  // Trigger a deterministic concurrent conflict in Local Demo Mode so judges can test SeatShield
  const handleSimulateConflict = () => {
    const targetId = selectedSeatIds[selectedSeatIds.length - 1];
    if (!targetId) {
      addToast({
        title: 'Select at least 1 seat first',
        description: 'Pick one or more seats on the map, then simulate a live SeatShield conflict.',
        variant: 'info',
      });
      return;
    }
    const updatedSeats = seatlockApi.simulateConcurrentReservation(event.id, targetId);
    applyRefreshedSeats(updatedSeats, new Date().toISOString());
  };

  const handleToggleSeat = (seat: Seat) => {
    const result = toggleSeatSelection(optimisticSeatIds, seat);

    if (result.errorCode === 'UNAVAILABLE') {
      addToast({
        title: `Seat ${seat.id} unavailable`,
        description: t.unavailableSeatDesc,
        variant: 'warning',
      });
      return;
    }

    if (result.errorCode === 'MAX_LIMIT') {
      addToast({
        title: t.maxFourSeatsTitle,
        description: t.maxFourSeatsDesc,
        variant: 'warning',
      });
      return;
    }

    startTransition(() => {
      setOptimisticSeatIds(result.nextSeatIds);
      setSelectedSeatIds(result.nextSeatIds);
    });
  };

  const handleApplyAiSeats = (recommendedIds: string[]) => {
    const seatMap = new Map(seats.map((s) => [s.id, s]));
    const stillValid = recommendedIds
      .filter((id) => seatMap.get(id)?.status === 'available')
      .slice(0, MAX_SEATS_PER_BOOKING);

    if (stillValid.length === 0) {
      addToast({
        title: 'Recommended seats just changed',
        description: 'Those seats are no longer open. Ask SeatSense AI to regenerate fresh picks.',
        variant: 'warning',
      });
      void refreshSeats();
      return;
    }

    startTransition(() => {
      setOptimisticSeatIds(stillValid);
      setSelectedSeatIds(stillValid);
    });
    setAiRecommendedIds(stillValid);
    setMobileAiOpen(false);
    addToast({
      title: 'AI seats applied to selection',
      description: `Selected ${stillValid.join(', ')}. Click "Hold Seats" when ready for checkout.`,
      variant: 'success',
    });
  };

  const handleSwitchAlternative = async (conflict: SeatConflict) => {
    const alt = conflict.alternativeSeat;
    if (!alt) return;

    // Revalidate availability before applying replacement
    try {
      const fresh = await seatlockApi.getEventSeats(event.id);
      const liveAlt = fresh.seats.find((s) => s.id === alt.id);
      setSeats(fresh.seats);
      setLastSyncedAt(fresh.updatedAt);

      if (!liveAlt || liveAlt.status !== 'available') {
        addToast({
          title: `Seat ${alt.id} is no longer available`,
          description: 'Please choose another green available seat from the updated map.',
          variant: 'error',
        });
        setConflicts((prev) => prev.filter((c) => c.id !== conflict.id));
        return;
      }

      const currentIds = selectedRef.current;
      if (currentIds.length >= MAX_SEATS_PER_BOOKING) {
        addToast({
          title: t.maxFourSeatsTitle,
          description: t.maxFourSeatsDesc,
          variant: 'warning',
        });
        return;
      }

      const next = Array.from(new Set([...currentIds, liveAlt.id]));
      selectedRef.current = next;
      setSelectedSeatIds(next);
      setConflicts((prev) => prev.filter((c) => c.id !== conflict.id));
      addToast({
        title: `Switched to Seat ${liveAlt.id}`,
        description: `${liveAlt.section} · ₹${liveAlt.price} added to your selection.`,
        variant: 'success',
      });
    } catch {
      addToast({
        title: 'Could not verify replacement seat',
        description: 'Check your connection and retry.',
        variant: 'error',
      });
    }
  };

  // React 19 `useActionState` for explicit POST /events/:id/hold
  const [holdState, holdFormAction] = useActionState<HoldActionState, FormData>(async () => {
    if (!isOnline) {
      return { error: t.offlineBookingDisabled };
    }
    const idsToHold = selectedRef.current;
    if (idsToHold.length === 0) {
      return { error: 'Please select at least 1 seat before holding.' };
    }

    try {
      const hold = await seatlockApi.holdSeats(event.id, idsToHold);
      setActiveHold(hold);
      invalidateEventSeatMapResource(event.id);
      addToast({
        title: 'Seats held for 5 minutes',
        description: `Reserved ${hold.seatIds.join(', ')}. Complete checkout before the timer expires.`,
        variant: 'success',
      });
      navigate('/checkout');
      return {};
    } catch (err) {
      if (err instanceof ApiError && err.code === 'SEAT_CONFLICT') {
        const fresh = await seatlockApi.getEventSeats(event.id);
        applyRefreshedSeats(fresh.seats, fresh.updatedAt);
        return { error: err.message };
      }
      return {
        error:
          err instanceof ApiError
            ? err.message
            : 'Could not hold seats right now. Please try again.',
      };
    }
  }, {});

  const thresholds = useMemo(() => computePriceTierThresholds(seats), [seats]);
  const totalPrice = useMemo(
    () => calculateTotalPrice(seats, optimisticSeatIds),
    [seats, optimisticSeatIds]
  );
  const selectedSeatObjects = useMemo(
    () =>
      optimisticSeatIds
        .map((id) => seats.find((s) => s.id === id))
        .filter((s): s is Seat => Boolean(s)),
    [seats, optimisticSeatIds]
  );
  const availableCount = useMemo(
    () => seats.filter((s) => s.status === 'available').length,
    [seats]
  );

  return (
    <div className="space-y-6 pb-24 lg:pb-8">
      <title>{event.title} — Seat Map | SEATLOCK UI</title>
      <meta
        name="description"
        content={`Select seats for ${event.title} at ${event.venue} with interactive SeatHeat and SeatSense AI.`}
      />

      <BookingStepper currentStep={1} eventId={event.id} />

      {/* Event Banner */}
      <section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-[#090E1C] text-white dark:border-slate-800">
        <div className="absolute inset-0">
          <EventPoster
            src={event.posterUrl}
            alt={`${event.title} stage banner`}
            title={event.title}
            priority
            className="h-full w-full opacity-40"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#090E1C] via-[#090E1C]/85 to-[#090E1C]/40" />
        </div>

        <div className="relative flex flex-col justify-between gap-4 p-5 sm:flex-row sm:items-end sm:p-7">
          <div className="space-y-2">
            <Link
              to="/events"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-300 hover:text-white"
            >
              <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Back to Explore Events</span>
            </Link>
            <h1 className="font-heading text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
              {event.title}
            </h1>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-slate-300">
              <span>{event.category}</span>
              <span aria-hidden="true">·</span>
              <span className="inline-flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5 text-[#22D3EE]" aria-hidden="true" />
                {new Date(event.date).toLocaleDateString(undefined, {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                })}
              </span>
              <span className="inline-flex items-center gap-1">
                <Clock className="h-3.5 w-3.5 text-[#22D3EE]" aria-hidden="true" />
                {event.time}
              </span>
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5 text-[#22D3EE]" aria-hidden="true" />
                {event.venue} ({event.hall})
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setSquadOpen(true)}
              className="border-white/20 bg-white/10 text-white hover:bg-white/20 dark:border-white/20 dark:bg-white/10"
            >
              <Users className="h-4 w-4 text-[#22D3EE]" aria-hidden="true" />
              <span>SquadSync</span>
            </Button>

            {seatlockApi.isDemoMode && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={handleSimulateConflict}
                className="border-amber-400/40 bg-amber-500/15 text-amber-200 hover:bg-amber-500/25 dark:border-amber-400/40 dark:bg-amber-500/15"
              >
                <ShieldAlert className="h-4 w-4" aria-hidden="true" />
                <span>Test SeatShield</span>
              </Button>
            )}

            <button
              type="button"
              onClick={() => void refreshSeats()}
              disabled={!isOnline || isRefreshing}
              aria-label="Refresh live seat availability"
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/20 bg-white/10 text-white transition hover:bg-white/20 disabled:opacity-50"
            >
              <RefreshCw
                className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`}
                aria-hidden="true"
              />
            </button>
          </div>
        </div>
      </section>

      {/* SeatShield Conflict Recovery Banner */}
      <SeatShieldBanner
        conflicts={conflicts}
        onSwitchAlternative={(c) => void handleSwitchAlternative(c)}
        onDismiss={(id) => setConflicts((prev) => prev.filter((c) => c.id !== id))}
      />

      {/* Main Split Workspace: Interactive Auditorium (8 cols) + SeatSense AI & Summary (4 cols) */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Auditorium Column */}
        <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-[#151D30] sm:p-5 lg:col-span-8">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="font-heading text-lg font-bold text-slate-900 dark:text-[#F8FAFC]">
                Interactive Auditorium Map
              </h2>
              <p className="text-xs text-slate-500 dark:text-[#94A3B8]">
                <span className="font-mono-num font-semibold text-emerald-600 dark:text-emerald-400">
                  {availableCount} available
                </span>{' '}
                · Max {MAX_SEATS_PER_BOOKING} seats per booking · Updated{' '}
                <span className="font-mono-num">
                  {new Date(lastSyncedAt).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                  })}
                </span>
              </p>
            </div>

            <button
              type="button"
              onClick={() => setMobileAiOpen(true)}
              className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl bg-[#8B5CF6]/15 px-3 text-xs font-semibold text-[#6D28D9] dark:text-violet-300 lg:hidden"
            >
              <Sparkles className="h-4 w-4" aria-hidden="true" />
              <span>SeatSense AI</span>
            </button>
          </div>

          <SeatHeatControls
            mode={viewMode}
            onChangeMode={setViewMode}
            thresholds={thresholds}
            recommendedCount={aiRecommendedIds.length}
          />

          <AuditoriumSeatMap
            seats={seats}
            selectedSeatIds={optimisticSeatIds}
            aiRecommendedIds={aiRecommendedIds}
            conflictedSeatIds={conflicts.map((c) => c.originalSeat.id)}
            viewMode={viewMode}
            onToggleSeat={handleToggleSeat}
          />
        </section>

        {/* Right Sidebar: Booking Summary + Desktop SeatSense AI */}
        <aside className="space-y-5 lg:col-span-4">
          {/* Selected Seats & Hold Form */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-[#151D30]">
            <div className="flex items-center justify-between">
              <h2 className="font-heading text-base font-bold text-slate-900 dark:text-[#F8FAFC]">
                {t.selectedSeats}{' '}
                <span className="font-mono-num text-sm text-[#4F46E5] dark:text-[#22D3EE]">
                  ({optimisticSeatIds.length}/{MAX_SEATS_PER_BOOKING})
                </span>
              </h2>
              {optimisticSeatIds.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSelectedSeatIds([])}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-red-600 dark:text-[#94A3B8] dark:hover:text-red-400"
                >
                  <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>{t.clearSelection}</span>
                </button>
              )}
            </div>

            {selectedSeatObjects.length === 0 ? (
              <p className="mt-3 rounded-xl border border-dashed border-slate-300 p-4 text-center text-xs text-slate-500 dark:border-slate-700 dark:text-[#94A3B8]">
                Click or press Space on green seats in the auditorium, or ask SeatSense AI for
                smart recommendations.
              </p>
            ) : (
              <ul className="mt-3 divide-y divide-slate-100 dark:divide-slate-800">
                {selectedSeatObjects.map((seat) => (
                  <li
                    key={seat.id}
                    className="flex items-center justify-between py-2 text-sm"
                  >
                    <div>
                      <span className="font-mono-num font-bold text-slate-900 dark:text-white">
                        Seat {seat.id}
                      </span>
                      <span className="ml-2 text-xs text-slate-500 dark:text-[#94A3B8]">
                        {seat.section}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono-num font-semibold text-slate-800 dark:text-slate-200">
                        ₹{seat.price}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleToggleSeat(seat)}
                        aria-label={`Remove seat ${seat.id}`}
                        className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-red-500 dark:hover:bg-slate-800"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}

            <div className="mt-4 flex items-center justify-between border-t border-slate-200 pt-3.5 dark:border-slate-800">
              <span className="text-sm font-medium text-slate-600 dark:text-[#94A3B8]">
                Total Price
              </span>
              <span className="font-mono-num text-xl font-extrabold text-slate-900 dark:text-[#22D3EE]">
                ₹{totalPrice.toLocaleString('en-IN')}
              </span>
            </div>

            {holdState.error && (
              <p
                role="alert"
                className="mt-3 rounded-xl border border-red-500/30 bg-red-500/10 p-2.5 text-xs font-medium text-red-700 dark:text-red-300"
              >
                {holdState.error}
              </p>
            )}

            <form action={holdFormAction} className="mt-4">
              <SubmitButton
                pendingLabel={t.holdingSeats}
                disabled={optimisticSeatIds.length === 0 || !isOnline}
                className="w-full"
              >
                <Lock className="h-4 w-4" aria-hidden="true" />
                <span>
                  {t.holdSeats}
                  {optimisticSeatIds.length > 0 ? ` (${optimisticSeatIds.length})` : ''}
                </span>
              </SubmitButton>
              {!isOnline && (
                <p className="mt-2 text-center text-xs text-amber-600 dark:text-amber-300">
                  {t.offlineBookingDisabled}
                </p>
              )}
            </form>
          </div>

          {/* Desktop SeatSense AI Panel */}
          <div className="hidden lg:block">
            <SeatSensePanel
              eventId={event.id}
              seats={seats}
              onHighlightRecommendations={(ids) => {
                setAiRecommendedIds(ids);
                if (ids.length > 0) setViewMode('ai');
              }}
              onApplyRecommendedSeats={handleApplyAiSeats}
              onOpenSquadSync={() => setSquadOpen(true)}
            />
          </div>
        </aside>
      </div>

      {/* Mobile Sticky Booking Summary Bar (sits cleanly above mobile bottom nav) */}
      {optimisticSeatIds.length > 0 && (
        <div className="no-print fixed bottom-16 left-0 right-0 z-30 border-t border-slate-200 bg-white/95 px-4 py-2.5 shadow-lg backdrop-blur-md dark:border-slate-800 dark:bg-[#151D30]/95 lg:hidden">
          <div className="mx-auto flex max-w-2xl items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate font-mono-num text-xs font-bold text-slate-900 dark:text-white">
                {optimisticSeatIds.join(', ')}
              </p>
              <p className="font-mono-num text-sm font-extrabold text-[#4F46E5] dark:text-[#22D3EE]">
                ₹{totalPrice.toLocaleString('en-IN')}
              </p>
            </div>
            <form action={holdFormAction}>
              <SubmitButton pendingLabel={t.holdingSeats} size="md" disabled={!isOnline}>
                <Lock className="h-4 w-4" aria-hidden="true" />
                <span>{t.holdSeats}</span>
              </SubmitButton>
            </form>
          </div>
        </div>
      )}

      {/* Mobile Bottom Sheet for SeatSense AI */}
      {mobileAiOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end bg-slate-950/60 backdrop-blur-xs lg:hidden"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setMobileAiOpen(false);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="SeatSense AI Assistant"
            className="max-h-[85vh] w-full overflow-y-auto rounded-t-3xl bg-white p-3 dark:bg-[#090E1C]"
          >
            <div className="mb-2 flex items-center justify-between px-2">
              <div className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
                <Bot className="h-4 w-4 text-[#8B5CF6]" aria-hidden="true" />
                <span>{t.aiAssistantTitle}</span>
              </div>
              <button
                type="button"
                onClick={() => setMobileAiOpen(false)}
                aria-label="Close SeatSense AI sheet"
                className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <SeatSensePanel
              eventId={event.id}
              seats={seats}
              onHighlightRecommendations={(ids) => {
                setAiRecommendedIds(ids);
                if (ids.length > 0) setViewMode('ai');
              }}
              onApplyRecommendedSeats={handleApplyAiSeats}
              onOpenSquadSync={() => {
                setMobileAiOpen(false);
                setSquadOpen(true);
              }}
            />
          </div>
        </div>
      )}

      {/* SquadSync Group Finder Modal */}
      <SquadSyncPanel
        open={squadOpen}
        onClose={() => setSquadOpen(false)}
        eventId={event.id}
        seats={seats}
        maxSeatPrice={event.maxPrice}
        onHighlight={(ids) => {
          setAiRecommendedIds(ids);
          if (ids.length > 0) setViewMode('ai');
        }}
        onApplySeats={handleApplyAiSeats}
      />
    </div>
  );
}

export function EventSeatMapPage() {
  const { eventId = 'evt-music-fest' } = useParams();
  const [retryKey, setRetryKey] = useState(0);

  const bundlePromise = useMemo(() => {
    void retryKey;
    return getEventSeatMapResource(eventId);
  }, [eventId, retryKey]);

  return (
    <ErrorBoundary
      sectionName="Interactive Seat Map"
      onRetry={() => {
        invalidateEventSeatMapResource(eventId);
        setRetryKey((k) => k + 1);
      }}
    >
      <Suspense fallback={<SeatMapSkeleton />}>
        <SeatMapWorkspace bundlePromise={bundlePromise} />
      </Suspense>
    </ErrorBoundary>
  );
}
