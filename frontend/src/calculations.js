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

export function formatCurrency(value, currency = 'ILS') {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(value || 0);
}
