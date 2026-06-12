const DEFAULT_ANNUAL_RETURN = 0.07;
export const DEFAULT_ALLOCATION = {
  fixedCosts: 55,
  savingsGoals: 10,
  activeInvestments: 10,
  guiltFreeSpending: 25,
};

export function clampYears(years) {
  const parsed = Number(years);
  return Number.isFinite(parsed) ? Math.min(Math.max(Math.trunc(parsed), 1), 15) : 15;
}

function rateFromPercent(allocation, key) {
  const percent = Number(allocation?.[key] ?? DEFAULT_ALLOCATION[key]);
  return Number.isFinite(percent) ? percent / 100 : DEFAULT_ALLOCATION[key] / 100;
}

// Future value of recurring deposits: each year's contributions are added
// at the start of the year and the whole balance compounds at the fixed return.
// Must stay in sync with backend/src/calculator.js.
export function projectRecurringInvestment(monthlyInvestment, annualReturn, years) {
  const annualContribution = (Number(monthlyInvestment) || 0) * 12;
  const projection = [];
  let value = 0;

  for (let year = 1; year <= clampYears(years); year += 1) {
    value = (value + annualContribution) * (1 + annualReturn);
    projection.push({ year, value: Number(value.toFixed(2)) });
  }

  return projection;
}

export function calculateClientSide(grossSalary, bankNet, years = 15, allocation = DEFAULT_ALLOCATION) {
  const safeGross = Number(grossSalary) || 0;
  const safeBankNet = Number(bankNet) || safeGross * 0.68;
  const fixedCosts = safeBankNet * rateFromPercent(allocation, 'fixedCosts');
  const savingsGoals = safeBankNet * rateFromPercent(allocation, 'savingsGoals');
  const activeInvestments = safeBankNet * rateFromPercent(allocation, 'activeInvestments');
  const guiltFreeSpending = safeBankNet * rateFromPercent(allocation, 'guiltFreeSpending');

  return {
    grossSalary: Number(safeGross.toFixed(2)),
    bankNet: Number(safeBankNet.toFixed(2)),
    fixedCosts: Number(fixedCosts.toFixed(2)),
    savingsGoals: Number(savingsGoals.toFixed(2)),
    activeInvestments: Number(activeInvestments.toFixed(2)),
    guiltFreeSpending: Number(guiltFreeSpending.toFixed(2)),
    wealthProjection: projectRecurringInvestment(activeInvestments, DEFAULT_ANNUAL_RETURN, years),
  };
}

// Deterministic PRNG so the simulation is stable across re-renders and testable.
function mulberry32(seed) {
  let state = seed;
  return () => {
    state |= 0;
    state = (state + 0x6D2B79F5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Monte Carlo projection: simulates yearly market returns drawn from a normal
// distribution (Box-Muller) around the mean return, using the same
// contribute-then-compound model as projectRecurringInvestment.
export function simulateWealthProjection(monthlyInvestment, years, options = {}) {
  const {
    runs = 1000,
    meanReturn = 0.07,
    volatility = 0.15,
    seed = 1337,
  } = options;
  const annualContribution = (Number(monthlyInvestment) || 0) * 12;
  const yearCount = clampYears(years);
  const random = mulberry32(seed);
  const valuesPerYear = Array.from({ length: yearCount }, () => []);

  for (let run = 0; run < runs; run += 1) {
    let value = 0;
    for (let yearIndex = 0; yearIndex < yearCount; yearIndex += 1) {
      const u1 = Math.max(random(), 1e-12);
      const u2 = random();
      const gaussian = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
      const annualReturn = meanReturn + volatility * gaussian;
      value = Math.max((value + annualContribution) * (1 + annualReturn), 0);
      valuesPerYear[yearIndex].push(value);
    }
  }

  return valuesPerYear.map((values, yearIndex) => {
    const sorted = [...values].sort((left, right) => left - right);
    const percentile = (p) => sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))];
    return {
      year: yearIndex + 1,
      p10: Number(percentile(0.10).toFixed(2)),
      p50: Number(percentile(0.50).toFixed(2)),
      p90: Number(percentile(0.90).toFixed(2)),
    };
  });
}

export function formatCurrency(value, currency = 'ILS') {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(value || 0);
}
