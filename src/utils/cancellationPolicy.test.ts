import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  CANCELLATION_WINDOW_MS,
  getCancellationEligibility,
  validateCancellationReason,
} from './cancellationPolicy.ts';
import { computeRadiusScale, isHexColorDark } from './themePresets.ts';

describe('cancellationPolicy — 2-hour cancel window & refund reason validation', () => {
  const futureEventDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  it('allows cancellation with 100% refund within 2 hours of booking', () => {
    const now = Date.now();
    const booked20MinsAgo = new Date(now - 20 * 60 * 1000).toISOString();
    const result = getCancellationEligibility(
      {
        status: 'confirmed',
        bookedAt: booked20MinsAgo,
        eventDate: futureEventDate,
        totalPrice: 720,
      },
      now
    );

    assert.equal(result.eligible, true);
    assert.equal(result.refundAmount, 720);
    assert.equal(result.formattedRemaining, '1h 40m');
  });

  it('blocks cancellation once more than 2 hours have passed since booking', () => {
    const now = Date.now();
    const bookedOver2HoursAgo = new Date(now - CANCELLATION_WINDOW_MS - 60_000).toISOString();
    const result = getCancellationEligibility(
      {
        status: 'confirmed',
        bookedAt: bookedOver2HoursAgo,
        eventDate: futureEventDate,
        totalPrice: 520,
      },
      now
    );

    assert.equal(result.eligible, false);
    assert.equal(result.refundAmount, 0);
    assert.match(result.statusMessage, /2-hour/i);
  });

  it('rejects empty, short, or gibberish cancellation reasons', () => {
    assert.equal(validateCancellationReason('', 'I have an exam tomorrow morning').valid, false);
    assert.equal(validateCancellationReason('schedule_conflict', 'too short').valid, false);
    assert.equal(validateCancellationReason('schedule_conflict', 'aaaaaaaaaaaaaaaaaa').valid, false);
    assert.equal(validateCancellationReason('schedule_conflict', 'no no no no no no').valid, false);
  });

  it('accepts genuine detailed cancellation reasons with a valid category', () => {
    const ok = validateCancellationReason(
      'schedule_conflict',
      'My university lab viva was rescheduled to the exact same evening.'
    );
    assert.equal(ok.valid, true);
    assert.equal(ok.error, undefined);
  });
});

describe('themePresets — background luminance & border radius scale', () => {
  it('accurately detects dark vs light custom hex backgrounds', () => {
    assert.equal(isHexColorDark('#090E1C'), true);
    assert.equal(isHexColorDark('#061511'), true);
    assert.equal(isHexColorDark('#F8FAFC'), false);
    assert.equal(isHexColorDark('#F4F1EA'), false);
  });

  it('scales Tailwind v4 border radius CSS variables smoothly from 0px to 24px', () => {
    const sharp = computeRadiusScale(0);
    assert.equal(sharp['--radius-2xl'], '0px');
    assert.equal(sharp['--radius-lg'], '0px');

    const rounded = computeRadiusScale(16);
    assert.equal(rounded['--radius-2xl'], '16px');
    assert.equal(rounded['--radius-xl'], '12px');

    const soft = computeRadiusScale(24);
    assert.equal(soft['--radius-2xl'], '24px');
    assert.equal(soft['--radius-3xl'], '36px');
  });
});
