import type { BookingRecord } from '../types';

export const CANCELLATION_WINDOW_HOURS = 2;
export const CANCELLATION_WINDOW_MS = CANCELLATION_WINDOW_HOURS * 60 * 60 * 1000;

export interface CancellationReasonCategory {
  id: string;
  label: string;
}

export const CANCELLATION_REASON_CATEGORIES: CancellationReasonCategory[] = [
  { id: 'schedule_conflict', label: 'Academic Exam or Class Schedule Conflict' },
  { id: 'medical_emergency', label: 'Medical or Personal Emergency' },
  { id: 'travel_issue', label: 'Travel or Campus Transport Disruption' },
  { id: 'wrong_selection', label: 'Booked Wrong Event, Timing, or Seat' },
  { id: 'plan_change', label: 'Group / Companion Plans Changed' },
];

export interface CancellationEligibility {
  eligible: boolean;
  remainingMs: number;
  formattedRemaining: string;
  deadlineIso: string;
  refundAmount: number;
  statusMessage: string;
}

/**
 * Evaluates whether a booking is within the 2-hour cancellation & full refund window.
 */
export function getCancellationEligibility(
  booking: Pick<BookingRecord, 'status' | 'bookedAt' | 'eventDate' | 'totalPrice'>,
  nowMs = Date.now()
): CancellationEligibility {
  const bookedMs = new Date(booking.bookedAt).getTime();
  const eventMs = new Date(booking.eventDate).getTime();
  const deadlineMs = bookedMs + CANCELLATION_WINDOW_MS;
  const remainingMs = Math.max(0, deadlineMs - nowMs);
  const deadlineIso = new Date(deadlineMs).toISOString();

  if (booking.status === 'cancelled') {
    return {
      eligible: false,
      remainingMs: 0,
      formattedRemaining: '0m',
      deadlineIso,
      refundAmount: booking.totalPrice,
      statusMessage: 'Ticket already cancelled.',
    };
  }

  if (Number.isNaN(bookedMs) || eventMs <= nowMs) {
    return {
      eligible: false,
      remainingMs: 0,
      formattedRemaining: '0m',
      deadlineIso,
      refundAmount: 0,
      statusMessage: 'Event has already started or passed.',
    };
  }

  if (remainingMs <= 0) {
    return {
      eligible: false,
      remainingMs: 0,
      formattedRemaining: '0m',
      deadlineIso,
      refundAmount: 0,
      statusMessage: '2-hour free cancellation window has expired.',
    };
  }

  const totalMinutes = Math.ceil(remainingMs / 60_000);
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  const formattedRemaining = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;

  return {
    eligible: true,
    remainingMs,
    formattedRemaining,
    deadlineIso,
    refundAmount: booking.totalPrice,
    statusMessage: `Free cancellation & 100% refund available (${formattedRemaining} left)`,
  };
}

/**
 * Validates that the student selected a reason category and supplied a genuine written reason
 * before unlocking the 2-hour full refund.
 */
export function validateCancellationReason(
  categoryId: string,
  details: string
): { valid: boolean; error?: string } {
  const validCategory = CANCELLATION_REASON_CATEGORIES.some((c) => c.id === categoryId);
  if (!validCategory) {
    return {
      valid: false,
      error: 'Please select a cancellation reason category.',
    };
  }

  const trimmed = details.trim();
  if (trimmed.length < 15) {
    return {
      valid: false,
      error: 'Please provide a valid explanation (at least 15 characters) to process your refund.',
    };
  }

  // Reject repeated single-character or non-word gibberish (e.g. "aaaaaaaaaaaaaaa", "...........")
  if (/^(.)\1{6,}$/.test(trimmed.replace(/\s+/g, ''))) {
    return {
      valid: false,
      error: 'Please enter a genuine reason rather than repeated characters.',
    };
  }

  const meaningfulWords = trimmed
    .split(/\s+/)
    .map((w) => w.replace(/[^a-zA-Z0-9]/g, ''))
    .filter((w) => w.length >= 2 && /[a-zA-Z]/.test(w));

  const uniqueWords = new Set(meaningfulWords.map((w) => w.toLowerCase()));
  if (meaningfulWords.length < 3 || uniqueWords.size < 2) {
    return {
      valid: false,
      error: 'Please write a brief, clear sentence (at least 3 words) explaining why you need to cancel.',
    };
  }

  return { valid: true };
}

export function getCancellationCategoryLabel(categoryId: string): string {
  return (
    CANCELLATION_REASON_CATEGORIES.find((c) => c.id === categoryId)?.label ??
    'Valid Student Reason'
  );
}

export function generateRefundReference(bookingId: string): string {
  const cleanId = bookingId.replace(/[^A-Z0-9]/gi, '').slice(-4).toUpperCase() || '0000';
  const suffix = Math.floor(1000 + Math.random() * 9000);
  return `RFND-${cleanId}-${suffix}`;
}
