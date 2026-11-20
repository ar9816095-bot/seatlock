import { useEffect, useState } from 'react';
import {
  CalendarPlus,
  Compass,
  Download,
  Printer,
  Receipt,
  RefreshCcw,
  Ticket,
  Trash2,
} from 'lucide-react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { BookingStepper } from '../components/BookingStepper';
import { CancelTicketModal } from '../components/CancelTicketModal';
import { Button } from '../components/FormControls';
import { downloadSeatPassHtml, SeatPassTicket } from '../components/SeatPassTicket';
import { useAuth } from '../context/AuthContext';
import { usePreferences } from '../context/PreferencesContext';
import { useToast } from '../context/ToastContext';
import { ApiError, seatlockApi } from '../services/api';
import { invalidateEventsResource, invalidateEventSeatMapResource } from '../services/resources';
import type { BookingRecord } from '../types';
import { getCancellationEligibility } from '../utils/cancellationPolicy';
import { generateBookingICS } from '../utils/seatLogic';

const CONFETTI_PIECES = [
  { left: '10%', delay: '0ms', color: '#6366F1' },
  { left: '20%', delay: '120ms', color: '#22D3EE' },
  { left: '32%', delay: '60ms', color: '#10B981' },
  { left: '44%', delay: '180ms', color: '#8B5CF6' },
  { left: '56%', delay: '90ms', color: '#F59E0B' },
  { left: '68%', delay: '150ms', color: '#6366F1' },
  { left: '78%', delay: '40ms', color: '#22D3EE' },
  { left: '88%', delay: '200ms', color: '#10B981' },
];

export function BookingSuccessPage() {
  const { bookingId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { savedOfflineTickets, markOfflineTicketCancelled } = useAuth();
  const { preferences, t } = usePreferences();
  const { addToast } = useToast();

  const stateBooking = (location.state as { booking?: BookingRecord } | null)?.booking;
  const [booking, setBooking] = useState<BookingRecord | null>(
    () =>
      stateBooking ??
      savedOfflineTickets.find((b) => b.id === bookingId) ??
      null
  );
  const [loading, setLoading] = useState(!booking);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    if (booking || !bookingId) return;
    let active = true;
    seatlockApi
      .getMyBookings()
      .then((list) => {
        if (!active) return;
        const found = list.find((b) => b.id === bookingId) ?? null;
        setBooking(found);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [booking, bookingId]);

  const handleAddToCalendar = () => {
    if (!booking) return;
    const ics = generateBookingICS(booking);
    const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `SEATLOCK-${booking.id}.ics`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    addToast({
      title: 'Calendar invite downloaded',
      description: 'Import the .ics file into Google Calendar, Apple Calendar, or Outlook.',
      variant: 'success',
    });
  };

  const handleCancelWithRefund = async (payload: {
    reasonCategory: string;
    reasonDetails: string;
  }) => {
    if (!booking) return;
    setCancelling(true);
    try {
      const updated = await seatlockApi.cancelBooking(booking.id, payload);
      setBooking(updated);
      markOfflineTicketCancelled(booking.id, updated);
      invalidateEventsResource();
      invalidateEventSeatMapResource(booking.eventId);
      setCancelOpen(false);
      addToast({
        title: `Ticket cancelled · ₹${(updated.refundAmount ?? booking.totalPrice).toLocaleString('en-IN')} refunded`,
        description: `Refund Ref ${updated.refundReference ?? 'processed'} · Your seats have been released.`,
        variant: 'success',
      });
    } catch (err) {
      addToast({
        title: 'Cancellation failed',
        description:
          err instanceof ApiError ? err.message : 'Unable to cancel ticket right now.',
        variant: 'error',
      });
    } finally {
      setCancelling(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl py-16 text-center">
        <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-[#6366F1] border-t-transparent" />
        <p className="mt-4 text-sm text-slate-600 dark:text-[#94A3B8]">
          Verifying confirmed SeatPass ticket...
        </p>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="mx-auto max-w-lg rounded-2xl border border-slate-200 bg-white p-8 text-center dark:border-slate-800 dark:bg-[#151D30]">
        <h1 className="font-heading text-xl font-bold text-slate-900 dark:text-white">
          Confirmed ticket not found
        </h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-[#94A3B8]">
          Digital tickets are only issued after an API-confirmed booking. Check your My Bookings
          dashboard or reserve new seats.
        </p>
        <div className="mt-5 flex justify-center gap-3">
          <Button type="button" onClick={() => navigate('/bookings')}>
            {t.viewMyBookings}
          </Button>
          <Button type="button" variant="outline" onClick={() => navigate('/events')}>
            {t.exploreMoreEvents}
          </Button>
        </div>
      </div>
    );
  }

  const eligibility = getCancellationEligibility(booking, Date.now());

  return (
    <div className="relative mx-auto max-w-3xl space-y-6 pb-16">
      <title>Booking Successful — SeatPass {booking.id} | SEATLOCK UI</title>
      <meta
        name="description"
        content={`Your confirmed SEATLOCK SeatPass digital ticket for ${booking.eventTitle}.`}
      />

      <BookingStepper currentStep={3} eventId={booking.eventId} />

      {/* Subtle Confetti Celebration (strictly respects reduced motion) */}
      {!preferences.reducedMotion && booking.status === 'confirmed' && (
        <div
          aria-hidden="true"
          className="no-print pointer-events-none absolute inset-x-0 top-12 h-40 overflow-hidden"
        >
          {CONFETTI_PIECES.map((piece, idx) => (
            <span
              key={idx}
              style={{
                left: piece.left,
                animationDelay: piece.delay,
                backgroundColor: piece.color,
              }}
              className="animate-sl-confetti absolute top-0 h-2.5 w-2 rounded-xs"
            />
          ))}
        </div>
      )}

      {/* Header */}
      <header className="no-print text-center">
        {booking.status === 'confirmed' ? (
          <>
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-500">
              <svg viewBox="0 0 48 48" className="h-10 w-10" fill="none" aria-hidden="true">
                <circle
                  cx="24"
                  cy="24"
                  r="20"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeOpacity="0.3"
                />
                <path
                  d="M15 24.5L21 30.5L33 18"
                  stroke="currentColor"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="animate-sl-check"
                />
              </svg>
            </div>
            <h1 className="mt-4 font-heading text-3xl font-extrabold tracking-tight text-slate-900 dark:text-[#F8FAFC]">
              {t.bookingSuccessful}
            </h1>
            <p className="mt-1.5 text-sm text-slate-600 dark:text-[#94A3B8]">
              Your SeatPass is confirmed and saved offline for instant campus gate access.
            </p>
          </>
        ) : (
          <div className="mx-auto max-w-xl rounded-2xl border border-emerald-500/35 bg-emerald-500/10 p-5 text-left">
            <div className="flex items-center gap-2 text-sm font-bold text-emerald-700 dark:text-emerald-300">
              <Receipt className="h-5 w-5" aria-hidden="true" />
              <span>
                Ticket Cancelled &amp; 100% Refund Processed (₹
                {(booking.refundAmount ?? booking.totalPrice).toLocaleString('en-IN')})
              </span>
            </div>
            <p className="mt-1.5 text-xs text-slate-700 dark:text-slate-200">
              Reference: <strong className="font-mono-num">{booking.refundReference}</strong> ·{' '}
              {booking.cancellationReasonCategory}
            </p>
          </div>
        )}
      </header>

      {/* SeatPass Digital Ticket */}
      <SeatPassTicket booking={booking} />

      {/* 2-Hour Cancellation Info Strip */}
      {booking.status === 'confirmed' && eligibility.eligible && (
        <div className="no-print flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-xs text-emerald-900 dark:text-emerald-200">
          <div className="flex items-center gap-2">
            <RefreshCcw className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
            <span>
              <strong>2-Hour Free Cancellation Active ({eligibility.formattedRemaining} left):</strong>{' '}
              Need to cancel? Provide a valid reason for a 100% refund.
            </span>
          </div>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => setCancelOpen(true)}
            className="text-red-600 hover:bg-red-500/10 dark:text-red-400"
          >
            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Cancel &amp; Refund</span>
          </Button>
        </div>
      )}

      {/* Action Buttons */}
      <div className="no-print flex flex-wrap items-center justify-center gap-3 pt-2">
        <Button
          type="button"
          onClick={() => {
            downloadSeatPassHtml(booking);
            addToast({
              title: 'SeatPass downloaded',
              description: `Saved SeatPass-${booking.id}.html to your device.`,
              variant: 'success',
            });
          }}
        >
          <Download className="h-4 w-4" aria-hidden="true" />
          <span>{t.downloadTicket}</span>
        </Button>

        <Button type="button" variant="outline" onClick={() => window.print()}>
          <Printer className="h-4 w-4" aria-hidden="true" />
          <span>{t.printTicket}</span>
        </Button>

        <Button type="button" variant="outline" onClick={handleAddToCalendar}>
          <CalendarPlus className="h-4 w-4" aria-hidden="true" />
          <span>{t.addToCalendar}</span>
        </Button>
      </div>

      <div className="no-print flex flex-wrap items-center justify-center gap-4 border-t border-slate-200 pt-5 dark:border-slate-800">
        <Button type="button" variant="secondary" onClick={() => navigate('/bookings')}>
          <Ticket className="h-4 w-4" aria-hidden="true" />
          <span>{t.viewMyBookings}</span>
        </Button>
        <Button type="button" variant="ghost" onClick={() => navigate('/events')}>
          <Compass className="h-4 w-4" aria-hidden="true" />
          <span>{t.exploreMoreEvents}</span>
        </Button>
      </div>

      <CancelTicketModal
        booking={cancelOpen ? booking : null}
        submitting={cancelling}
        onClose={() => setCancelOpen(false)}
        onSubmit={(payload) => void handleCancelWithRefund(payload)}
      />
    </div>
  );
}
