const {
    calculate,
    calculateActiveInvestments,
    calculateBuckets,
    calculateFixedCosts,
    calculateGuiltFreeSpending,
    calculateSavingsGoals,
    calculateWealthProjection,
    estimateBankNet,
} = require('../../src/calculator');

describe('estimateBankNet', () => {
    test('10000 gross estimates 6800 bank net', () => {
        expect(estimateBankNet(10000)).toBe(6800.00);
    });

    test('rounds to 2 decimal places', () => {
        expect(estimateBankNet(9999)).toBe(parseFloat((9999 * 0.68).toFixed(2)));
    });
});

describe('individual formulas', () => {
    test('fixed costs default to the 55% midpoint', () => {
        expect(calculateFixedCosts(10000)).toBe(5500);
    });

    test('savings goals are 10% of bank net', () => {
        expect(calculateSavingsGoals(10000)).toBe(1000);
    });

    test('active investments are 10% of bank net', () => {
        expect(calculateActiveInvestments(10000)).toBe(1000);
    });

    test('guilt-free spending defaults to the 27.5% midpoint', () => {
        expect(calculateGuiltFreeSpending(10000)).toBe(2750);
    });
});

describe('calculateBuckets', () => {
    test('returns all four assignment buckets', () => {
        const b = calculateBuckets(1000);
        ['fixedCosts', 'savingsGoals', 'activeInvestments', 'guiltFreeSpending']
            .forEach((key) => expect(b).toHaveProperty(key));
    });

    test('uses assignment midpoint defaults', () => {
        expect(calculateBuckets(10000)).toEqual({
            fixedCosts: 5500,
            savingsGoals: 1000,
            activeInvestments: 1000,
            guiltFreeSpending: 2750,
        });
    });

    test('accepts custom bucket rates', () => {
        expect(calculateBuckets(10000, {
            fixedCosts: 0.50,
            savingsGoals: 0.15,
            activeInvestments: 0.20,
            guiltFreeSpending: 0.15,
        })).toEqual({
            fixedCosts: 5000,
            savingsGoals: 1500,
            activeInvestments: 2000,
            guiltFreeSpending: 1500,
        });
    });
});

describe('calculateWealthProjection', () => {
    test('returns one value per year', () => {
        expect(calculateWealthProjection(500, 10)).toHaveLength(10);
    });

    test('values grow monotonically', () => {
        const proj = calculateWealthProjection(1000, 5);
        for (let i = 1; i < proj.length; i++) {
            expect(proj[i].value).toBeGreaterThan(proj[i - 1].value);
        }
    });

    test('uses fixed 7% annual return for each assignment year', () => {
        expect(calculateWealthProjection(1000, 1)[0]).toEqual({
            year: 1,
            value: 1070,
        });
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

    test('uses custom active investment rate for projection', () => {
        const result = calculate(10000, 5000, 1, { activeInvestments: 0.20 });
        expect(result.activeInvestments).toBe(1000);
        expect(result.wealthProjection[0].value).toBe(1070);
    });
});
