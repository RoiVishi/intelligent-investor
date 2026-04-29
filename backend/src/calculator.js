// calculator.js — PURE MATH ONLY. No Express, no req, no res.
/**
* Estimate take-home (bank net) from gross salary.
* Israeli taxes ≈ 32% → we keep 68%
*/
function estimateBankNet(gross) {
 return parseFloat((gross * 0.68).toFixed(2));
}
/**
* Split bank net into 4 spending / investing buckets.
* ALL percentages are of BANK NET — not gross.
* Buckets sum to exactly 100%: 52.5 + 10 + 10 + 27.5 = 100
*/
function calculateBuckets(bankNet) {
 return {
 fixedCosts: parseFloat((bankNet * 0.525).toFixed(2)), // 52.5%
 savingsGoals: parseFloat((bankNet * 0.10).toFixed(2)), // 10%
 activeInvestments: parseFloat((bankNet * 0.10).toFixed(2)), // 10%
 guiltFreeSpending: parseFloat((bankNet * 0.275).toFixed(2)), // 27.5%
 };
}
/**
* Project how savings grow over N years at 7% annual return.
* Uses correct Future Value of a monthly annuity formula:
* FV = PMT × (((1 + r/12)^(n×12) − 1) / (r/12))
* where PMT = monthly investment, r = 0.07, n = years
*/
function calculateWealthProjection(monthlyInvestment, years = 15) {
 const monthlyRate = 0.07 / 12;
 const projection = [];
 for (let year = 1; year <= years; year++) {
 const n = year * 12;
 const value = monthlyInvestment *
 ((Math.pow(1 + monthlyRate, n) - 1) / monthlyRate);
 projection.push(Number(value.toFixed(2)));
 }
 return projection;
}
/**
* MASTER FUNCTION — called by the route handler.
* Combines all calculations into one result object.
*/
function calculate(grossSalary, bankNet = null, years = 15) {
const resolvedBankNet = bankNet ?? estimateBankNet(grossSalary);
 const buckets = calculateBuckets(resolvedBankNet);
 const y = Number(years);
 const clampedYears = Number.isFinite(y) ? Math.min(Math.max(y, 1), 15) : 15;
 const wealthProjection = calculateWealthProjection(
 buckets.activeInvestments, clampedYears
 );
 return { grossSalary, bankNet: resolvedBankNet, ...buckets, wealthProjection };
}
module.exports = { calculate, calculateBuckets, calculateWealthProjection, estimateBankNet
};