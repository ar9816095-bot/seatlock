import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  evaluatePasswordStrength,
  extractNameFromEmail,
  getInitialsFromName,
  hashPasswordLocal,
  isGmailAddress,
  isValidEmail,
} from './authHelpers.ts';

describe('authHelpers — Gmail & email profile extraction', () => {
  it('detects Gmail addresses accurately regardless of casing', () => {
    assert.equal(isGmailAddress('akash.rana@gmail.com'), true);
    assert.equal(isGmailAddress('Akash.Rana@GMAIL.COM'), true);
    assert.equal(isGmailAddress('student@googlemail.com'), true);
    assert.equal(isGmailAddress('student@seatlock.edu'), false);
    assert.equal(isGmailAddress('not-an-email'), false);
  });

  it('extracts clean full names from Gmail and university emails', () => {
    assert.equal(extractNameFromEmail('akash.rana@gmail.com'), 'Akash Rana');
    assert.equal(extractNameFromEmail('akash_rana98@gmail.com'), 'Akash Rana');
    assert.equal(extractNameFromEmail('priya-verma+fest@gmail.com'), 'Priya Verma');
    assert.equal(extractNameFromEmail('akashRana2026@gmail.com'), 'Akash Rana');
    assert.equal(extractNameFromEmail('ar9816095@gmail.com'), 'Ar');
    assert.equal(extractNameFromEmail('rohan.kumar.sharma@seatlock.edu'), 'Rohan Kumar Sharma');
  });

  it('generates clean uppercase initials', () => {
    assert.equal(getInitialsFromName('Akash Rana'), 'AR');
    assert.equal(getInitialsFromName('Ar'), 'AR');
    assert.equal(getInitialsFromName('Priya'), 'PR');
  });

  it('validates email formatting cleanly', () => {
    assert.equal(isValidEmail('akash.rana@gmail.com'), true);
    assert.equal(isValidEmail('bad-email'), false);
    assert.equal(isValidEmail('missing@domain'), false);
  });

  it('evaluates password strength accurately', () => {
    assert.equal(evaluatePasswordStrength('12345').isValid, false);
    assert.equal(evaluatePasswordStrength('12345').label, 'Too short');
    assert.equal(evaluatePasswordStrength('abcdef').isValid, true);
    assert.equal(evaluatePasswordStrength('SeatLock2026!').score, 4);
    assert.equal(evaluatePasswordStrength('SeatLock2026!').label, 'Very strong');
  });

  it('produces deterministic salted hashes that never contain plaintext password', () => {
    const hashA = hashPasswordLocal('akash.rana@gmail.com', 'MySecret99!');
    const hashB = hashPasswordLocal('AKASH.RANA@gmail.com', 'MySecret99!');
    const hashDiff = hashPasswordLocal('akash.rana@gmail.com', 'OtherPass99!');
    assert.equal(hashA, hashB);
    assert.notEqual(hashA, hashDiff);
    assert.equal(hashA.includes('MySecret99!'), false);
  });
});
