const {
    estimateBankNet, calculateBuckets,
    calculateWealthProjection, calculate,
} = require('../../src/calculator');
describe('estimateBankNet', () => {
    test('10000 gross → 6800 net', () => {
        expect(estimateBankNet(10000)).toBe(6800.00);
    });
    test('rounds to 2 decimal places', () => {
        expect(estimateBankNet(9999)).toBe(parseFloat((9999 * 0.68).toFixed(2)));
    });
});
describe('calculateBuckets', () => {
    test('buckets sum to 100% of bankNet', () => {
    const b = calculateBuckets(6800);
    const sum = b.fixedCosts + b.savingsGoals +
        b.activeInvestments + b.guiltFreeSpending;
    expect(sum).toBeCloseTo(6800, 1);
    });
    test('fixedCosts is 52.5%', () => {
    expect(calculateBuckets(10000).fixedCosts).toBe(5250);
    });
    test('returns all 4 keys', () => {
        const b = calculateBuckets(1000);
        ['fixedCosts','savingsGoals','activeInvestments','guiltFreeSpending']
            .forEach(k => expect(b).toHaveProperty(k));
    });
});
describe('calculateWealthProjection', () => {
    test('returns array of correct length', () => {
        expect(calculateWealthProjection(500, 10)).toHaveLength(10);
    });
    test('values grow monotonically', () => {
        const proj = calculateWealthProjection(1000, 5);
        for (let i = 1; i < proj.length; i++)
            expect(proj[i]).toBeGreaterThan(proj[i - 1]);
    });
    test('680/mo year 1 ≈ 8427 (monthly annuity FV)', () => {
        expect(calculateWealthProjection(680, 1)[0]).toBeCloseTo(8426.96, 0);
    });
});
describe('calculate (master)', () => {
    test('auto-calculates bankNet', () => {
        expect(calculate(10000).bankNet).toBe(6800);
    });
    test('accepts explicit bankNet override', () => {
        expect(calculate(10000, 5000).bankNet).toBe(5000);
    });
    test('defaults to 15 years', () => {
        expect(calculate(10000).wealthProjection).toHaveLength(15);
    });
    test('clamps years > 15 to 15', () => {
        expect(calculate(10000, null, 20).wealthProjection).toHaveLength(15);
    });
    test('clamps years < 1 to 1', () => {
        expect(calculate(10000, null, 0).wealthProjection).toHaveLength(1);
    });
});