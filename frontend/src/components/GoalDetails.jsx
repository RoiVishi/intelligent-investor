import { currencies, convertCurrency } from './CurrencySelector.jsx';

function addMonths(date, months) {
  const next = new Date(date);
  next.setMonth(next.getMonth() + months);
  return next;
}

export default function GoalDetails({
  goal,
  globalCurrency,
  formatMoney,
  onContributionChange,
  onCurrencyChange,
}) {
  if (!goal) {
    return null;
  }

  const remaining = Math.max(goal.targetAmount - goal.currentAmount, 0);
  const monthly = Math.max(Number(goal.monthlyContribution) || 0, 0);
  const monthsLeft = monthly > 0 ? Math.ceil(remaining / monthly) : null;
  const completionDate = monthsLeft === null
    ? 'Set a monthly contribution'
    : addMonths(new Date(), monthsLeft).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  const convertedRemaining = convertCurrency(remaining, goal.currency, globalCurrency);

  return (
    <section className="goal-details">
      <div className="section-title compact">
        <span>03</span>
        <h2>{goal.name} breakdown</h2>
      </div>
      <div className="detail-grid">
        <div>
          <span>Remaining</span>
          <strong>{formatMoney(convertedRemaining)}</strong>
        </div>
        <div>
          <span>Time to reach goal</span>
          <strong>{monthsLeft === null ? 'n/a' : `${monthsLeft} months`}</strong>
        </div>
        <div>
          <span>Estimated completion date</span>
          <strong>{completionDate}</strong>
        </div>
      </div>

      <div className="detail-controls">
        <label htmlFor="goalCurrency">
          <span>Goal currency</span>
          <select id="goalCurrency" value={goal.currency} onChange={(event) => onCurrencyChange(goal.id, event.target.value)}>
            {Object.entries(currencies).map(([code, currency]) => (
              <option key={code} value={code}>{currency.symbol} {currency.label}</option>
            ))}
          </select>
        </label>
        <div className="slider-row">
          <label htmlFor="monthlyContribution">
            <span>Monthly Contribution</span>
            <strong>{formatMoney(convertCurrency(monthly, goal.currency, globalCurrency))}</strong>
          </label>
          <input
            id="monthlyContribution"
            type="range"
            min="0"
            max={Math.max(goal.targetAmount / 4, monthly, 1000)}
            step="100"
            value={monthly}
            onChange={(event) => onContributionChange(goal.id, Number(event.target.value))}
            style={{ '--value': `${Math.min((monthly / Math.max(goal.targetAmount / 4, monthly, 1000)) * 100, 100)}%` }}
          />
        </div>
      </div>
    </section>
  );
}
