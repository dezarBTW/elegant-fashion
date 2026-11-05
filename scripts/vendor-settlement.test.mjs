import assert from 'node:assert/strict';
import { test } from 'node:test';
import { deliveryDeadline, returnDeadline, returnRequestAllowed, vendorPaymentEligible } from '../src/lib/vendorSettlement.mjs';

test('confirmed delivery starts a three-day return window and a hold blocks payout', () => {
  const confirmedAt = '2026-11-05T12:00:00.000Z';
  const before = Date.parse('2026-11-08T11:59:59.999Z');
  const end = Date.parse('2026-11-08T12:00:00.000Z');
  assert.equal(returnDeadline(confirmedAt), '2026-11-08T12:00:00.000Z');
  assert.equal(deliveryDeadline(confirmedAt), '2026-11-12T12:00:00.000Z');
  assert.equal(returnRequestAllowed({ confirmedAt, now: before }), true);
  assert.equal(returnRequestAllowed({ confirmedAt, now: end }), false);
  assert.equal(vendorPaymentEligible({ confirmedAt, hasOpenRequest: false, now: before }), false);
  assert.equal(vendorPaymentEligible({ confirmedAt, hasOpenRequest: true, now: end }), false);
  assert.equal(vendorPaymentEligible({ confirmedAt, hasOpenRequest: false, now: end }), true);
  assert.equal(vendorPaymentEligible({ confirmedAt: null, hasOpenRequest: false, now: end }), false);
});
