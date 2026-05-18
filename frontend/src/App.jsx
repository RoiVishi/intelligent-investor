import { useEffect, useMemo, useState } from 'react';
import { DEFAULT_ALLOCATION, calculateClientSide, clampYears, formatCurrency } from './calculations';

const API_BASE_URL = window.API_BASE_URL || 'http://localhost:3001';

const bucketLabels = [
  ['fixedCosts', 'Fixed Costs', 'costs'],
  ['savingsGoals', 'Savings Goals', 'savings'],
  ['activeInvestments', 'Active Investments', 'investments'],
  ['guiltFreeSpending', 'Guilt-Free Spending', 'spending'],
];

const scenarios = [
  ['Conservative', 0.08, 0.05],
  ['Balanced', 0.10, 0.07],
  ['Aggressive', 0.15, 0.09],
];

function projectMonthlyInvestment(monthlyInvestment, annualReturn, years) {
  return Array.from({ length: clampYears(years) }, (_, index) => ({
    year: index + 1,
    value: Number((monthlyInvestment * Math.pow(1 + annualReturn, index + 1)).toFixed(2)),
  }));
}

function monthsToGoal(monthlyAmount, target) {
  const safeMonthly = Number(monthlyAmount) || 0;
  const safeTarget = Number(target) || 0;

  if (safeMonthly <= 0 || safeTarget <= 0) {
    return null;
  }

  return Math.ceil(safeTarget / safeMonthly);
}

function parsePositiveField(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function validateForm(form, goalTarget, allocation) {
  const errors = [];
  const grossSalary = parsePositiveField(form.grossSalary);
  const bankNet = parsePositiveField(form.bankNet);
  const years = Number(form.years);
  const goal = parsePositiveField(goalTarget);
  const allocationTotal = Object.values(allocation).reduce((sum, value) => sum + parsePositiveField(value), 0);

  if (!form.name.trim()) {
    errors.push('Name is required.');
  }

  if (grossSalary <= 0) {
    errors.push('Gross salary must be greater than 0.');
  }

  if (grossSalary > 1000000) {
    errors.push('Gross salary looks too high for a monthly salary.');
  }

  if (bankNet <= 0) {
    errors.push('Bank net must be greater than 0.');
  }

  if (grossSalary > 0 && bankNet > grossSalary) {
    errors.push('Bank net cannot be higher than gross salary.');
  }

  if (!Number.isInteger(years) || years < 1 || years > 15) {
    errors.push('Projection years must be a whole number between 1 and 15.');
  }

  if (goal <= 0) {
    errors.push('Savings goal must be greater than 0.');
  }

  if (goal > 100000000) {
    errors.push('Savings goal is too high for this planner.');
  }

  Object.entries(allocation).forEach(([key, value]) => {
    const percent = parsePositiveField(value);
    if (percent < 0 || percent > 100) {
      errors.push(`${key} percentage must be between 0 and 100.`);
    }
  });

  if (allocationTotal > 100) {
    errors.push('Allocation percentages cannot add up to more than 100%.');
  }

  if (parsePositiveField(allocation.activeInvestments) <= 0) {
    errors.push('Active investments percentage must be greater than 0.');
  }

  return errors;
}

function ProjectionChart({ projection }) {
  const width = 720;
  const height = 300;
  const pad = { top: 18, right: 20, bottom: 34, left: 72 };
  const values = projection.map((point) => point.value);
  const maxValue = Math.max(...values, 1);
  const xStep = projection.length > 1
    ? (width - pad.left - pad.right) / (projection.length - 1)
    : 0;
  const yScale = (height - pad.top - pad.bottom) / maxValue;
  const points = projection.map((point, index) => {
    const x = pad.left + index * xStep;
    const y = height - pad.bottom - point.value * yScale;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
  const visibleYearLabels = projection.filter(
    (_, index) => index === 0 || index === projection.length - 1 || (index + 1) % 5 === 0,
  );

  return (
    <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Investment projection chart">
      <defs>
        <linearGradient id="projectionFill" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#2563eb" stopOpacity="0.18" />
          <stop offset="100%" stopColor="#2563eb" stopOpacity="0" />
        </linearGradient>
      </defs>
      <rect x="0" y="0" width={width} height={height} fill="transparent" />
      {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
        const y = height - pad.bottom - maxValue * ratio * yScale;
        return (
          <g key={ratio}>
            <line x1={pad.left} y1={y} x2={width - pad.right} y2={y} stroke="#d8e0ea" strokeDasharray="4 6" />
            <text className="axis-label" x="8" y={y + 4}>{formatCurrency(maxValue * ratio)}</text>
          </g>
        );
      })}
      <polygon
        points={`${pad.left},${height - pad.bottom} ${points} ${width - pad.right},${height - pad.bottom}`}
        fill="url(#projectionFill)"
      />
      <polyline
        points={points}
        fill="none"
        stroke="#2563eb"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {projection.map((point, index) => {
        const x = pad.left + index * xStep;
        const y = height - pad.bottom - point.value * yScale;
        return <circle key={point.year} cx={x} cy={y} r="3.5" fill="#ffffff" stroke="#2563eb" strokeWidth="3" />;
      })}
      {visibleYearLabels.map((point, index) => {
        const originalIndex = projection.findIndex((item) => item.year === point.year);
        const x = pad.left + originalIndex * xStep;
        const anchor = index === visibleYearLabels.length - 1 ? 'end' : 'middle';
        return (
          <text key={point.year} className="axis-label" x={x} y={height - 10} textAnchor={anchor}>
            Y{point.year}
          </text>
        );
      })}
    </svg>
  );
}

export default function App() {
  const [form, setForm] = useState({
    name: 'Roi',
    grossSalary: 10000,
    bankNet: 6800,
    years: 15,
  });
  const [goalTarget, setGoalTarget] = useState(100000);
  const [allocation, setAllocation] = useState(DEFAULT_ALLOCATION);
  const [result, setResult] = useState(() => calculateClientSide(10000, 6800, 15, DEFAULT_ALLOCATION));
  const [message, setMessage] = useState('');
  const [apiStatus, setApiStatus] = useState('Backend: checking...');

  const liveResult = useMemo(
    () => calculateClientSide(form.grossSalary, form.bankNet, form.years, allocation),
    [form.grossSalary, form.bankNet, form.years, allocation],
  );
  const displayResult = result || liveResult;
  const endingProjectionValue = displayResult.wealthProjection.at(-1)?.value || 0;
  const yearlyInvestment = displayResult.activeInvestments * 12;
  const statusClass = apiStatus.includes('connected') ? 'status connected' : 'status';
  const goalMonths = monthsToGoal(displayResult.savingsGoals, goalTarget);
  const allocationTotal = Object.values(allocation).reduce((sum, value) => sum + parsePositiveField(value), 0);
  const validationErrors = validateForm(form, goalTarget, allocation);
  const hasValidationErrors = validationErrors.length > 0;
  const grossSalary = parsePositiveField(form.grossSalary);
  const bankNet = parsePositiveField(form.bankNet);
  const netRatio = grossSalary > 0 ? bankNet / grossSalary : 0;
  const scenarioResults = scenarios.map(([label, investmentRate, annualReturn]) => {
    const monthlyInvestment = bankNet * investmentRate;
    const projection = projectMonthlyInvestment(monthlyInvestment, annualReturn, form.years);

    return {
      label,
      annualReturn,
      investmentRate,
      monthlyInvestment,
      endingValue: projection.at(-1)?.value || 0,
    };
  });
  const insights = [
    netRatio > 1
      ? ['warning', 'Bank net is higher than gross salary. Fix this before saving.']
      : netRatio > 0.85
        ? ['warning', 'Bank net is unusually close to gross salary. Double-check the numbers.']
        : netRatio < 0.45
          ? ['warning', 'Bank net is low compared with gross salary. Taxes or deductions may be very high.']
          : ['good', 'Bank net looks reasonable compared with gross salary.'],
    goalMonths
      ? goalMonths > 120
        ? ['warning', `This goal may take about ${goalMonths} months at the current savings rate.`]
        : ['good', `At the current savings rate, the goal can be reached in about ${goalMonths} months.`]
      : ['warning', 'Add a savings goal to estimate the timeline.'],
    clampYears(form.years) < 5
      ? ['warning', 'A short projection can understate the compounding effect.']
      : ['good', 'Projection horizon is long enough to show compounding.'],
  ];

  useEffect(() => {
    setResult(liveResult);
  }, [liveResult]);

  useEffect(() => {
    fetch(`${API_BASE_URL}/health`)
      .then((response) => setApiStatus(response.ok ? 'Backend: connected' : 'Backend: unavailable'))
      .catch(() => setApiStatus('Backend: unavailable'));
  }, []);

  function updateField(event) {
    const { name, value } = event.target;
    setMessage('');
    setForm((current) => ({
      ...current,
      [name]: name === 'name' ? value : value === '' ? '' : Number(value),
    }));
  }

  function updateAllocation(event) {
    const { name, value } = event.target;
    setMessage('');
    setAllocation((current) => ({
      ...current,
      [name]: value === '' ? '' : Number(value),
    }));
  }

  function requestPayload() {
    return {
      ...form,
      allocation,
    };
  }

  async function postJson(path, payload) {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Request failed');
    }

    return data;
  }

  async function calculate(event) {
    event.preventDefault();

    if (hasValidationErrors) {
      setMessage(validationErrors[0]);
      return;
    }

    try {
      const data = await postJson('/calculate', requestPayload());
      setResult(data);
      setMessage('');
    } catch (err) {
      setResult(liveResult);
      setMessage(`${err.message}. Showing local calculation.`);
    }
  }

  async function saveProfile() {
    if (hasValidationErrors) {
      setMessage(validationErrors[0]);
      return;
    }

    try {
      const data = await postJson('/calculate/profiles', requestPayload());
      setResult(data.calculation);
      setMessage('Profile saved.');
    } catch (err) {
      setMessage(err.message);
    }
  }

  function exportPdf() {
    window.print();
  }

  return (
    <main>
      <header className="app-header">
        <div className="headline">
          <span className="eyebrow">Financial planning dashboard</span>
          <h1>Intelligent Investor</h1>
          <p>Common Sense Spending buckets and a fixed 7% investment projection.</p>
        </div>
        <p id="api-status" className={statusClass}>{apiStatus}</p>
      </header>

      <div className="layout">
        <form className="panel" onSubmit={calculate}>
          <div className="section-title">
            <span>01</span>
            <h2>Financial profile</h2>
          </div>

          <label htmlFor="name">Name</label>
          <input id="name" name="name" value={form.name} onChange={updateField} autoComplete="name" />

          <label htmlFor="grossSalary">Gross salary</label>
          <input
            id="grossSalary"
            name="grossSalary"
            type="number"
            min="1"
            max="1000000"
            step="1"
            value={form.grossSalary}
            onChange={updateField}
          />

          <label htmlFor="bankNet">Bank net</label>
          <input
            id="bankNet"
            name="bankNet"
            type="number"
            min="1"
            max="1000000"
            step="1"
            value={form.bankNet}
            onChange={updateField}
          />

          <label htmlFor="years">Projection years</label>
          <input
            id="years"
            name="years"
            type="number"
            min="1"
            max="15"
            step="1"
            value={form.years}
            onChange={updateField}
          />

          <label htmlFor="goalTarget">Savings goal</label>
          <input
            id="goalTarget"
            name="goalTarget"
            type="number"
            min="1"
            max="100000000"
            step="1"
            value={goalTarget}
            onChange={(event) => setGoalTarget(event.target.value === '' ? '' : Number(event.target.value))}
          />

          <div className="allocation-controls">
            <div className="allocation-header">
              <h3>Bucket percentages</h3>
              <strong>{allocationTotal}%</strong>
            </div>
            {bucketLabels.map(([key, label]) => (
              <label className="percent-row" htmlFor={`${key}Percent`} key={key}>
                <span>{label}</span>
                <input
                  id={`${key}Percent`}
                  name={key}
                  type="number"
                  min="0"
                  max="100"
                  step="1"
                  value={allocation[key]}
                  onChange={updateAllocation}
                />
              </label>
            ))}
          </div>

          <button type="submit" disabled={hasValidationErrors}>Calculate</button>
          <div className="actions">
            <button type="button" className="secondary" onClick={saveProfile} disabled={hasValidationErrors}>Save</button>
            <button type="button" className="secondary" onClick={exportPdf}>Export PDF</button>
          </div>
          <div className={message === 'Profile saved.' ? 'notice success' : 'notice'} role="status">{message}</div>
          {hasValidationErrors && (
            <div className="validation-list" aria-label="Validation errors">
              {validationErrors.map((error) => (
                <p key={error}>{error}</p>
              ))}
            </div>
          )}
        </form>

        <section>
          <div className="summary-strip" aria-label="Financial summary">
            <div>
              <span>Monthly bank net</span>
              <strong>{formatCurrency(bankNet)}</strong>
            </div>
            <div>
              <span>Monthly investing</span>
              <strong>{formatCurrency(displayResult.activeInvestments)}</strong>
            </div>
            <div>
              <span>Annual investing</span>
              <strong>{formatCurrency(yearlyInvestment)}</strong>
            </div>
            <div>
              <span>Projected value</span>
              <strong>{formatCurrency(endingProjectionValue)}</strong>
            </div>
          </div>

          <div className="buckets" data-testid="bucket-grid">
            {bucketLabels.map(([key, label, tone]) => (
              <article className={`bucket ${tone}`} key={key}>
                <div className="bucket-top">
                  <strong>{label}</strong>
                  <small>{parsePositiveField(allocation[key])}%</small>
                </div>
                <span data-testid={key}>{formatCurrency(displayResult[key])}</span>
              </article>
            ))}
          </div>

          <div className="feature-grid">
            <section className="feature-card goal-card">
              <div className="section-title compact">
                <span>03</span>
                <h2>Savings goal</h2>
              </div>
              <strong>{formatCurrency(goalTarget)}</strong>
              <p>
                {goalMonths
                  ? `${goalMonths} months at ${formatCurrency(displayResult.savingsGoals)} per month.`
                  : 'Set a goal to calculate the timeline.'}
              </p>
            </section>

            <section className="feature-card insights-card">
              <div className="section-title compact">
                <span>04</span>
                <h2>Smart insights</h2>
              </div>
              <div className="insight-list">
                {insights.map(([tone, text]) => (
                  <p className={`insight ${tone}`} key={text}>{text}</p>
                ))}
              </div>
            </section>
          </div>

          <section className="scenario-panel">
            <div className="section-title compact">
              <span>05</span>
              <h2>Scenario comparison</h2>
            </div>
            <div className="scenario-grid">
              {scenarioResults.map((scenario) => (
                <article className="scenario" key={scenario.label}>
                  <strong>{scenario.label}</strong>
                  <span>{formatCurrency(scenario.endingValue)}</span>
                  <p>
                    {(scenario.investmentRate * 100).toFixed(0)}% invested,
                    {' '}
                    {(scenario.annualReturn * 100).toFixed(0)}% return
                  </p>
                </article>
              ))}
            </div>
          </section>

          <div className="chart-panel">
            <div className="section-title">
              <span>06</span>
              <h2>{clampYears(form.years)}-year investment projection</h2>
            </div>
            <div className="chart-frame">
              <ProjectionChart projection={displayResult.wealthProjection} />
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
