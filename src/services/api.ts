import { DEMO_EVENTS, generateAuditoriumSeats, INITIAL_DEMO_BOOKINGS } from '../data/demoEvents';
import type {
  AiAssistResponse,
  AiRecommendation,
  AuthSession,
  BookingRecord,
  EventItem,
  EventSeatsResponse,
  HoldRecord,
  Seat,
  SquadSyncCriteria,
} from '../types';
import {
  extractNameFromEmail,
  getInitialsFromName,
  hashPasswordLocal,
  isGmailAddress,
  isValidEmail,
} from '../utils/authHelpers';
import {
  generateRefundReference,
  getCancellationCategoryLabel,
  getCancellationEligibility,
  validateCancellationReason,
} from '../utils/cancellationPolicy';
import {
  findSquadRecommendations,
  MAX_SEATS_PER_BOOKING,
  validateAiRecommendation,
} from '../utils/seatLogic';

const RAW_API_BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim() ?? '';
const FORCE_DEMO = (import.meta.env.VITE_FORCE_DEMO_MODE as string | undefined) === 'true';

export const API_CONFIG = {
  baseUrl: RAW_API_BASE.replace(/\/$/, ''),
  isDemoMode: FORCE_DEMO || RAW_API_BASE.length === 0,
};

export class ApiError extends Error {
  status: number;
  code: string;
  conflictedSeatIds?: string[];

  constructor(message: string, status: number, code: string, conflictedSeatIds?: string[]) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.conflictedSeatIds = conflictedSeatIds;
  }
}

// Local Demo Mode in-memory state (backed by localStorage for bookings so refreshes keep them)
const DEMO_BOOKINGS_STORAGE_KEY = 'seatlock_demo_bookings_v2';
const demoSeatsStore = new Map<string, Seat[]>();
const demoHoldsStore = new Map<string, HoldRecord>();

function ensureDemoSeats(eventId: string): Seat[] {
  const existing = demoSeatsStore.get(eventId);
  if (existing) return existing;
  const event = DEMO_EVENTS.find((e) => e.id === eventId) ?? DEMO_EVENTS[0];
  const generated = generateAuditoriumSeats(event);
  demoSeatsStore.set(eventId, generated);
  return generated;
}

function loadDemoBookings(): BookingRecord[] {
  try {
    const raw = localStorage.getItem(DEMO_BOOKINGS_STORAGE_KEY);
    if (!raw) return [...INITIAL_DEMO_BOOKINGS];
    const parsed = JSON.parse(raw) as BookingRecord[];
    return Array.isArray(parsed) ? parsed : [...INITIAL_DEMO_BOOKINGS];
  } catch {
    return [...INITIAL_DEMO_BOOKINGS];
  }
}

function saveDemoBookings(bookings: BookingRecord[]): void {
  try {
    localStorage.setItem(DEMO_BOOKINGS_STORAGE_KEY, JSON.stringify(bookings));
  } catch {
    // Ignore quota errors
  }
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException('Request aborted', 'AbortError'));
      return;
    }
    const timer = window.setTimeout(() => {
      cleanup();
      resolve();
    }, ms);
    const onAbort = () => {
      window.clearTimeout(timer);
      cleanup();
      reject(new DOMException('Request aborted', 'AbortError'));
    };
    const cleanup = () => {
      signal?.removeEventListener('abort', onAbort);
    };
    signal?.addEventListener('abort', onAbort);
  });
}

const LOCAL_ACCOUNTS_STORAGE_KEY = 'seatlock_local_accounts_v1';

interface StoredLocalAccount {
  email: string;
  passwordHash: string;
  name: string;
  provider: 'gmail' | 'email';
  createdAt: string;
}

function loadLocalAccounts(): StoredLocalAccount[] {
  try {
    const raw = localStorage.getItem(LOCAL_ACCOUNTS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as StoredLocalAccount[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveLocalAccounts(accounts: StoredLocalAccount[]): void {
  try {
    localStorage.setItem(LOCAL_ACCOUNTS_STORAGE_KEY, JSON.stringify(accounts));
  } catch {
    // Ignore quota errors
  }
}

function buildDemoSession(
  email: string,
  name: string,
  provider: 'gmail' | 'email' | 'demo'
): AuthSession {
  const normalizedEmail = email.trim().toLowerCase();
  const displayName = name.trim() || extractNameFromEmail(normalizedEmail) || 'Campus Student';
  const initials = getInitialsFromName(displayName);
  const stableSuffix = Math.abs(
    normalizedEmail.split('').reduce((acc, ch) => (acc * 31 + ch.charCodeAt(0)) | 0, 7)
  )
    .toString()
    .slice(0, 4)
    .padStart(4, '0');

  return {
    token: `demo-jwt-${Date.now()}`,
    mode: 'demo',
    user: {
      id: `stu-2026-${stableSuffix}`,
      name: displayName,
      email: normalizedEmail,
      studentId: `UNI-2026-${stableSuffix}`,
      department: provider === 'gmail' ? 'Gmail Verified Student' : 'Computer Science & Engineering',
      avatarInitials: initials,
      provider,
    },
  };
}

function getAuthToken(): string | null {
  try {
    const raw =
      sessionStorage.getItem('seatlock_session_v1') ??
      localStorage.getItem('seatlock_saved_session_v1');
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AuthSession;
    return parsed.token ?? null;
  } catch {
    return null;
  }
}

async function fetchJson<T>(
  path: string,
  options: RequestInit = {},
  timeoutMs = 10000
): Promise<T> {
  const controller = new AbortController();
  const externalSignal = options.signal;
  const onExternalAbort = () => controller.abort();
  externalSignal?.addEventListener('abort', onExternalAbort);

  const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);

  try {
    const token = getAuthToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> | undefined),
    };
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const res = await fetch(`${API_CONFIG.baseUrl}${path}`, {
      ...options,
      headers,
      signal: controller.signal,
    });

    if (!res.ok) {
      let errBody: { message?: string; code?: string; conflictedSeatIds?: string[] } = {};
      try {
        errBody = (await res.json()) as typeof errBody;
      } catch {
        // ignore non-JSON errors
      }
      throw new ApiError(
        errBody.message ?? `Request failed (${res.status})`,
        res.status,
        errBody.code ?? 'API_ERROR',
        errBody.conflictedSeatIds
      );
    }

    return (await res.json()) as T;
  } catch (err) {
    if (err instanceof ApiError) throw err;
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new ApiError('Request timed out or was cancelled.', 408, 'TIMEOUT_OR_ABORT');
    }
    throw new ApiError(
      'Unable to reach the SEATLOCK organizer server. Check your connection and try again.',
      0,
      'NETWORK_ERROR'
    );
  } finally {
    window.clearTimeout(timeoutId);
    externalSignal?.removeEventListener('abort', onExternalAbort);
  }
}

/**
 * Natural-language parser for Local Demo Mode POST /ai/assist
 * Supports English and Hindi prompts like:
 * - "Find two seats together near the stage under ₹300 each."
 * - "Find four affordable seats in the same row."
 * - "Mujhe stage ke paas do seats chahiye."
 */
function runDemoAiParser(
  prompt: string,
  liveSeats: Seat[],
  squadCriteria?: SquadSyncCriteria
): AiAssistResponse {
  if (squadCriteria) {
    const squadRecs = findSquadRecommendations(liveSeats, squadCriteria);
    if (squadRecs.length === 0) {
      return {
        source: 'demo',
        message: `No ${squadCriteria.peopleCount} seats match a max budget of ₹${squadCriteria.maxBudgetPerPerson} in ${squadCriteria.preferredSection}. Try increasing the budget or switching section to Any.`,
        recommendations: [],
      };
    }
    return {
      source: 'demo',
      message: `SquadSync analyzed ${liveSeats.filter((s) => s.status === 'available').length} live seats and found ${squadRecs.length} optimal ${squadCriteria.peopleCount}-seat option${squadRecs.length > 1 ? 's' : ''}.`,
      recommendations: squadRecs,
    };
  }

  const lower = prompt.toLowerCase();

  // Extract seat count (English + Hindi numerals/words)
  let count = 2;
  if (/\b(1|one|single|ek|एक)\b/.test(lower)) count = 1;
  else if (/\b(4|four|char|chaar|चार)\b/.test(lower)) count = 4;
  else if (/\b(3|three|teen|तीन)\b/.test(lower)) count = 3;
  else if (/\b(2|two|couple|pair|do|दो)\b/.test(lower)) count = 2;
  count = Math.min(MAX_SEATS_PER_BOOKING, Math.max(1, count));

  // Extract max budget if mentioned (e.g. "under 300", "₹350", "below 400")
  const budgetMatch = lower.match(/(?:under|below|max|rs\.?|₹|budget|kam)\s*₹?\s*(\d{2,4})/);
  const maxBudget = budgetMatch ? Number(budgetMatch[1]) : 9999;

  const nearStage = /(stage|front|paas|pass|samne|पास|मंच|orchestra)/.test(lower);
  const cheapest = /(cheap|budget|afford|low|sasta|सस्त|value|balcony)/.test(lower);
  const bestView = /(best view|center|sightline|middle|mezzanine|behtareen|अच्छा व्यू)/.test(lower);
  const aisle = /(aisle|corner|edge|exit|bahar|गली)/.test(lower);
  const nearExit = /(exit|gate|quick|bahar|निकास)/.test(lower);
  const together = /(together|same row|adjacent|saath|sath|साथ|group|squad)/.test(lower) || count > 1;
  const middleSection = /(middle|mezzanine|center section|बीच)/.test(lower);

  const preferredSection = middleSection
    ? 'Mezzanine Center'
    : nearStage
      ? 'Orchestra Front'
      : 'Any';

  const criteria: SquadSyncCriteria = {
    peopleCount: count,
    maxBudgetPerPerson: maxBudget,
    preferredSection: preferredSection as SquadSyncCriteria['preferredSection'],
    nearStage,
    bestView: bestView || (!cheapest && !nearStage && !nearExit),
    cheapest,
    aislePreferred: aisle || nearExit,
    adjacentPreferred: together,
  };

  let recs = findSquadRecommendations(liveSeats, criteria);

  // Relax section constraint automatically if strict section + budget yielded 0
  if (recs.length === 0 && criteria.preferredSection !== 'Any') {
    recs = findSquadRecommendations(liveSeats, { ...criteria, preferredSection: 'Any' });
  }

  // Validate every single recommendation through the strict validator
  const validated: AiRecommendation[] = [];
  for (const r of recs) {
    const checked = validateAiRecommendation(r.seatIds, liveSeats, r.reason, r.label);
    if (checked) {
      validated.push({ ...checked, warningNote: r.warningNote });
    }
  }

  if (validated.length === 0) {
    const cheapestAvailable = [...liveSeats]
      .filter((s) => s.status === 'available')
      .sort((a, b) => a.price - b.price)
      .slice(0, count);
    const fallback = validateAiRecommendation(
      cheapestAvailable.map((s) => s.id),
      liveSeats,
      `Your budget of ₹${maxBudget} was below current seat tiers, so here are the lowest-priced available seats instead.`,
      'Lowest Available Alternative'
    );
    return {
      source: 'demo',
      message:
        fallback !== null
          ? `No seats found under ₹${maxBudget} each. Showing the closest affordable seats currently open.`
          : 'No available seats currently match your request.',
      recommendations: fallback ? [fallback] : [],
    };
  }

  const isHindiPrompt = /(mujhe|chahiye|paas|saath|सीट|मंच|चाहिए)/.test(lower);
  const message = isHindiPrompt
    ? `लाइव सीट मैप के आधार पर मैंने आपके लिए ${validated[0].seatIds.join(', ')} का सुझाव तैयार किया है। लागू करने के लिए "Use These Seats" पर क्लिक करें।`
    : `Based on live availability and pricing, here ${validated.length > 1 ? 'are top seat options' : 'is the best seat option'} matching your request. Review and click "Use These Seats" to select.`;

  return {
    source: 'demo',
    message,
    recommendations: validated,
  };
}

export const seatlockApi = {
  isDemoMode: API_CONFIG.isDemoMode,

  /** Checks if an email already has a user-created custom password locally */
  hasRegisteredAccount(email: string): boolean {
    const normalized = email.trim().toLowerCase();
    return loadLocalAccounts().some((acc) => acc.email === normalized);
  },

  /** Create a new student account with a custom password and name derived from the given email / Gmail */
  async register(email: string, password: string): Promise<AuthSession> {
    if (!API_CONFIG.isDemoMode) {
      return fetchJson<AuthSession>('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
    }

    await sleep(500);
    const normalizedEmail = email.trim().toLowerCase();
    if (!isValidEmail(normalizedEmail)) {
      throw new ApiError(
        'Please enter a valid Gmail or university email address.',
        400,
        'INVALID_EMAIL'
      );
    }
    if (password.length < 6) {
      throw new ApiError(
        'Your password must be at least 6 characters long.',
        400,
        'WEAK_PASSWORD'
      );
    }

    const accounts = loadLocalAccounts();
    if (accounts.some((acc) => acc.email === normalizedEmail)) {
      throw new ApiError(
        'This email already has a password set. Switch to Sign In to log in with your password.',
        409,
        'ACCOUNT_EXISTS'
      );
    }

    const displayName = extractNameFromEmail(normalizedEmail);
    const provider: 'gmail' | 'email' = isGmailAddress(normalizedEmail) ? 'gmail' : 'email';
    const newAccount: StoredLocalAccount = {
      email: normalizedEmail,
      passwordHash: hashPasswordLocal(normalizedEmail, password),
      name: displayName,
      provider,
      createdAt: new Date().toISOString(),
    };
    saveLocalAccounts([newAccount, ...accounts]);

    return buildDemoSession(normalizedEmail, displayName, provider);
  },

  /** Resume a saved login profile when the student previously opted to save login info */
  async resumeSavedProfile(email: string, name: string, provider: 'gmail' | 'email' | 'demo'): Promise<AuthSession> {
    await sleep(320);
    return buildDemoSession(email, name, provider);
  },

  /** POST /auth/login */
  async login(email: string, password: string): Promise<AuthSession> {
    if (!API_CONFIG.isDemoMode) {
      return fetchJson<AuthSession>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
    }

    await sleep(550);
    const normalizedEmail = email.trim().toLowerCase();

    if (!isValidEmail(normalizedEmail) || password.trim().length < 6) {
      throw new ApiError(
        'Invalid email or password. Use a valid email ID and a password of at least 6 characters.',
        401,
        'INVALID_CREDENTIALS'
      );
    }

    // Check if the user previously created their own password for this email
    const existingAccount = loadLocalAccounts().find((acc) => acc.email === normalizedEmail);
    if (existingAccount) {
      const providedHash = hashPasswordLocal(normalizedEmail, password);
      if (providedHash !== existingAccount.passwordHash) {
        throw new ApiError(
          'Incorrect password for this account. Please enter the password you created.',
          401,
          'INCORRECT_PASSWORD'
        );
      }
      return buildDemoSession(
        existingAccount.email,
        existingAccount.name,
        existingAccount.provider
      );
    }

    // Explicitly reject wrong test password so login error feedback is genuinely testable
    if (password === 'wrongpassword' || password === 'invalid123' || password === '123456') {
      throw new ApiError(
        'Incorrect password. Double-check your password or switch to Create Account to set your own password.',
        401,
        'INCORRECT_PASSWORD'
      );
    }

    const displayName =
      normalizedEmail === 'student@seatlock.edu'
        ? 'Aarav Sharma'
        : extractNameFromEmail(normalizedEmail);
    const provider: 'gmail' | 'email' | 'demo' =
      normalizedEmail === 'student@seatlock.edu'
        ? 'demo'
        : isGmailAddress(normalizedEmail)
          ? 'gmail'
          : 'email';

    return buildDemoSession(normalizedEmail, displayName, provider);
  },

  /** GET /events */
  async getEvents(): Promise<EventItem[]> {
    if (!API_CONFIG.isDemoMode) {
      return fetchJson<EventItem[]>('/events');
    }
    await sleep(280);
    return DEMO_EVENTS.map((ev) => {
      const seats = ensureDemoSeats(ev.id);
      const remainingSeats = seats.filter((s) => s.status === 'available').length;
      return { ...ev, remainingSeats };
    });
  },

  /** GET /events/:id */
  async getEventById(eventId: string): Promise<EventItem> {
    if (!API_CONFIG.isDemoMode) {
      return fetchJson<EventItem>(`/events/${encodeURIComponent(eventId)}`);
    }
    await sleep(200);
    const ev = DEMO_EVENTS.find((e) => e.id === eventId);
    if (!ev) {
      throw new ApiError('Event not found.', 404, 'EVENT_NOT_FOUND');
    }
    const seats = ensureDemoSeats(ev.id);
    return {
      ...ev,
      remainingSeats: seats.filter((s) => s.status === 'available').length,
    };
  },

  /** GET /events/:id/seats */
  async getEventSeats(eventId: string): Promise<EventSeatsResponse> {
    if (!API_CONFIG.isDemoMode) {
      return fetchJson<EventSeatsResponse>(`/events/${encodeURIComponent(eventId)}/seats`);
    }
    await sleep(240);
    const seats = ensureDemoSeats(eventId);
    // Expire any stale local holds automatically
    const now = Date.now();
    for (const [holdId, hold] of demoHoldsStore.entries()) {
      if (hold.eventId === eventId && new Date(hold.expiresAt).getTime() <= now) {
        hold.seatIds.forEach((sid) => {
          const target = seats.find((s) => s.id === sid);
          if (target && target.status === 'held') {
            target.status = 'available';
            target.heldByMe = false;
          }
        });
        demoHoldsStore.delete(holdId);
      }
    }

    return {
      eventId,
      updatedAt: new Date().toISOString(),
      seats: seats.map((s) => ({ ...s })),
    };
  },

  /**
   * Demo-only helper to deterministically trigger a realistic concurrent seat reservation
   * so users and judges can test SeatShield conflict recovery at any time.
   */
  simulateConcurrentReservation(eventId: string, seatId: string): Seat[] {
    const seats = ensureDemoSeats(eventId);
    const target = seats.find((s) => s.id === seatId);
    if (target && target.status === 'available') {
      target.status = 'held';
      target.heldByMe = false;
    }
    return seats.map((s) => ({ ...s }));
  },

  /** POST /events/:id/hold */
  async holdSeats(eventId: string, seatIds: string[]): Promise<HoldRecord> {
    if (!API_CONFIG.isDemoMode) {
      return fetchJson<HoldRecord>(`/events/${encodeURIComponent(eventId)}/hold`, {
        method: 'POST',
        body: JSON.stringify({ seatIds }),
      });
    }

    await sleep(550);
    if (seatIds.length === 0 || seatIds.length > MAX_SEATS_PER_BOOKING) {
      throw new ApiError(
        `Please select between 1 and ${MAX_SEATS_PER_BOOKING} seats.`,
        400,
        'INVALID_SEAT_COUNT'
      );
    }

    const event = DEMO_EVENTS.find((e) => e.id === eventId);
    if (!event) {
      throw new ApiError('Event not found.', 404, 'EVENT_NOT_FOUND');
    }

    const seats = ensureDemoSeats(eventId);
    const conflicted = seatIds.filter((id) => {
      const s = seats.find((seat) => seat.id === id);
      return !s || s.status !== 'available';
    });

    if (conflicted.length > 0) {
      throw new ApiError(
        `Seat${conflicted.length > 1 ? 's' : ''} ${conflicted.join(', ')} ${
          conflicted.length > 1 ? 'were' : 'was'
        } just reserved by another student.`,
        409,
        'SEAT_CONFLICT',
        conflicted
      );
    }

    const heldSeats: Seat[] = [];
    for (const id of seatIds) {
      const s = seats.find((seat) => seat.id === id)!;
      s.status = 'held';
      s.heldByMe = true;
      heldSeats.push({ ...s });
    }

    const now = Date.now();
    const hold: HoldRecord = {
      holdId: `HLD-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
      eventId: event.id,
      eventTitle: event.title,
      eventPosterUrl: event.posterUrl,
      eventDate: event.date,
      eventTime: event.time,
      venue: event.venue,
      seatIds: [...seatIds],
      seats: heldSeats,
      totalPrice: heldSeats.reduce((sum, s) => sum + s.price, 0),
      createdAt: new Date(now).toISOString(),
      expiresAt: new Date(now + 5 * 60 * 1000).toISOString(),
    };

    demoHoldsStore.set(hold.holdId, hold);
    return hold;
  },

  /** Releases an active local hold when student cancels or returns from checkout */
  async releaseHold(holdId: string): Promise<void> {
    if (!API_CONFIG.isDemoMode) {
      return;
    }
    const hold = demoHoldsStore.get(holdId);
    if (!hold) return;
    const seats = ensureDemoSeats(hold.eventId);
    for (const sid of hold.seatIds) {
      const s = seats.find((seat) => seat.id === sid);
      if (s && s.status === 'held' && s.heldByMe) {
        s.status = 'available';
        s.heldByMe = false;
      }
    }
    demoHoldsStore.delete(holdId);
  },

  /** POST /holds/:id/confirm */
  async confirmBooking(
    holdId: string,
    student: { name: string; email: string }
  ): Promise<BookingRecord> {
    if (!API_CONFIG.isDemoMode) {
      return fetchJson<BookingRecord>(`/holds/${encodeURIComponent(holdId)}/confirm`, {
        method: 'POST',
        body: JSON.stringify({ studentName: student.name, studentEmail: student.email }),
      });
    }

    await sleep(650);
    const hold = demoHoldsStore.get(holdId);
    if (!hold) {
      throw new ApiError(
        'This reservation hold no longer exists or has already been processed.',
        410,
        'HOLD_NOT_FOUND'
      );
    }

    if (new Date(hold.expiresAt).getTime() <= Date.now()) {
      await seatlockApi.releaseHold(holdId);
      throw new ApiError(
        'Your 5-minute seat hold expired. Please select available seats again.',
        410,
        'HOLD_EXPIRED'
      );
    }

    const seats = ensureDemoSeats(hold.eventId);
    for (const sid of hold.seatIds) {
      const s = seats.find((seat) => seat.id === sid);
      if (s) {
        s.status = 'booked';
        s.heldByMe = false;
      }
    }
    demoHoldsStore.delete(holdId);

    const event = DEMO_EVENTS.find((e) => e.id === hold.eventId);
    const bookingId = `SL-2026-${Math.floor(1000 + Math.random() * 9000)}`;
    const record: BookingRecord = {
      id: bookingId,
      eventId: hold.eventId,
      eventTitle: hold.eventTitle,
      eventCategory: event?.category ?? 'Music',
      eventPosterUrl: hold.eventPosterUrl,
      eventDate: hold.eventDate,
      eventTime: hold.eventTime,
      venue: hold.venue,
      studentName: student.name,
      studentEmail: student.email,
      seats: hold.seats.map((s) => ({ id: s.id, section: s.section, price: s.price })),
      totalPrice: hold.totalPrice,
      status: 'confirmed',
      bookedAt: new Date().toISOString(),
      qrPayload: `SEATLOCK|${bookingId}|${hold.eventId}|${hold.seatIds.join(',')}`,
    };

    const existing = loadDemoBookings();
    saveDemoBookings([record, ...existing]);
    return record;
  },

  /** GET /me/bookings */
  async getMyBookings(): Promise<BookingRecord[]> {
    if (!API_CONFIG.isDemoMode) {
      return fetchJson<BookingRecord[]>('/me/bookings');
    }
    await sleep(250);
    return loadDemoBookings();
  },

  /** DELETE /bookings/:id — Enforces 2-hour cancellation window & valid reason for 100% refund */
  async cancelBooking(
    bookingId: string,
    payload: { reasonCategory: string; reasonDetails: string }
  ): Promise<BookingRecord> {
    const reasonCheck = validateCancellationReason(
      payload.reasonCategory,
      payload.reasonDetails
    );
    if (!reasonCheck.valid) {
      throw new ApiError(
        reasonCheck.error ?? 'Please provide a valid cancellation reason to receive a refund.',
        400,
        'INVALID_CANCELLATION_REASON'
      );
    }

    if (!API_CONFIG.isDemoMode) {
      return fetchJson<BookingRecord>(
        `/bookings/${encodeURIComponent(bookingId)}`,
        {
          method: 'DELETE',
          body: JSON.stringify(payload),
        }
      );
    }

    await sleep(450);
    const bookings = loadDemoBookings();
    const target = bookings.find((b) => b.id === bookingId);
    if (!target) {
      throw new ApiError('Booking record not found.', 404, 'BOOKING_NOT_FOUND');
    }

    const eligibility = getCancellationEligibility(target, Date.now());
    if (!eligibility.eligible) {
      throw new ApiError(
        eligibility.statusMessage,
        400,
        'CANCELLATION_WINDOW_EXPIRED'
      );
    }

    // Release seats back to available in local demo store
    const seats = ensureDemoSeats(target.eventId);
    for (const bookedSeat of target.seats) {
      const s = seats.find((seat) => seat.id === bookedSeat.id);
      if (s && s.status === 'booked') {
        s.status = 'available';
      }
    }

    const cancelledRecord: BookingRecord = {
      ...target,
      status: 'cancelled',
      cancelledAt: new Date().toISOString(),
      cancellationReasonCategory: getCancellationCategoryLabel(payload.reasonCategory),
      cancellationReason: payload.reasonDetails.trim(),
      refundAmount: target.totalPrice,
      refundStatus: 'processed',
      refundReference: generateRefundReference(target.id),
    };

    const updated = bookings.map((b) => (b.id === bookingId ? cancelledRecord : b));
    saveDemoBookings(updated);
    return cancelledRecord;
  },

  /** POST /ai/assist (strict 8-second timeout + AbortSignal Stop support) */
  async requestAiAssist(payload: {
    eventId: string;
    prompt: string;
    seats: Seat[];
    squadCriteria?: SquadSyncCriteria;
    signal?: AbortSignal;
  }): Promise<AiAssistResponse> {
    if (!API_CONFIG.isDemoMode) {
      const raw = await fetchJson<{
        message?: string;
        recommendations?: { seatIds: string[]; reason: string; label?: string }[];
      }>(
        '/ai/assist',
        {
          method: 'POST',
          body: JSON.stringify({
            eventId: payload.eventId,
            prompt: payload.prompt,
            squadCriteria: payload.squadCriteria,
            seats: payload.seats.map((s) => ({
              id: s.id,
              row: s.row,
              number: s.number,
              section: s.section,
              price: s.price,
              status: s.status,
              isAisle: s.isAisle,
              stageDistance: s.stageDistance,
            })),
          }),
          signal: payload.signal,
        },
        8000
      );

      const validated: AiRecommendation[] = [];
      for (const item of raw.recommendations ?? []) {
        const checked = validateAiRecommendation(
          item.seatIds ?? [],
          payload.seats,
          item.reason ?? 'Recommended based on live availability.',
          item.label ?? 'AI Recommended'
        );
        if (checked) validated.push(checked);
      }

      return {
        source: 'api',
        message: raw.message ?? 'Here are the recommended seats from SeatSense AI.',
        recommendations: validated,
      };
    }

    // Enforce 8s timeout race even in demo mode & support Stop button via AbortSignal
    const timeoutController = new AbortController();
    const timer = window.setTimeout(() => timeoutController.abort(), 8000);
    const onAbort = () => timeoutController.abort();
    payload.signal?.addEventListener('abort', onAbort);

    try {
      await sleep(700, timeoutController.signal);
      return runDemoAiParser(payload.prompt, payload.seats, payload.squadCriteria);
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        throw new ApiError('SeatSense AI request was stopped or timed out after 8 seconds.', 408, 'AI_ABORTED');
      }
      throw err;
    } finally {
      window.clearTimeout(timer);
      payload.signal?.removeEventListener('abort', onAbort);
    }
  },
};
