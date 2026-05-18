const DEFAULT_ANNUAL_RETURN = 0.07;

export function clampYears(years) {
  const parsed = Number(years);
  return Number.isFinite(parsed) ? Math.min(Math.max(Math.trunc(parsed), 1), 15) : 15;
}

export function calculateClientSide(grossSalary, bankNet, years = 15) {
  const safeGross = Number(grossSalary) || 0;
  const safeBankNet = Number(bankNet) || safeGross * 0.68;
  const activeInvestments = safeBankNet * 0.10;

  return {
    grossSalary: Number(safeGross.toFixed(2)),
    bankNet: Number(safeBankNet.toFixed(2)),
    fixedCosts: Number((safeBankNet * 0.55).toFixed(2)),
    savingsGoals: Number((safeBankNet * 0.10).toFixed(2)),
    activeInvestments: Number(activeInvestments.toFixed(2)),
    guiltFreeSpending: Number((safeBankNet * 0.275).toFixed(2)),
    wealthProjection: Array.from({ length: clampYears(years) }, (_, index) => ({
      year: index + 1,
      value: Number((activeInvestments * Math.pow(1 + DEFAULT_ANNUAL_RETURN, index + 1)).toFixed(2)),
    })),
  };
}

export function formatCurrency(value) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'ILS',
    maximumFractionDigits: 0,
  }).format(value || 0);
}
