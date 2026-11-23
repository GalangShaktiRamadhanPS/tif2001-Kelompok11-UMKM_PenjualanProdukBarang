const test = require('node:test');
const assert = require('node:assert/strict');
const { canTransitionOrderStatus, isValidOrderStatus } = require('../src/order-status');

test('accepts only known order statuses', () => {
  assert.equal(isValidOrderStatus('cancelled'), true);
  assert.equal(isValidOrderStatus('unknown'), false);
});

test('a cancelled order cannot be reactivated', () => {
  assert.equal(canTransitionOrderStatus('cancelled', 'processing'), false);
  assert.equal(canTransitionOrderStatus('cancelled', 'cancelled'), true);
});

test('an active order can be cancelled', () => {
  assert.equal(canTransitionOrderStatus('processing', 'cancelled'), true);
});
