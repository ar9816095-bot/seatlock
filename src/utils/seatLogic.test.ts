import test from 'node:test';
import assert from 'node:assert/strict';
import {
  areSeatsAdjacent,
  calculateTotalPrice,
  computePriceTierThresholds,
  computeRemainingHoldTime,
  detectSeatConflicts,
  findSquadRecommendations,
  generateBookingICS,
  getSeatHeatTier,
  toggleSeatSelection,
  validateAiRecommendation,
} from './seatLogic';
import type { BookingRecord, Seat } from '../types';

function makeSeat(overrides: Partial<Seat> & { id: string; row: string; number: number }): Seat {
  return {
    section: 'Orchestra Front',
    price: 300,
    status: 'available',
    isAisle: overrides.number === 1 || overrides.number === 6 || overrides.number === 7 || overrides.number === 12,
    nearExit: overrides.number === 1 || overrides.number === 12,
    stageDistance: 1,
    viewScore: 95,
    ...overrides,
  };
}

const sampleSeats: Seat[] = [
  makeSeat({ id: 'A1', row: 'A', number: 1, price: 500, section: 'Orchestra Front', stageDistance: 1, viewScore: 92 }),
  makeSeat({ id: 'A2', row: 'A', number: 2, price: 500, section: 'Orchestra Front', stageDistance: 1, viewScore: 96 }),
  makeSeat({ id: 'A3', row: 'A', number: 3, price: 500, section: 'Orchestra Front', stageDistance: 1, viewScore: 98 }),
  makeSeat({ id: 'A4', row: 'A', number: 4, price: 500, section: 'Orchestra Front', stageDistance: 1, viewScore: 99 }),
  makeSeat({ id: 'A5', row: 'A', number: 5, price: 500, section: 'Orchestra Front', stageDistance: 1, viewScore: 99 }),
  makeSeat({ id: 'A6', row: 'A', number: 6, price: 500, section: 'Orchestra Front', stageDistance: 1, viewScore: 97 }),
  makeSeat({ id: 'A7', row: 'A', number: 7, price: 500, section: 'Orchestra Front', stageDistance: 1, viewScore: 97 }),
  makeSeat({ id: 'B1', row: 'B', number: 1, price: 320, section: 'Mezzanine Center', stageDistance: 4, viewScore: 86 }),
  makeSeat({ id: 'B2', row: 'B', number: 2, price: 320, section: 'Mezzanine Center', stageDistance: 4, viewScore: 88, status: 'booked' }),
  makeSeat({ id: 'C1', row: 'C', number: 1, price: 180, section: 'Balcony', stageDistance: 8, viewScore: 72 }),
  makeSeat({ id: 'C2', row: 'C', number: 2, price: 180, section: 'Balcony', stageDistance: 8, viewScore: 74 }),
];

test('toggleSeatSelection enforces 4-seat maximum and blocks unavailable seats', () => {
  const bookedSeat = sampleSeats.find((s) => s.id === 'B2')!;
  const blockedAttempt = toggleSeatSelection(['A1'], bookedSeat);
  assert.equal(blockedAttempt.errorCode, 'UNAVAILABLE');
  assert.deepEqual(blockedAttempt.nextSeatIds, ['A1']);

  const fifthSeat = sampleSeats.find((s) => s.id === 'A5')!;
  const maxAttempt = toggleSeatSelection(['A1', 'A2', 'A3', 'A4'], fifthSeat);
  assert.equal(maxAttempt.errorCode, 'MAX_LIMIT');
  assert.equal(maxAttempt.nextSeatIds.length, 4);

  // Deselecting works even when 4 seats are selected
  const deselect = toggleSeatSelection(['A1', 'A2', 'A3', 'A4'], sampleSeats[0]);
  assert.equal(deselect.errorCode, undefined);
  assert.deepEqual(deselect.nextSeatIds, ['A2', 'A3', 'A4']);
});

test('calculateTotalPrice sums live seat prices accurately', () => {
  assert.equal(calculateTotalPrice(sampleSeats, ['A1', 'B1', 'C1']), 1000);
});

test('computePriceTierThresholds and getSeatHeatTier classify Budget, Mid-range, Premium dynamically', () => {
  const thresholds = computePriceTierThresholds(sampleSeats);
  assert.equal(getSeatHeatTier(180, thresholds), 'budget');
  assert.equal(getSeatHeatTier(320, thresholds), 'mid');
  assert.equal(getSeatHeatTier(500, thresholds), 'premium');
});

test('areSeatsAdjacent respects center aisle break between seats 6 and 7', () => {
  const a5 = sampleSeats.find((s) => s.id === 'A5')!;
  const a6 = sampleSeats.find((s) => s.id === 'A6')!;
  const a7 = sampleSeats.find((s) => s.id === 'A7')!;
  assert.equal(areSeatsAdjacent([a5, a6]), true);
  assert.equal(areSeatsAdjacent([a6, a7]), false);
});

test('validateAiRecommendation removes duplicates, unavailable seats, and enforces max 4', () => {
  const rec = validateAiRecommendation(
    ['A1', 'A1', 'B2', 'A2', 'A3', 'A4', 'A5', 'Z99'],
    sampleSeats,
    'Great view near stage',
    'AI Best View'
  );
  assert.ok(rec);
  assert.deepEqual(rec.seatIds, ['A1', 'A2', 'A3', 'A4']);
  assert.equal(rec.totalPrice, 2000);
});

test('findSquadRecommendations finds adjacent group and falls back gracefully when adjacent unavailable', () => {
  const adjacentRes = findSquadRecommendations(sampleSeats, {
    peopleCount: 2,
    maxBudgetPerPerson: 200,
    preferredSection: 'Any',
    nearStage: false,
    bestView: false,
    cheapest: true,
    aislePreferred: false,
    adjacentPreferred: true,
  });
  assert.equal(adjacentRes.length, 1);
  assert.deepEqual(adjacentRes[0].seatIds, ['C1', 'C2']);
  assert.equal(adjacentRes[0].isAdjacent, true);

  // Ask for 3 seats under 350 -> only B1, C1, C2 exist (not 3 adjacent)
  const fallbackRes = findSquadRecommendations(sampleSeats, {
    peopleCount: 3,
    maxBudgetPerPerson: 350,
    preferredSection: 'Any',
    nearStage: false,
    bestView: false,
    cheapest: true,
    aislePreferred: false,
    adjacentPreferred: true,
  });
  assert.equal(fallbackRes.length, 1);
  assert.equal(fallbackRes[0].seatIds.length, 3);
  assert.equal(fallbackRes[0].isAdjacent, false);
  assert.ok(fallbackRes[0].warningNote);
});

test('detectSeatConflicts preserves valid selected seats and suggests nearby same-row alternative', () => {
  const updatedSeats = sampleSeats.map((s) =>
    s.id === 'A5' ? { ...s, status: 'held' as const } : s
  );
  const { remainingValidSeatIds, conflicts } = detectSeatConflicts(
    ['A4', 'A5'],
    sampleSeats,
    updatedSeats
  );
  assert.deepEqual(remainingValidSeatIds, ['A4']);
  assert.equal(conflicts.length, 1);
  assert.equal(conflicts[0].originalSeat.id, 'A5');
  // A3 is adjacent to remaining A4 in same row at same price!
  assert.equal(conflicts[0].alternativeSeat?.id, 'A3');
  assert.match(conflicts[0].message, /Seat A5 was just reserved/);
});

test('computeRemainingHoldTime computes countdown accurately from expiresAt timestamp', () => {
  const now = Date.UTC(2026, 10, 20, 12, 0, 0);
  const fiftySecsLater = new Date(now + 50 * 1000).toISOString();
  const state = computeRemainingHoldTime(fiftySecsLater, now);
  assert.equal(state.formatted, '00:50');
  assert.equal(state.isWarning, true);
  assert.equal(state.isExpired, false);

  const expired = computeRemainingHoldTime(new Date(now - 5000).toISOString(), now);
  assert.equal(expired.isExpired, true);
  assert.equal(expired.formatted, '00:00');
});

test('generateBookingICS outputs valid VCALENDAR with booking details', () => {
  const booking: BookingRecord = {
    id: 'SL-2026-9012',
    eventId: 'evt-music',
    eventTitle: 'Echoes Music Festival',
    eventCategory: 'Music',
    eventPosterUrl: '/src/assets/images/event_music_festival_1795154865596.jpg',
    eventDate: '2026-12-05T18:30:00.000Z',
    eventTime: '6:30 PM',
    venue: 'Main Open-Air Amphitheater',
    studentName: 'Aarav Sharma',
    studentEmail: 'student@seatlock.edu',
    seats: [{ id: 'A4', section: 'Orchestra Front', price: 450 }],
    totalPrice: 450,
    status: 'confirmed',
    bookedAt: '2026-11-19T10:00:00.000Z',
    qrPayload: 'SEATLOCK|SL-2026-9012|A4',
  };
  const ics = generateBookingICS(booking);
  assert.match(ics, /BEGIN:VCALENDAR/);
  assert.match(ics, /SUMMARY:SEATLOCK: Echoes Music Festival/);
  assert.match(ics, /Seats: A4/);
  assert.match(ics, /END:VCALENDAR/);
});
