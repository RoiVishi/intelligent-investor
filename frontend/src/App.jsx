import { useEffect, useMemo, useState } from 'react';
import { calculateClientSide, clampYears, formatCurrency } from './calculations';

const API_BASE_URL = window.API_BASE_URL || 'http://localhost:3001';

const bucketLabels = [
  ['fixedCosts', 'Fixed Costs', '55% midpoint', 'costs'],
  ['savingsGoals', 'Savings Goals', '10%', 'savings'],
  ['activeInvestments', 'Active Investments', '10%', 'investments'],
  ['guiltFreeSpending', 'Guilt-Free Spending', '27.5% midpoint', 'spending'],
];

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
  const [result, setResult] = useState(() => calculateClientSide(10000, 6800, 15));
  const [message, setMessage] = useState('');
  const [apiStatus, setApiStatus] = useState('Backend: checking...');

  const liveResult = useMemo(
    () => calculateClientSide(form.grossSalary, form.bankNet, form.years),
    [form.grossSalary, form.bankNet, form.years],
  );
  const displayResult = result || liveResult;
  const endingProjectionValue = displayResult.wealthProjection.at(-1)?.value || 0;
  const yearlyInvestment = displayResult.activeInvestments * 12;
  const statusClass = apiStatus.includes('connected') ? 'status connected' : 'status';

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
      [name]: name === 'name' ? value : Number(value),
    }));
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

    try {
      const data = await postJson('/calculate', form);
      setResult(data);
      setMessage('');
    } catch (err) {
      setResult(liveResult);
      setMessage(`${err.message}. Showing local calculation.`);
    }
  }

  async function saveProfile() {
    try {
      const data = await postJson('/calculate/profiles', form);
      setResult(data.calculation);
      setMessage('Profile saved.');
    } catch (err) {
      setMessage(err.message);
    }
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
            value={form.grossSalary}
            onChange={updateField}
          />

          <label htmlFor="bankNet">Bank net</label>
          <input
            id="bankNet"
            name="bankNet"
            type="number"
            min="1"
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
            value={form.years}
            onChange={updateField}
          />

          <button type="submit">Calculate</button>
          <div className="actions">
            <button type="button" className="secondary" onClick={saveProfile}>Save</button>
          </div>
          <div className={message === 'Profile saved.' ? 'notice success' : 'notice'} role="status">{message}</div>
        </form>

        <section>
          <div className="summary-strip" aria-label="Financial summary">
            <div>
              <span>Monthly bank net</span>
              <strong>{formatCurrency(form.bankNet)}</strong>
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
            {bucketLabels.map(([key, label, note, tone]) => (
              <article className={`bucket ${tone}`} key={key}>
                <div className="bucket-top">
                  <strong>{label}</strong>
                  <small>{note}</small>
                </div>
                <span data-testid={key}>{formatCurrency(displayResult[key])}</span>
              </article>
            ))}
          </div>
          <div className="chart-panel">
            <div className="section-title">
              <span>02</span>
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
