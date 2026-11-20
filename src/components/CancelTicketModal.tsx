import { useState } from 'react';
import { AlertCircle, CheckCircle2, Clock, RefreshCcw, ShieldCheck } from 'lucide-react';
import type { BookingRecord } from '../types';
import {
  CANCELLATION_REASON_CATEGORIES,
  getCancellationEligibility,
  validateCancellationReason,
} from '../utils/cancellationPolicy';
import { AccessibleModal } from './AccessibleModal';
import { Button } from './FormControls';

interface CancelTicketModalProps {
  booking: BookingRecord | null;
  submitting: boolean;
  onClose: () => void;
  onSubmit: (payload: { reasonCategory: string; reasonDetails: string }) => void;
}

export function CancelTicketModal({
  booking,
  submitting,
  onClose,
  onSubmit,
}: CancelTicketModalProps) {
  const [reasonCategory, setReasonCategory] = useState<string>('');
  const [reasonDetails, setReasonDetails] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  const eligibility = booking ? getCancellationEligibility(booking, Date.now()) : null;

  const handleClose = () => {
    setReasonCategory('');
    setReasonDetails('');
    setError(null);
    onClose();
  };

  const handleConfirm = () => {
    if (!booking || !eligibility) return;
    if (!eligibility.eligible) {
      setError(eligibility.statusMessage);
      return;
    }

    const validation = validateCancellationReason(reasonCategory, reasonDetails);
    if (!validation.valid) {
      setError(validation.error ?? 'Please provide a valid reason for cancellation.');
      return;
    }

    setError(null);
    const payload = { reasonCategory, reasonDetails: reasonDetails.trim() };
    setReasonCategory('');
    setReasonDetails('');
    onSubmit(payload);
  };

  return (
    <AccessibleModal
      open={Boolean(booking)}
      onClose={handleClose}
      title="Cancel Ticket & Claim Full Refund"
      description="Bookings can be cancelled within 2 hours of purchase for a 100% refund once you provide a valid reason."
      maxWidthClass="max-w-lg"
    >
      {booking && eligibility && (
        <div className="space-y-4">
          {/* Ticket & Refund Summary */}
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-[#090E1C]">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-bold text-slate-900 dark:text-white">{booking.eventTitle}</p>
                <p className="font-mono-num mt-0.5 text-xs text-slate-600 dark:text-[#94A3B8]">
                  {booking.id} · Seats {booking.seats.map((s) => s.id).join(', ')}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[11px] font-medium text-slate-500 dark:text-[#94A3B8]">
                  100% Refund Amount
                </p>
                <p className="font-mono-num text-base font-extrabold text-emerald-600 dark:text-emerald-400">
                  ₹{booking.totalPrice.toLocaleString('en-IN')}
                </p>
              </div>
            </div>

            <div className="mt-3 flex items-center gap-2 rounded-lg bg-emerald-500/10 px-3 py-2 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
              <Clock className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span>
                {eligibility.eligible
                  ? `2-Hour Free Cancellation Active · ${eligibility.formattedRemaining} remaining`
                  : eligibility.statusMessage}
              </span>
            </div>
          </div>

          {error && (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-xs font-medium text-red-700 dark:text-red-300"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <span>{error}</span>
            </div>
          )}

          {/* Reason Category Selection */}
          <div>
            <p className="mb-2 text-xs font-semibold text-slate-800 dark:text-slate-200">
              1. Select a Valid Reason Category <span className="text-red-500">*</span>
            </p>
            <div className="grid grid-cols-1 gap-2">
              {CANCELLATION_REASON_CATEGORIES.map((cat) => {
                const selected = reasonCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => {
                      setReasonCategory(cat.id);
                      if (error) setError(null);
                    }}
                    className={`flex min-h-[42px] items-center justify-between rounded-xl border px-3.5 py-2 text-left text-xs font-medium transition ${
                      selected
                        ? 'border-[#6366F1] bg-[#6366F1]/10 text-[#4F46E5] dark:text-[#818CF8]'
                        : 'border-slate-200 text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800/60'
                    }`}
                  >
                    <span>{cat.label}</span>
                    {selected && <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Written Reason Details */}
          <div>
            <div className="mb-1.5 flex items-center justify-between gap-2">
              <label
                htmlFor="cancel-reason-details"
                className="text-xs font-semibold text-slate-800 dark:text-slate-200"
              >
                2. Explain Your Reason <span className="text-red-500">*</span>
              </label>
              <span className="font-mono-num text-[11px] text-slate-500 dark:text-[#94A3B8]">
                {reasonDetails.trim().length}/15+ chars
              </span>
            </div>
            <textarea
              id="cancel-reason-details"
              rows={3}
              value={reasonDetails}
              onChange={(e) => {
                setReasonDetails(e.target.value);
                if (error) setError(null);
              }}
              placeholder="e.g., My lab examination timing was rescheduled to the same evening so I cannot attend."
              className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#6366F1] focus:outline-none dark:border-slate-700 dark:bg-[#090E1C] dark:text-white"
            />
          </div>

          <div className="flex items-start gap-2 rounded-xl border border-slate-200 bg-slate-50/70 p-3 text-[11px] text-slate-600 dark:border-slate-800 dark:bg-[#090E1C]/60 dark:text-[#94A3B8]">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#6366F1]" aria-hidden="true" />
            <p>
              Once confirmed, your seats are immediately released back to other students and a{' '}
              <strong className="text-slate-900 dark:text-white">
                100% refund of ₹{booking.totalPrice.toLocaleString('en-IN')}
              </strong>{' '}
              is processed with a verified refund reference ID.
            </p>
          </div>

          <div className="flex flex-wrap justify-end gap-2.5 pt-1">
            <Button type="button" variant="outline" onClick={handleClose} disabled={submitting}>
              Keep My Ticket
            </Button>
            <Button
              type="button"
              variant="danger"
              loading={submitting}
              disabled={!eligibility.eligible || submitting}
              onClick={handleConfirm}
            >
              <RefreshCcw className="h-4 w-4" aria-hidden="true" />
              <span>Confirm Cancel &amp; Refund ₹{booking.totalPrice.toLocaleString('en-IN')}</span>
            </Button>
          </div>
        </div>
      )}
    </AccessibleModal>
  );
}
