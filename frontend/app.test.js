const test = require('node:test');
const assert = require('node:assert/strict');
const { calculateClientSide } = require('./app');

test('entering salary values updates displayed bucket amounts', () => {
  const result = calculateClientSide(10000, 7000, 15);

  assert.equal(result.fixedCosts, 3850);
  assert.equal(result.savingsGoals, 700);
  assert.equal(result.activeInvestments, 700);
  assert.equal(result.guiltFreeSpending, 1925);
  assert.equal(result.wealthProjection.length, 15);
});
