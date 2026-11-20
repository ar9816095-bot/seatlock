import type {
  AiRecommendation,
  BookingRecord,
  HeatTier,
  Seat,
  SeatConflict,
  SquadSyncCriteria,
} from '../types';

export const MAX_SEATS_PER_BOOKING = 4;

export interface SeatSelectionResult {
  nextSeatIds: string[];
  errorCode?: 'UNAVAILABLE' | 'MAX_LIMIT';
}

/**
 * Validates and toggles a seat selection while strictly enforcing
 * the 4-seat maximum and blocking unavailable seats.
 */
export function toggleSeatSelection(
  currentSelectedIds: string[],
  seat: Seat
): SeatSelectionResult {
  if (currentSelectedIds.includes(seat.id)) {
    return {
      nextSeatIds: currentSelectedIds.filter((id) => id !== seat.id),
    };
  }

  if (seat.status !== 'available') {
    return {
      nextSeatIds: currentSelectedIds,
      errorCode: 'UNAVAILABLE',
    };
  }

  if (currentSelectedIds.length >= MAX_SEATS_PER_BOOKING) {
    return {
      nextSeatIds: currentSelectedIds,
      errorCode: 'MAX_LIMIT',
    };
  }

  return {
    nextSeatIds: [...currentSelectedIds, seat.id],
  };
}

/**
 * Calculates total ticket price for selected seat IDs.
 */
export function calculateTotalPrice(seats: Seat[], selectedIds: string[]): number {
  const seatMap = new Map(seats.map((s) => [s.id, s]));
  return selectedIds.reduce((sum, id) => {
    const seat = seatMap.get(id);
    return sum + (seat ? seat.price : 0);
  }, 0);
}

export interface PriceTierThresholds {
  minPrice: number;
  maxPrice: number;
  budgetMax: number;
  midMax: number;
}

/**
 * Computes Budget / Mid-range / Premium price thresholds dynamically
 * from actual event seat prices.
 */
export function computePriceTierThresholds(seats: Seat[]): PriceTierThresholds {
  if (seats.length === 0) {
    return { minPrice: 0, maxPrice: 0, budgetMax: 0, midMax: 0 };
  }
  const uniquePrices = Array.from(new Set(seats.map((s) => s.price))).sort((a, b) => a - b);
  const minPrice = uniquePrices[0];
  const maxPrice = uniquePrices[uniquePrices.length - 1];

  if (uniquePrices.length === 1) {
    return { minPrice, maxPrice, budgetMax: minPrice, midMax: maxPrice };
  }
  if (uniquePrices.length === 2) {
    return { minPrice, maxPrice, budgetMax: uniquePrices[0], midMax: uniquePrices[0] };
  }

  const range = maxPrice - minPrice;
  const budgetMax = Math.floor(minPrice + range / 3);
  const midMax = Math.floor(minPrice + (range * 2) / 3);

  return { minPrice, maxPrice, budgetMax, midMax };
}

export function getSeatHeatTier(price: number, thresholds: PriceTierThresholds): HeatTier {
  if (price <= thresholds.budgetMax) return 'budget';
  if (price <= thresholds.midMax) return 'mid';
  return 'premium';
}

/**
 * Validates AI-proposed seat IDs against current live seat availability,
 * removing unknown, unavailable, duplicate, or >4 seat proposals.
 */
export function validateAiRecommendation(
  proposedSeatIds: string[],
  liveSeats: Seat[],
  reason: string,
  label: string
): AiRecommendation | null {
  const seatMap = new Map(liveSeats.map((s) => [s.id, s]));
  const seen = new Set<string>();
  const validSeats: Seat[] = [];

  for (const id of proposedSeatIds) {
    const normalized = id.trim().toUpperCase();
    if (seen.has(normalized)) continue;
    const found = seatMap.get(normalized);
    if (!found || found.status !== 'available') continue;
    seen.add(normalized);
    validSeats.push(found);
    if (validSeats.length === MAX_SEATS_PER_BOOKING) break;
  }

  if (validSeats.length === 0) return null;

  const isAdjacent = areSeatsAdjacent(validSeats);
  const totalPrice = validSeats.reduce((sum, s) => sum + s.price, 0);

  return {
    id: `rec-${validSeats.map((s) => s.id).join('-')}`,
    seatIds: validSeats.map((s) => s.id),
    seats: validSeats,
    totalPrice,
    reason,
    label,
    isAdjacent,
  };
}

/**
 * Checks whether a set of seats sit contiguously in the same row
 * without crossing the center auditorium aisle (between seats 6 and 7).
 */
export function areSeatsAdjacent(seats: Seat[]): boolean {
  if (seats.length <= 1) return true;
  const row = seats[0].row;
  if (seats.some((s) => s.row !== row)) return false;

  const sorted = [...seats].sort((a, b) => a.number - b.number);
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1].number;
    const curr = sorted[i].number;
    if (curr !== prev + 1) return false;
    // Center aisle splits seat 6 and seat 7 in our 12-seat auditorium rows
    if (prev === 6 && curr === 7) return false;
  }
  return true;
}

/**
 * Finds best squad seating groups from live seats according to SquadSync criteria.
 * Guarantees availability, budget, and provides non-adjacent fallback when adjacent seats are sold out.
 */
export function findSquadRecommendations(
  liveSeats: Seat[],
  criteria: SquadSyncCriteria
): AiRecommendation[] {
  const count = Math.min(Math.max(1, criteria.peopleCount), MAX_SEATS_PER_BOOKING);
  const eligible = liveSeats.filter((seat) => {
    if (seat.status !== 'available') return false;
    if (seat.price > criteria.maxBudgetPerPerson) return false;
    if (criteria.preferredSection !== 'Any' && seat.section !== criteria.preferredSection) {
      return false;
    }
    return true;
  });

  if (eligible.length < count) {
    return [];
  }

  const scoreSeat = (seat: Seat): number => {
    let score = 0;
    if (criteria.bestView) score += seat.viewScore * 1.4;
    if (criteria.nearStage) score += (11 - seat.stageDistance) * 14;
    if (criteria.cheapest) score += Math.max(0, 1200 - seat.price) * 0.25;
    if (criteria.aislePreferred && seat.isAisle) score += 35;
    // Balanced default preference
    if (!criteria.bestView && !criteria.nearStage && !criteria.cheapest) {
      score += seat.viewScore * 0.8 + (11 - seat.stageDistance) * 4;
    }
    return score;
  };

  const byRow = new Map<string, Seat[]>();
  for (const s of eligible) {
    const list = byRow.get(s.row) ?? [];
    list.push(s);
    byRow.set(s.row, list);
  }

  const adjacentGroups: { seats: Seat[]; score: number }[] = [];
  for (const rowSeats of byRow.values()) {
    const sorted = [...rowSeats].sort((a, b) => a.number - b.number);
    for (let i = 0; i <= sorted.length - count; i++) {
      const slice = sorted.slice(i, i + count);
      if (areSeatsAdjacent(slice)) {
        const groupScore = slice.reduce((acc, s) => acc + scoreSeat(s), 0) / count;
        adjacentGroups.push({ seats: slice, score: groupScore });
      }
    }
  }

  adjacentGroups.sort((a, b) => b.score - a.score);

  const results: AiRecommendation[] = [];
  const usedKeys = new Set<string>();

  if (criteria.adjacentPreferred && adjacentGroups.length > 0) {
    for (const grp of adjacentGroups.slice(0, 3)) {
      const key = grp.seats.map((s) => s.id).join(',');
      if (usedKeys.has(key)) continue;
      usedKeys.add(key);
      const section = grp.seats[0].section;
      const row = grp.seats[0].row;
      const avgPrice = Math.round(grp.seats.reduce((s, x) => s + x.price, 0) / count);
      results.push({
        id: `squad-${key}`,
        seatIds: grp.seats.map((s) => s.id),
        seats: grp.seats,
        totalPrice: grp.seats.reduce((sum, s) => sum + s.price, 0),
        isAdjacent: true,
        label: count === 1 ? `Top Pick · Row ${row}` : `${count} Adjacent Seats · Row ${row}`,
        reason: `Together in ${section} (Row ${row}), ₹${avgPrice}/seat within your ₹${criteria.maxBudgetPerPerson} budget${
          criteria.aislePreferred && grp.seats.some((s) => s.isAisle) ? ', includes aisle access' : ''
        }.`,
      });
    }
    return results;
  }

  // Fallback when adjacent seats are unavailable or not required
  const rankedSeats = [...eligible].sort((a, b) => scoreSeat(b) - scoreSeat(a));
  const fallbackSeats = rankedSeats.slice(0, count);
  const fallbackAdjacent = areSeatsAdjacent(fallbackSeats);
  const fallbackKey = fallbackSeats.map((s) => s.id).join(',');
  results.push({
    id: `squad-fallback-${fallbackKey}`,
    seatIds: fallbackSeats.map((s) => s.id),
    seats: fallbackSeats,
    totalPrice: fallbackSeats.reduce((sum, s) => sum + s.price, 0),
    isAdjacent: fallbackAdjacent,
    label: fallbackAdjacent ? `Best Match · ${count} Seats` : `Nearby Split Seating · ${count} Seats`,
    reason: fallbackAdjacent
      ? `Matched ${count} seats under ₹${criteria.maxBudgetPerPerson} per person.`
      : `No ${count} contiguous seats remain within your exact criteria, so these closest high-rated seats were selected instead.`,
    warningNote:
      criteria.adjacentPreferred && !fallbackAdjacent
        ? `Adjacent block of ${count} seats is currently sold out for these filters. Showing closest nearby alternative.`
        : undefined,
  });

  return results;
}

/**
 * SeatShield: Detects seats in the user's selection that became unavailable
 * and finds the closest available alternative (preferring same row, similar price,
 * and adjacency to remaining valid selected seats).
 */
export function detectSeatConflicts(
  selectedSeatIds: string[],
  previousSeats: Seat[],
  updatedSeats: Seat[]
): {
  remainingValidSeatIds: string[];
  conflicts: SeatConflict[];
} {
  const prevMap = new Map(previousSeats.map((s) => [s.id, s]));
  const updatedMap = new Map(updatedSeats.map((s) => [s.id, s]));

  const remainingValidSeatIds: string[] = [];
  const conflictedIds: string[] = [];

  for (const id of selectedSeatIds) {
    const live = updatedMap.get(id);
    if (live && (live.status === 'available' || (live.status === 'held' && live.heldByMe))) {
      remainingValidSeatIds.push(id);
    } else {
      conflictedIds.push(id);
    }
  }

  if (conflictedIds.length === 0) {
    return { remainingValidSeatIds, conflicts: [] };
  }

  const reservedAlternatives = new Set<string>(remainingValidSeatIds);
  const remainingSeats = remainingValidSeatIds
    .map((id) => updatedMap.get(id))
    .filter((s): s is Seat => Boolean(s));

  const conflicts: SeatConflict[] = conflictedIds.map((id) => {
    const original = updatedMap.get(id) ?? prevMap.get(id)!;
    const alternative = findBestAlternativeSeat(original, updatedSeats, remainingSeats, reservedAlternatives);
    if (alternative) {
      reservedAlternatives.add(alternative.id);
    }

    const priceDelta = alternative ? alternative.price - original.price : 0;
    const priceNote =
      alternative === null
        ? ''
        : priceDelta === 0
          ? 'at the same price'
          : priceDelta < 0
            ? `for ₹${Math.abs(priceDelta)} less`
            : `for ₹${priceDelta} more`;

    const message = alternative
      ? `Seat ${original.id} was just reserved by another student. Seat ${alternative.id} is available nearby ${priceNote}.`
      : `Seat ${original.id} was just reserved by another student and no nearby alternative is available.`;

    return {
      id: `conflict-${original.id}-${Date.now()}`,
      originalSeat: original,
      alternativeSeat: alternative,
      detectedAt: new Date().toISOString(),
      message,
    };
  });

  return { remainingValidSeatIds, conflicts };
}

function findBestAlternativeSeat(
  original: Seat,
  updatedSeats: Seat[],
  remainingSelected: Seat[],
  excludedIds: Set<string>
): Seat | null {
  const candidates = updatedSeats.filter(
    (s) => s.status === 'available' && !excludedIds.has(s.id) && s.id !== original.id
  );
  if (candidates.length === 0) return null;

  const scoreCandidate = (cand: Seat): number => {
    let score = 0;
    // Strongly prefer same row
    if (cand.row === original.row) score += 120;
    // Prefer same section
    if (cand.section === original.section) score += 45;
    // Distance from original seat number
    const colDist = Math.abs(cand.number - original.number);
    const rowDist = Math.abs(cand.stageDistance - original.stageDistance);
    score -= colDist * 10 + rowDist * 22;
    // Price similarity
    const priceDiff = Math.abs(cand.price - original.price);
    score -= priceDiff * 0.25;
    // Bonus if adjacent to any remaining valid selected seat
    for (const rem of remainingSelected) {
      if (areSeatsAdjacent([rem, cand])) {
        score += 100;
      }
    }
    return score;
  };

  candidates.sort((a, b) => scoreCandidate(b) - scoreCandidate(a));
  return candidates[0];
}

/**
 * Calculates remaining hold milliseconds and formatted MM:SS strictly
 * from the server-issued expiration timestamp (tab-sleep safe).
 */
export function computeRemainingHoldTime(expiresAtIso: string, nowMs: number = Date.now()): {
  remainingMs: number;
  remainingSeconds: number;
  formatted: string;
  progressRatio: number; // 1.0 -> 0.0 over 5 minutes
  isWarning: boolean;
  isExpired: boolean;
} {
  const totalHoldMs = 5 * 60 * 1000;
  const expiresMs = new Date(expiresAtIso).getTime();
  const remainingMs = Math.max(0, expiresMs - nowMs);
  const remainingSeconds = Math.ceil(remainingMs / 1000);
  const mins = Math.floor(remainingSeconds / 60);
  const secs = remainingSeconds % 60;
  const formatted = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  const progressRatio = Math.min(1, Math.max(0, remainingMs / totalHoldMs));

  return {
    remainingMs,
    remainingSeconds,
    formatted,
    progressRatio,
    isWarning: remainingMs > 0 && remainingMs <= 60 * 1000,
    isExpired: remainingMs <= 0,
  };
}

/**
 * Generates an RFC 5545 compliant .ics calendar invitation for a confirmed SeatPass ticket.
 */
export function generateBookingICS(booking: BookingRecord): string {
  const startDate = new Date(booking.eventDate);
  const endDate = new Date(startDate.getTime() + 2 * 60 * 60 * 1000);

  const toIcsUtc = (d: Date): string =>
    d
      .toISOString()
      .replace(/[-:]/g, '')
      .replace(/\.\d{3}Z$/, 'Z');

  const seatList = booking.seats.map((s) => s.id).join(', ');
  const escapeIcs = (str: string) =>
    str.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//SEATLOCK//SeatPass Ticket//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${booking.id}@seatlock.university`,
    `DTSTAMP:${toIcsUtc(new Date())}`,
    `DTSTART:${toIcsUtc(startDate)}`,
    `DTEND:${toIcsUtc(endDate)}`,
    `SUMMARY:${escapeIcs(`SEATLOCK: ${booking.eventTitle}`)}`,
    `LOCATION:${escapeIcs(booking.venue)}`,
    `DESCRIPTION:${escapeIcs(
      `SeatPass Confirmed Ticket\\nBooking ID: ${booking.id}\\nSeats: ${seatList}\\nTotal Paid: ₹${booking.totalPrice}`
    )}`,
    'STATUS:CONFIRMED',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
}
