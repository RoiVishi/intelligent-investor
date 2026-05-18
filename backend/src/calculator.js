const DEFAULT_FIXED_COSTS_RATE = 0.55;
const SAVINGS_GOALS_RATE = 0.10;
const ACTIVE_INVESTMENTS_RATE = 0.10;
const DEFAULT_GUILT_FREE_RATE = 0.275;
const DEFAULT_ANNUAL_RETURN = 0.07;
const DEFAULT_YEARS = 15;

function roundMoney(value) {
  return Number(value.toFixed(2));
}

function estimateBankNet(grossSalary) {
  return roundMoney(Number(grossSalary) * 0.68);
}

function calculateFixedCosts(bankNet, rate = DEFAULT_FIXED_COSTS_RATE) {
  return roundMoney(Number(bankNet) * rate);
}

function calculateSavingsGoals(bankNet) {
  return roundMoney(Number(bankNet) * SAVINGS_GOALS_RATE);
}

function calculateActiveInvestments(bankNet) {
  return roundMoney(Number(bankNet) * ACTIVE_INVESTMENTS_RATE);
}

function calculateGuiltFreeSpending(bankNet, rate = DEFAULT_GUILT_FREE_RATE) {
  return roundMoney(Number(bankNet) * rate);
}

function calculateBuckets(bankNet) {
  return {
    fixedCosts: calculateFixedCosts(bankNet),
    savingsGoals: calculateSavingsGoals(bankNet),
    activeInvestments: calculateActiveInvestments(bankNet),
    guiltFreeSpending: calculateGuiltFreeSpending(bankNet),
  };
}

function clampYears(years = DEFAULT_YEARS) {
  const parsedYears = Number(years);
  return Number.isFinite(parsedYears)
    ? Math.min(Math.max(Math.trunc(parsedYears), 1), DEFAULT_YEARS)
    : DEFAULT_YEARS;
}

function calculateWealthProjection(investment, years = DEFAULT_YEARS) {
  const projectionYears = clampYears(years);

  return Array.from({ length: projectionYears }, (_, index) => {
    const year = index + 1;
    const value = Number(investment) * Math.pow(1 + DEFAULT_ANNUAL_RETURN, year);
    return {
      year,
      value: roundMoney(value),
    };
  });
}

function calculate(grossSalary, bankNet = null, years = DEFAULT_YEARS) {
  const resolvedGrossSalary = Number(grossSalary);
  const resolvedBankNet = bankNet === null || bankNet === undefined
    ? estimateBankNet(resolvedGrossSalary)
    : roundMoney(Number(bankNet));
  const buckets = calculateBuckets(resolvedBankNet);
  const wealthProjection = calculateWealthProjection(
    buckets.activeInvestments,
    years,
  );

  return {
    grossSalary: roundMoney(resolvedGrossSalary),
    bankNet: resolvedBankNet,
    ...buckets,
    wealthProjection,
  };
}

module.exports = {
  calculate,
  calculateActiveInvestments,
  calculateBuckets,
  calculateFixedCosts,
  calculateGuiltFreeSpending,
  calculateSavingsGoals,
  calculateWealthProjection,
  estimateBankNet,
};
