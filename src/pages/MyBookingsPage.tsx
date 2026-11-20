import {
  startTransition,
  useCallback,
  useEffect,
  useMemo,
  useOptimistic,
  useState,
} from 'react';
import {
  Calendar,
  CheckCircle2,
  Clock,
  Compass,
  Download,
  MapPin,
  Receipt,
  RefreshCcw,
  RotateCcw,
  ShieldCheck,
  Ticket,
  Trash2,
  XCircle,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { AccessibleModal } from '../components/AccessibleModal';
import { CancelTicketModal } from '../components/CancelTicketModal';
import { EventPoster } from '../components/EventPoster';
import { Button } from '../components/FormControls';
import { downloadSeatPassHtml, SeatPassTicket } from '../components/SeatPassTicket';
import { BookingsSkeleton } from '../components/Skeletons';
import { useAuth } from '../context/AuthContext';
import { usePreferences } from '../context/PreferencesContext';
import { useToast } from '../context/ToastContext';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { ApiError, seatlockApi } from '../services/api';
import { invalidateEventsResource, invalidateEventSeatMapResource } from '../services/resources';
import type { BookingRecord } from '../types';
import {
  getCancellationCategoryLabel,
  getCancellationEligibility,
} from '../utils/cancellationPolicy';

interface OptimisticCancelAction {
  bookingId: string;
  reasonCategory: string;
  reasonDetails: string;
}

export function MyBookingsPage() {
  const { savedOfflineTickets, markOfflineTicketCancelled } = useAuth();
  const { t } = usePreferences();
  const { addToast } = useToast();
  const isOnline = useOnlineStatus();
  const navigate = useNavigate();

  const [bookings, setBookings] = useState<BookingRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'upcoming' | 'past'>('upcoming');
  const [viewingTicket, setViewingTicket] = useState<BookingRecord | null>(null);
  const [cancelTarget, setCancelTarget] = useState<BookingRecord | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [nowMs, setNowMs] = useState<number>(() => Date.now());

  // Refresh 2-hour cancellation countdowns every 30 seconds
  useEffect(() => {
    const timer = window.setInterval(() => setNowMs(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  // React 19 `useOptimistic` for instant booking cancellation + refund UI with automatic rollback on error
  const [optimisticBookings, markOptimisticCancelled] = useOptimistic<
    BookingRecord[],
    OptimisticCancelAction
  >(bookings, (current, action) =>
    current.map((b) =>
      b.id === action.bookingId
        ? {
            ...b,
            status: 'cancelled' as const,
            cancellationReasonCategory: getCancellationCategoryLabel(action.reasonCategory),
            cancellationReason: action.reasonDetails,
            refundAmount: b.totalPrice,
            refundStatus: 'processed' as const,
          }
        : b
    )
  );

  const loadBookings = useCallback(async () => {
    setLoading(true);
    setError(null);
    if (!isOnline) {
      setBookings(savedOfflineTickets);
      setLoading(false);
      return;
    }

    try {
      const list = await seatlockApi.getMyBookings();
      setBookings(list);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : 'Could not load your bookings. Check your connection and retry.'
      );
    } finally {
      setLoading(false);
    }
  }, [isOnline, savedOfflineTickets]);

  useEffect(() => {
    void loadBookings();
  }, [loadBookings]);

  const upcomingBookings = useMemo(
    () =>
      optimisticBookings.filter(
        (b) => new Date(b.eventDate).getTime() >= nowMs && b.status === 'confirmed'
      ),
    [optimisticBookings, nowMs]
  );

  const pastBookings = useMemo(
    () =>
      optimisticBookings.filter(
        (b) => new Date(b.eventDate).getTime() < nowMs || b.status === 'cancelled'
      ),
    [optimisticBookings, nowMs]
  );

  const visibleList = activeTab === 'upcoming' ? upcomingBookings : pastBookings;

  const handleConfirmCancel = (payload: { reasonCategory: string; reasonDetails: string }) => {
    if (!cancelTarget) return;
    if (!isOnline) {
      addToast({
        title: 'Offline',
        description: 'Reconnect to cancel an active booking and process your refund.',
        variant: 'warning',
      });
      return;
    }

    const target = cancelTarget;
    setCancelTarget(null);
    setCancellingId(target.id);

    startTransition(async () => {
      markOptimisticCancelled({
        bookingId: target.id,
        reasonCategory: payload.reasonCategory,
        reasonDetails: payload.reasonDetails,
      });

      try {
        const updatedBooking = await seatlockApi.cancelBooking(target.id, payload);
        setBookings((prev) => prev.map((b) => (b.id === target.id ? updatedBooking : b)));
        markOfflineTicketCancelled(target.id, updatedBooking);
        invalidateEventsResource();
        invalidateEventSeatMapResource(target.eventId);
        setActiveTab('past');
        addToast({
          title: `Ticket cancelled · ₹${(updatedBooking.refundAmount ?? target.totalPrice).toLocaleString('en-IN')} refunded`,
          description: `Refund Ref ${updatedBooking.refundReference ?? 'processed'} · Seats ${target.seats.map((s) => s.id).join(', ')} released.`,
          variant: 'success',
        });
      } catch (err) {
        addToast({
          title: 'Cancellation failed — ticket restored',
          description:
            err instanceof ApiError
              ? err.message
              : 'Could not process cancellation. Your booking remains confirmed.',
          variant: 'error',
        });
      } finally {
        setCancellingId(null);
      }
    });
  };

  return (
    <div className="space-y-6 pb-16">
      <title>My Bookings — SEATLOCK UI</title>
      <meta
        name="description"
        content="Manage your upcoming and past SEATLOCK university event bookings with 2-hour full-refund cancellation protection."
      />

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-extrabold tracking-tight text-slate-900 dark:text-[#F8FAFC] sm:text-3xl">
            {t.myBookingsTitle}
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-[#94A3B8]">
            Access confirmed SeatPass tickets, download passes, or cancel within 2 hours of booking
            for a 100% refund with a valid reason.
          </p>
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => navigate('/events')}
        >
          <Compass className="h-4 w-4 text-[#6366F1]" aria-hidden="true" />
          <span>{t.exploreMoreEvents}</span>
        </Button>
      </div>

      {/* 2-Hour Refund Policy Banner */}
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-xs text-emerald-900 dark:text-emerald-200">
        <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
        <p>
          <strong className="font-bold">2-Hour Fair Cancellation &amp; Full Refund Policy:</strong>{' '}
          Cancel any ticket within <strong>2 hours of booking</strong> by providing a valid reason to
          receive an instant <strong>100% refund</strong> and release your seats back to campus students.
        </p>
      </div>

      {/* Upcoming / Past & Cancelled Tabs */}
      <div
        role="tablist"
        aria-label="Booking timeline filter"
        className="inline-flex rounded-2xl border border-slate-200 bg-white p-1.5 dark:border-slate-800 dark:bg-[#151D30]"
      >
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'upcoming'}
          onClick={() => setActiveTab('upcoming')}
          className={`min-h-[42px] rounded-xl px-4 text-sm font-semibold transition ${
            activeTab === 'upcoming'
              ? 'bg-[#6366F1] text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 dark:text-[#94A3B8] dark:hover:text-white'
          }`}
        >
          {t.upcomingTab}{' '}
          <span className="font-mono-num ml-1 opacity-85">({upcomingBookings.length})</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'past'}
          onClick={() => setActiveTab('past')}
          className={`min-h-[42px] rounded-xl px-4 text-sm font-semibold transition ${
            activeTab === 'past'
              ? 'bg-[#6366F1] text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 dark:text-[#94A3B8] dark:hover:text-white'
          }`}
        >
          Past &amp; Refunded{' '}
          <span className="font-mono-num ml-1 opacity-85">({pastBookings.length})</span>
        </button>
      </div>

      {loading ? (
        <BookingsSkeleton />
      ) : error ? (
        <div
          role="alert"
          className="rounded-2xl border border-red-500/30 bg-white p-8 text-center dark:bg-[#151D30]"
        >
          <p className="text-sm font-semibold text-red-600 dark:text-red-400">{error}</p>
          <Button type="button" className="mt-4" onClick={() => void loadBookings()}>
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            <span>Retry</span>
          </Button>
        </div>
      ) : visibleList.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center dark:border-slate-800 dark:bg-[#151D30]">
          <Ticket className="mx-auto h-10 w-10 text-slate-400" aria-hidden="true" />
          <h2 className="mt-3 font-heading text-lg font-bold text-slate-900 dark:text-[#F8FAFC]">
            {activeTab === 'upcoming' ? 'No upcoming bookings yet' : 'No past or cancelled bookings'}
          </h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-[#94A3B8]">
            {activeTab === 'upcoming'
              ? 'Explore upcoming university concerts, summits, and cultural nights to lock your seat.'
              : 'Completed events and refunded cancellations will appear here.'}
          </p>
          {activeTab === 'upcoming' && (
            <div className="mt-5">
              <Button type="button" onClick={() => navigate('/events')}>
                {t.exploreEvents}
              </Button>
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          {visibleList.map((booking) => {
            const isConfirmed = booking.status === 'confirmed';
            const isFuture = new Date(booking.eventDate).getTime() >= nowMs;
            const eligibility = getCancellationEligibility(booking, nowMs);
            const formattedDate = new Date(booking.eventDate).toLocaleDateString(undefined, {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            });

            return (
              <article
                key={booking.id}
                className="flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-[#151D30] sm:flex-row"
              >
                <div className="h-40 w-full shrink-0 sm:h-auto sm:w-44">
                  <EventPoster
                    src={booking.eventPosterUrl}
                    alt={booking.eventTitle}
                    title={booking.eventTitle}
                    category={booking.eventCategory}
                    className="h-full w-full"
                  />
                </div>

                <div className="flex flex-1 flex-col justify-between p-5">
                  <div>
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                      <span className="font-mono-num font-semibold text-slate-500 dark:text-[#94A3B8]">
                        {booking.id}
                      </span>
                      <span
                        className={`inline-flex items-center gap-1 font-semibold ${
                          isConfirmed
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-red-600 dark:text-red-400'
                        }`}
                      >
                        {isConfirmed ? (
                          <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                        ) : (
                          <XCircle className="h-3.5 w-3.5" aria-hidden="true" />
                        )}
                        <span>{isConfirmed ? 'Confirmed' : 'Cancelled & Refunded'}</span>
                      </span>
                    </div>

                    <h2 className="mt-1.5 font-heading text-lg font-bold text-slate-900 dark:text-[#F8FAFC]">
                      {booking.eventTitle}
                    </h2>

                    <div className="mt-2 space-y-1 text-xs text-slate-600 dark:text-[#94A3B8]">
                      <p className="flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5 text-[#6366F1]" aria-hidden="true" />
                        <span>{formattedDate}</span>
                        <span aria-hidden="true">·</span>
                        <Clock className="h-3.5 w-3.5 text-[#6366F1]" aria-hidden="true" />
                        <span>{booking.eventTime}</span>
                      </p>
                      <p className="flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5 text-[#6366F1]" aria-hidden="true" />
                        <span>{booking.venue}</span>
                      </p>
                    </div>

                    {/* 2-Hour Cancellation Status Badge (Confirmed Upcoming) */}
                    {isConfirmed && isFuture && (
                      <div
                        className={`mt-3 flex items-center gap-1.5 rounded-xl px-3 py-2 text-[11px] font-semibold ${
                          eligibility.eligible
                            ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                            : 'bg-slate-100 text-slate-600 dark:bg-slate-800/70 dark:text-slate-400'
                        }`}
                      >
                        <RefreshCcw className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                        <span>
                          {eligibility.eligible
                            ? `Free cancel & 100% refund · ${eligibility.formattedRemaining} left`
                            : '2-hour cancellation window closed'}
                        </span>
                      </div>
                    )}

                    {/* Refund Receipt & Recorded Reason (Cancelled) */}
                    {!isConfirmed && booking.refundStatus === 'processed' && (
                      <div className="mt-3 space-y-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-[11px]">
                        <div className="flex flex-wrap items-center justify-between gap-2 font-bold text-emerald-800 dark:text-emerald-300">
                          <span className="inline-flex items-center gap-1">
                            <Receipt className="h-3.5 w-3.5" aria-hidden="true" />
                            100% Refund Processed: ₹
                            {(booking.refundAmount ?? booking.totalPrice).toLocaleString('en-IN')}
                          </span>
                          {booking.refundReference && (
                            <span className="font-mono-num text-[10px] opacity-85">
                              {booking.refundReference}
                            </span>
                          )}
                        </div>
                        {booking.cancellationReasonCategory && (
                          <p className="text-slate-700 dark:text-slate-200">
                            <strong>Reason:</strong> {booking.cancellationReasonCategory}
                            {booking.cancellationReason ? ` — "${booking.cancellationReason}"` : ''}
                          </p>
                        )}
                      </div>
                    )}

                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3 dark:border-slate-800">
                      <span className="font-mono-num text-xs font-bold text-slate-800 dark:text-slate-200">
                        Seats: {booking.seats.map((s) => s.id).join(', ')}
                      </span>
                      <span className="font-mono-num text-sm font-extrabold text-[#4F46E5] dark:text-[#22D3EE]">
                        ₹{booking.totalPrice.toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => setViewingTicket(booking)}
                      aria-label={`View Ticket for ${booking.eventTitle}`}
                    >
                      <Ticket className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>{t.viewTicket}</span>
                    </Button>

                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        downloadSeatPassHtml(booking);
                        addToast({
                          title: 'Ticket downloaded',
                          description: `Saved SeatPass-${booking.id}.html.`,
                          variant: 'success',
                        });
                      }}
                      aria-label={`Download Ticket for ${booking.eventTitle}`}
                    >
                      <Download className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>Download</span>
                    </Button>

                    {isConfirmed && isFuture && (
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        disabled={!isOnline || !eligibility.eligible || cancellingId === booking.id}
                        title={
                          eligibility.eligible
                            ? `Cancel within ${eligibility.formattedRemaining} for 100% refund`
                            : eligibility.statusMessage
                        }
                        onClick={() => setCancelTarget(booking)}
                        aria-label={`Cancel Booking for ${booking.eventTitle}`}
                        className="text-red-600 hover:bg-red-50 hover:text-red-700 disabled:text-slate-400 dark:text-red-400 dark:hover:bg-red-950/40 dark:disabled:text-slate-600"
                      >
                        <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>
                          {eligibility.eligible ? 'Cancel & Refund' : 'Window Ended'}
                        </span>
                      </Button>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* View SeatPass Modal */}
      <AccessibleModal
        open={Boolean(viewingTicket)}
        onClose={() => setViewingTicket(null)}
        title="Digital SeatPass"
        maxWidthClass="max-w-3xl"
      >
        {viewingTicket && (
          <div className="space-y-4">
            <SeatPassTicket booking={viewingTicket} />
            <div className="flex flex-wrap justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => downloadSeatPassHtml(viewingTicket)}
              >
                <Download className="h-4 w-4" aria-hidden="true" />
                <span>{t.downloadTicket}</span>
              </Button>
              <Button type="button" onClick={() => setViewingTicket(null)}>
                Close
              </Button>
            </div>
          </div>
        )}
      </AccessibleModal>

      {/* 2-Hour Cancellation & Valid-Reason Refund Modal */}
      <CancelTicketModal
        booking={cancelTarget}
        submitting={Boolean(cancellingId)}
        onClose={() => setCancelTarget(null)}
        onSubmit={handleConfirmCancel}
      />
    </div>
  );
}
