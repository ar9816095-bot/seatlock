import { useActionState, useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Clock,
  MapPin,
  ShieldCheck,
  XCircle,
} from 'lucide-react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { usePreferences } from '../context/PreferencesContext';
import { useToast } from '../context/ToastContext';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { ApiError, seatlockApi } from '../services/api';
import { invalidateEventSeatMapResource } from '../services/resources';
import { computeRemainingHoldTime } from '../utils/seatLogic';
import { BookingStepper } from '../components/BookingStepper';
import { EventPoster } from '../components/EventPoster';
import { Button, SubmitButton } from '../components/FormControls';

interface ConfirmState {
  error?: string;
}

export function CheckoutPage() {
  const {
    session,
    activeHold,
    setActiveHold,
    saveConfirmedTicketOffline,
  } = useAuth();
  const { t } = usePreferences();
  const { addToast } = useToast();
  const isOnline = useOnlineStatus();
  const navigate = useNavigate();

  const [nowMs, setNowMs] = useState<number>(() => Date.now());
  const [expiredHandled, setExpiredHandled] = useState(false);
  const [confirmedSuccess, setConfirmedSuccess] = useState(false);
  const confirmLockRef = useRef(false);

  const timer = activeHold
    ? computeRemainingHoldTime(activeHold.expiresAt, nowMs)
    : null;

  // Timestamp-derived countdown updates accurately even after browser tab sleep
  useEffect(() => {
    if (!activeHold) return;
    const tick = () => setNowMs(Date.now());
    const id = window.setInterval(tick, 500);
    const onVisibility = () => {
      if (document.visibilityState === 'visible') tick();
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [activeHold]);

  // Handle hold expiration cleanly: disable confirm, show message, redirect to seat map & refresh
  useEffect(() => {
    if (!activeHold || !timer?.isExpired || expiredHandled || confirmedSuccess) return;
    setExpiredHandled(true);
    const eventId = activeHold.eventId;

    addToast({
      title: 'Seat reservation expired',
      description: 'Your 5-minute hold ended. Refreshing live auditorium availability...',
      variant: 'error',
    });

    const redirectTimer = window.setTimeout(async () => {
      await seatlockApi.releaseHold(activeHold.holdId);
      setActiveHold(null);
      invalidateEventSeatMapResource(eventId);
      navigate(`/events/${eventId}`, { replace: true });
    }, 2400);

    return () => window.clearTimeout(redirectTimer);
  }, [activeHold, timer?.isExpired, expiredHandled, confirmedSuccess, addToast, navigate, setActiveHold]);

  const [confirmState, confirmAction] = useActionState<ConfirmState, FormData>(async () => {
    if (!activeHold || !session) return { error: 'No active seat hold found.' };
    if (!isOnline) return { error: t.offlineBookingDisabled };
    if (confirmLockRef.current) return {};

    const latest = computeRemainingHoldTime(activeHold.expiresAt, Date.now());
    if (latest.isExpired) {
      return { error: 'This reservation has expired. Redirecting to the seat map.' };
    }

    confirmLockRef.current = true;
    try {
      const booking = await seatlockApi.confirmBooking(activeHold.holdId, {
        name: session.user.name,
        email: session.user.email,
      });
      setConfirmedSuccess(true);
      saveConfirmedTicketOffline(booking);
      invalidateEventSeatMapResource(booking.eventId);
      addToast({
        title: 'Booking confirmed!',
        description: `SeatPass ${booking.id} is ready.`,
        variant: 'success',
      });
      navigate(`/booking-success/${booking.id}`, {
        replace: true,
        state: { booking },
      });
      setActiveHold(null);
      return {};
    } catch (err) {
      confirmLockRef.current = false;
      if (err instanceof ApiError && (err.code === 'HOLD_EXPIRED' || err.code === 'HOLD_NOT_FOUND')) {
        const evId = activeHold.eventId;
        setActiveHold(null);
        invalidateEventSeatMapResource(evId);
        addToast({
          title: 'Hold expired',
          description: err.message,
          variant: 'error',
        });
        navigate(`/events/${evId}`, { replace: true });
        return { error: err.message };
      }
      return {
        error:
          err instanceof ApiError
            ? err.message
            : 'Unable to confirm booking right now. Please retry.',
      };
    }
  }, {});

  if (confirmedSuccess) {
    return null;
  }

  if (!activeHold || !timer) {
    return <Navigate to="/events" replace />;
  }

  const handleCancelOrBack = async () => {
    const eventId = activeHold.eventId;
    await seatlockApi.releaseHold(activeHold.holdId);
    setActiveHold(null);
    invalidateEventSeatMapResource(eventId);
    addToast({
      title: 'Reservation released',
      description: 'Your held seats were returned to the auditorium map.',
      variant: 'info',
    });
    navigate(`/events/${eventId}`);
  };

  // Animated SVG Countdown Ring math
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - timer.progressRatio);

  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-16">
      <title>Checkout — SEATLOCK UI</title>
      <meta name="description" content="Complete your 5-minute held seat reservation on SEATLOCK." />

      <BookingStepper currentStep={2} eventId={activeHold.eventId} />

      {/* Prominent 1-minute warning or expired alert */}
      {timer.isExpired && (
        <div
          role="alert"
          className="flex items-center gap-3 rounded-2xl border border-red-500/50 bg-red-500/15 p-4 text-sm font-semibold text-red-700 dark:text-red-300"
        >
          <XCircle className="h-5 w-5 shrink-0" aria-hidden="true" />
          <span>
            Your 5-minute reservation expired. Confirmation is disabled and you are being redirected
            back to the seat map to refresh live availability.
          </span>
        </div>
      )}

      {timer.isWarning && !timer.isExpired && (
        <div
          role="alert"
          className="flex items-center gap-3 rounded-2xl border border-amber-500/50 bg-amber-500/15 p-4 text-sm font-semibold text-amber-900 dark:text-amber-200"
        >
          <AlertTriangle className="h-5 w-5 shrink-0 text-amber-500" aria-hidden="true" />
          <span>{t.oneMinuteWarning}</span>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left: Event & Seat Summary */}
        <section className="space-y-5 rounded-3xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-[#151D30] lg:col-span-7">
          <div className="flex flex-col gap-4 sm:flex-row">
            <div className="h-28 w-full shrink-0 overflow-hidden rounded-2xl sm:w-40">
              <EventPoster
                src={activeHold.eventPosterUrl}
                alt={activeHold.eventTitle}
                title={activeHold.eventTitle}
                className="h-full w-full"
              />
            </div>
            <div className="space-y-1.5">
              <p className="font-mono-num text-xs font-semibold text-[#4F46E5] dark:text-[#22D3EE]">
                Hold Reference · {activeHold.holdId}
              </p>
              <h1 className="font-heading text-xl font-extrabold text-slate-900 dark:text-[#F8FAFC]">
                {activeHold.eventTitle}
              </h1>
              <p className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-[#94A3B8]">
                <Calendar className="h-3.5 w-3.5 text-[#6366F1]" aria-hidden="true" />
                <span>
                  {new Date(activeHold.eventDate).toLocaleDateString(undefined, {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </span>
                <span aria-hidden="true">·</span>
                <Clock className="h-3.5 w-3.5 text-[#6366F1]" aria-hidden="true" />
                <span>{activeHold.eventTime}</span>
              </p>
              <p className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-[#94A3B8]">
                <MapPin className="h-3.5 w-3.5 text-[#6366F1]" aria-hidden="true" />
                <span>{activeHold.venue}</span>
              </p>
            </div>
          </div>

          <div className="border-t border-slate-200 pt-4 dark:border-slate-800">
            <h2 className="text-sm font-bold text-slate-900 dark:text-[#F8FAFC]">
              Held Seats Breakdown
            </h2>
            <ul className="mt-3 divide-y divide-slate-100 dark:divide-slate-800">
              {activeHold.seats.map((seat) => (
                <li
                  key={seat.id}
                  className="flex items-center justify-between py-2.5 text-sm"
                >
                  <div>
                    <span className="font-mono-num font-bold text-slate-900 dark:text-white">
                      Seat {seat.id}
                    </span>
                    <span className="ml-2 text-xs text-slate-500 dark:text-[#94A3B8]">
                      Row {seat.row} · {seat.section}
                    </span>
                  </div>
                  <span className="font-mono-num font-semibold text-slate-800 dark:text-slate-200">
                    ₹{seat.price}
                  </span>
                </li>
              ))}
            </ul>

            <div className="mt-4 flex items-center justify-between border-t border-slate-200 pt-4 dark:border-slate-800">
              <div>
                <p className="text-sm font-semibold text-slate-900 dark:text-[#F8FAFC]">
                  Total Amount
                </p>
                <p className="text-xs text-slate-500 dark:text-[#94A3B8]">
                  University student pass · Instant API confirmation
                </p>
              </div>
              <p className="font-mono-num text-2xl font-extrabold text-[#4F46E5] dark:text-[#22D3EE]">
                ₹{activeHold.totalPrice.toLocaleString('en-IN')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 rounded-xl border border-emerald-500/25 bg-emerald-500/10 p-3.5 text-xs text-emerald-900 dark:text-emerald-200">
            <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-500" aria-hidden="true" />
            <span>
              Your seats are locked exclusively under <strong>{session?.user.name}</strong> (
              {session?.user.email}). No external payment gateway required for campus bookings.
            </span>
          </div>
        </section>

        {/* Right: 5-Minute Animated Countdown Ring & Confirm Controls */}
        <aside className="flex flex-col justify-between rounded-3xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-[#151D30] lg:col-span-5">
          <div className="flex flex-col items-center text-center">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-[#94A3B8]">
              {t.reservationTimer}
            </p>

            {/* Animated Timer Ring */}
            <div className="relative mt-4 flex h-36 w-36 items-center justify-center">
              <svg className="h-36 w-36 -rotate-90" viewBox="0 0 120 120" aria-hidden="true">
                <circle
                  cx="60"
                  cy="60"
                  r={radius}
                  fill="none"
                  strokeWidth="8"
                  className="stroke-slate-200 dark:stroke-slate-800"
                />
                <circle
                  cx="60"
                  cy="60"
                  r={radius}
                  fill="none"
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  className={`transition-all duration-500 ${
                    timer.isExpired
                      ? 'stroke-red-500'
                      : timer.isWarning
                        ? 'stroke-amber-500'
                        : 'stroke-[#6366F1]'
                  }`}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span
                  aria-live="polite"
                  className={`font-mono-num text-3xl font-extrabold ${
                    timer.isExpired
                      ? 'text-red-500'
                      : timer.isWarning
                        ? 'text-amber-500'
                        : 'text-slate-900 dark:text-[#F8FAFC]'
                  }`}
                >
                  {timer.formatted}
                </span>
                <span className="text-[11px] font-medium text-slate-500 dark:text-[#94A3B8]">
                  {timer.isExpired ? 'Expired' : 'min : sec'}
                </span>
              </div>
            </div>

            <p className="mt-4 text-xs leading-relaxed text-slate-600 dark:text-[#94A3B8]">
              Confirm before the timer reaches 00:00 to issue your official digital SeatPass.
            </p>
          </div>

          <div className="mt-6 space-y-3">
            {confirmState.error && (
              <p
                role="alert"
                className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs font-medium text-red-700 dark:text-red-300"
              >
                {confirmState.error}
              </p>
            )}

            <form action={confirmAction}>
              <SubmitButton
                pendingLabel={t.confirmingBooking}
                disabled={timer.isExpired || !isOnline}
                className="w-full"
              >
                <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                <span>{t.confirmBooking}</span>
              </SubmitButton>
            </form>

            <div className="grid grid-cols-2 gap-2.5">
              <Button
                type="button"
                variant="outline"
                onClick={() => void handleCancelOrBack()}
              >
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                <span>Back</span>
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => void handleCancelOrBack()}
                className="text-red-600 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-950/30"
              >
                {t.cancelHold}
              </Button>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
