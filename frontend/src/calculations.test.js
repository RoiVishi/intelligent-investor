import { describe, expect, test } from 'vitest';
import { projectRecurringInvestment, simulateWealthProjection } from './calculations';

describe('simulateWealthProjection', () => {
  test('returns one entry per projection year', () => {
    expect(simulateWealthProjection(1000, 10)).toHaveLength(10);
    expect(simulateWealthProjection(1000, 20)).toHaveLength(15);
  });

  test('percentiles are ordered p10 <= p50 <= p90 for every year', () => {
    simulateWealthProjection(1000, 15).forEach((point) => {
      expect(point.p10).toBeLessThanOrEqual(point.p50);
      expect(point.p50).toBeLessThanOrEqual(point.p90);
    });
  });

  test('is deterministic for the same seed and varies with a different seed', () => {
    const first = simulateWealthProjection(1000, 5);
    const second = simulateWealthProjection(1000, 5);
    const reseeded = simulateWealthProjection(1000, 5, { seed: 7 });
    expect(first).toEqual(second);
    expect(reseeded).not.toEqual(first);
  });

  test('median roughly tracks the deterministic 7% projection', () => {
    const fixed = projectRecurringInvestment(1000, 0.07, 15);
    const simulated = simulateWealthProjection(1000, 15);
    const fixedFinal = fixed.at(-1).value;
    const medianFinal = simulated.at(-1).p50;
    expect(medianFinal).toBeGreaterThan(fixedFinal * 0.6);
    expect(medianFinal).toBeLessThan(fixedFinal * 1.4);
  });

  test('zero investment produces an all-zero band', () => {
    simulateWealthProjection(0, 5).forEach((point) => {
      expect(point.p10).toBe(0);
      expect(point.p50).toBe(0);
      expect(point.p90).toBe(0);
    });
  });
});
